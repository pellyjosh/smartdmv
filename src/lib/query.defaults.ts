// src/lib/query.defaults.ts
import type { DefaultOptions } from '@tanstack/react-query';

export const queryClientDefaultOptions: DefaultOptions = {
  queries: {
    // Cache for 5 minutes by default
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)

    // Avoid running duplicate queries
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',

    // Reasonable retry logic
    retry: 1,
    retryDelay: 1000,
  },

  mutations: {
    // Don't retry mutations by default
    retry: false,
  },
};

// Specific query keys that get special treatment
export const queryKeys = {
  dashboard: {
    stats: () => ['dashboard', 'stats'],
    notifications: () => ['dashboard', 'notifications'],
    appointments: () => ['dashboard', 'appointments'],
  },
  tenant: {
    connection: (tenantId: string) => ['tenant', 'connection', tenantId],
  },
  user: {
    profile: (userId: string) => ['user', 'profile', userId],
    roles: (userId: string) => ['user', 'roles', userId],
  }
} as const;
