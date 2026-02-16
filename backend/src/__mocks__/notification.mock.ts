export const createMockNotification = () => ({
  sendToUser: jest.fn().mockResolvedValue(undefined),
  sendToParents: jest.fn().mockResolvedValue(undefined),
  sendToFamily: jest.fn().mockResolvedValue(undefined),
});

export type MockNotification = ReturnType<typeof createMockNotification>;
