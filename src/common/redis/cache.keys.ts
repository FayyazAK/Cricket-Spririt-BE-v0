export const CacheKeys = {
  USERS: {
    ALL: 'users:all',
    BY_ID: (id: string) => `users:${id}`,
  },
} as const;
