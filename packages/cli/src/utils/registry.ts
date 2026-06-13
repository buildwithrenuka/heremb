import type { CacheLock, HerambConfig, ProviderLock, ProviderRegistry } from '@heramb/core';
import { createRailwayLock } from '@heramb/provider-railway';
import { createUpstashLock } from '@heramb/provider-upstash';
import { createVercelLock } from '@heramb/provider-vercel';
import { getProviderToken, getProviderCredential } from './credentials.js';

export function createRegistry(config: HerambConfig): ProviderRegistry {
  const locks = new Map<string, ProviderLock>();
  const cacheLocks = new Map<string, CacheLock>();

  for (const svc of Object.values(config.services)) {
    if (!('provider' in svc)) continue;
    const { provider } = svc;

    if (locks.has(provider) || cacheLocks.has(provider)) continue;

    switch (provider) {
      case 'railway': {
        const token = getProviderToken('railway');
        if (token) locks.set(provider, createRailwayLock(token));
        break;
      }
      case 'vercel': {
        const token = getProviderToken('vercel');
        const teamId = getProviderCredential('vercel', 'teamId');
        if (token) locks.set(provider, createVercelLock(token, teamId));
        break;
      }
      case 'upstash': {
        const email = getProviderCredential('upstash', 'email');
        const apiKey = getProviderCredential('upstash', 'apiKey') ?? getProviderToken('upstash');
        if (email && apiKey) cacheLocks.set(provider, createUpstashLock(email, apiKey));
        break;
      }
    }
  }

  return {
    getLock: (provider: string) => locks.get(provider),
    getCacheLock: (provider: string) => cacheLocks.get(provider),
  };
}
