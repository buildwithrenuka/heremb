import { GraphQLClient, gql } from 'graphql-request';
import type {
  DeployOptions,
  DeployResult,
  DestroyResult,
  EnvVarResult,
  ProviderLock,
  StatusResult,
} from '@heramb/core';

const RAILWAY_API = 'https://backboard.railway.app/graphql/v2';

export interface RailwayLockOptions {
  token: string;
}

export class RailwayLock implements ProviderLock {
  readonly name = 'railway';
  private client: GraphQLClient;

  constructor(options: RailwayLockOptions) {
    this.client = new GraphQLClient(RAILWAY_API, {
      headers: {
        Authorization: `Bearer ${options.token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async deploy(options: DeployOptions): Promise<DeployResult> {
    let { serviceId, projectId } = options;
    const { envVars } = options;

    if (!serviceId && options.name) {
      const project = await this.findOrCreateProject(options.name);
      projectId = project.id;
      const service = await this.findOrCreateService(projectId, options.name);
      serviceId = service.id;
    }

    if (!serviceId && projectId) {
      const service = await this.findOrCreateService(projectId, options.name ?? 'backend');
      serviceId = service.id;
    }

    if (envVars && serviceId) {
      await this.setEnvVars(serviceId, envVars);
    }

    if (serviceId) {
      await this.triggerDeploy(serviceId);
      const url = await this.waitForDeploy(serviceId);
      return { url, serviceId };
    }

    throw new Error('Railway deploy requires serviceId, projectId, or name for auto-provision');
  }

  /** Find an existing Railway project by name or create one. */
  async findOrCreateProject(name: string): Promise<{ id: string; name: string }> {
    const existing = await this.listProjects();
    const match = existing.find((p) => p.name === name);
    if (match) return match;

    const mutation = gql`
      mutation projectCreate($input: ProjectCreateInput!) {
        projectCreate(input: $input) {
          id
          name
        }
      }
    `;

    const data = await this.client.request<{
      projectCreate: { id: string; name: string };
    }>(mutation, { input: { name } });

    return data.projectCreate;
  }

  /** Find an existing service in a project or create an empty one. */
  async findOrCreateService(
    projectId: string,
    name: string
  ): Promise<{ id: string; name: string }> {
    const existing = await this.listServices(projectId);
    const match = existing.find((s) => s.name === name);
    if (match) return match;

    const mutation = gql`
      mutation serviceCreate($input: ServiceCreateInput!) {
        serviceCreate(input: $input) {
          id
          name
        }
      }
    `;

    const data = await this.client.request<{
      serviceCreate: { id: string; name: string };
    }>(mutation, { input: { projectId, name } });

    return data.serviceCreate;
  }

  private async listProjects(): Promise<Array<{ id: string; name: string }>> {
    const query = gql`
      query projects {
        projects {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    `;

    try {
      const data = await this.client.request<{
        projects: { edges: Array<{ node: { id: string; name: string } }> };
      }>(query);
      return data.projects.edges.map((e) => e.node);
    } catch {
      return [];
    }
  }

  private async listServices(projectId: string): Promise<Array<{ id: string; name: string }>> {
    const query = gql`
      query project($id: String!) {
        project(id: $id) {
          services {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      }
    `;

    try {
      const data = await this.client.request<{
        project: { services: { edges: Array<{ node: { id: string; name: string } }> } };
      }>(query, { id: projectId });
      return data.project?.services?.edges.map((e) => e.node) ?? [];
    } catch {
      return [];
    }
  }

  async getStatus(serviceId: string): Promise<StatusResult> {
    const query = gql`
      query service($id: String!) {
        service(id: $id) {
          id
          name
          serviceInstances {
            edges {
              node {
                latestDeployment {
                  status
                  staticUrl
                }
              }
            }
          }
        }
      }
    `;

    try {
      const data = await this.client.request<{
        service: {
          serviceInstances: {
            edges: Array<{
              node: {
                latestDeployment: { status: string; staticUrl: string | null };
              };
            }>;
          };
        };
      }>(query, { id: serviceId });

      const deployment = data.service?.serviceInstances?.edges[0]?.node?.latestDeployment;
      const status = mapRailwayStatus(deployment?.status);
      const url = deployment?.staticUrl ? `https://${deployment.staticUrl}` : undefined;

      return { status, url };
    } catch {
      return { status: 'unknown' };
    }
  }

  async setEnvVars(serviceId: string, vars: Record<string, string>): Promise<EnvVarResult> {
    try {
      const query = gql`
        mutation variableCollectionUpsert($input: VariableCollectionUpsertInput!) {
          variableCollectionUpsert(input: $input)
        }
      `;

      await this.client.request(query, {
        input: {
          projectId: await this.getProjectIdForService(serviceId),
          serviceId,
          variables: vars,
          replace: false,
        },
      });

      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async *getLogs(serviceId: string): AsyncIterable<string> {
    const status = await this.getStatus(serviceId);
    yield `[railway] Service ${serviceId} — status: ${status.status}${status.url ? ` (${status.url})` : ''}`;
    yield `[railway] Use Railway dashboard or CLI for full log streaming`;
  }

  async destroy(serviceId: string): Promise<DestroyResult> {
    try {
      const mutation = gql`
        mutation serviceDelete($id: String!) {
          serviceDelete(id: $id)
        }
      `;
      await this.client.request(mutation, { id: serviceId });
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async triggerDeploy(serviceId: string): Promise<void> {
    const environmentId = await this.getEnvironmentIdForService(serviceId);
    const mutation = gql`
      mutation serviceInstanceDeploy($serviceId: String!, $environmentId: String!) {
        serviceInstanceDeploy(serviceId: $serviceId, environmentId: $environmentId)
      }
    `;
    await this.client.request(mutation, { serviceId, environmentId });
  }

  private async getEnvironmentIdForService(serviceId: string): Promise<string> {
    const query = gql`
      query service($id: String!) {
        service(id: $id) {
          projectId
          serviceInstances {
            edges {
              node {
                environmentId
              }
            }
          }
        }
      }
    `;

    const data = await this.client.request<{
      service: {
        projectId: string;
        serviceInstances: { edges: Array<{ node: { environmentId: string } }> };
      };
    }>(query, { id: serviceId });

    const fromInstance = data.service.serviceInstances?.edges[0]?.node?.environmentId;
    if (fromInstance) return fromInstance;

    return this.getDefaultEnvironmentId(data.service.projectId);
  }

  private async getDefaultEnvironmentId(projectId: string): Promise<string> {
    const query = gql`
      query project($id: String!) {
        project(id: $id) {
          environments {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      }
    `;

    const data = await this.client.request<{
      project: { environments: { edges: Array<{ node: { id: string; name: string } }> } };
    }>(query, { id: projectId });

    const envs = data.project?.environments?.edges.map((e) => e.node) ?? [];
    const production = envs.find((e) => e.name.toLowerCase() === 'production') ?? envs[0];
    if (!production) {
      throw new Error(`No Railway environment found for project ${projectId}`);
    }
    return production.id;
  }

  private async waitForDeploy(serviceId: string, maxAttempts = 24): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getStatus(serviceId);
      if (status.status === 'live' && status.url) {
        return status.url;
      }
      if (status.status === 'failed') {
        throw new Error(
          `Railway deployment failed for service ${serviceId}. Check build logs in the Railway dashboard.`
        );
      }
      if (i >= 5 && status.status === 'pending' && !status.url) {
        throw new Error(
          'Railway service has no deployment yet. In Railway dashboard: connect this service to your GitHub repo, ' +
            'set root directory (e.g. packages/api), build & start commands, then run heramb deploy again. ' +
            `Service ID: ${serviceId}`
        );
      }
      await sleep(5000);
    }
    throw new Error(
      'Railway deployment timed out. Open the Railway dashboard — the service may need a GitHub repo linked or env vars set.'
    );
  }

  private async getProjectIdForService(serviceId: string): Promise<string> {
    const query = gql`
      query service($id: String!) {
        service(id: $id) {
          projectId
        }
      }
    `;
    const data = await this.client.request<{ service: { projectId: string } }>(query, {
      id: serviceId,
    });
    return data.service.projectId;
  }
}

function mapRailwayStatus(status?: string): StatusResult['status'] {
  switch (status?.toUpperCase()) {
    case 'SUCCESS':
    case 'ACTIVE':
      return 'live';
    case 'BUILDING':
    case 'DEPLOYING':
      return 'deploying';
    case 'FAILED':
    case 'CRASHED':
      return 'failed';
    case 'INITIALIZING':
      return 'building';
    default:
      return 'pending';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createRailwayLock(token: string): RailwayLock {
  return new RailwayLock({ token });
}
