export const createMockNotification = () => ({
  sendToUser: jest.fn(),
  sendToParents: jest.fn(),
  sendToFamily: jest.fn(),
});

export type MockNotification = ReturnType<typeof createMockNotification>;
