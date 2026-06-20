import type { HerambConfig } from '@heramb1/core';

export type DeployEnv = 'production' | 'preview';

export function slugifyBranch(branch: string): string {
  return branch
    .replace(/^refs\/heads\//, '')
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40);
}

export function resolveBranch(explicit?: string): string | undefined {
  if (explicit) return explicit;
  return (
    process.env.GITHUB_HEAD_REF ??
    process.env.GITHUB_REF_NAME ??
    process.env.CI_BRANCH ??
    undefined
  );
}

/** Scope config to a preview branch — isolated Redis and service names */
export function applyPreviewContext(config: HerambConfig, branch: string): HerambConfig {
  const slug = slugifyBranch(branch);
  const scoped: HerambConfig = structuredClone(config);
  scoped.project = `${config.project}-${slug}`;

  for (const svc of Object.values(scoped.services)) {
    if ('provider' in svc) {
      svc.serviceId = undefined;
      svc.projectId = svc.projectId ? `${svc.projectId}-${slug}` : undefined;
    }
  }

  return scoped;
}
