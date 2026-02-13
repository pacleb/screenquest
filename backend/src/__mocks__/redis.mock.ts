export const createMockRedis = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  ping: jest.fn().mockResolvedValue('PONG'),
  setex: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
});

export type MockRedis = ReturnType<typeof createMockRedis>;
