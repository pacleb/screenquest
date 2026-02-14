const createModelMock = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
  upsert: jest.fn(),
});

export const createMockPrisma = () => ({
  family: createModelMock(),
  user: createModelMock(),
  familyInvite: createModelMock(),
  refreshToken: createModelMock(),
  questLibrary: createModelMock(),
  quest: createModelMock(),
  questAssignment: createModelMock(),
  questCompletion: createModelMock(),
  timeBank: createModelMock(),
  playSession: createModelMock(),
  violation: createModelMock(),
  violationCounter: createModelMock(),
  pushToken: createModelMock(),
  avatarPackPurchase: createModelMock(),
  questCategory: createModelMock(),
  childProgress: createModelMock(),
  achievement: createModelMock(),
  childAchievement: createModelMock(),
  avatarItem: createModelMock(),
  childEquippedItem: createModelMock(),
  notificationPreference: createModelMock(),
  parentalConsent: createModelMock(),
  accountDeletionRequest: createModelMock(),
  deletionAuditLog: createModelMock(),
  policyAcceptance: createModelMock(),
  theme: createModelMock(),
  $queryRaw: jest.fn(),
  $executeRawUnsafe: jest.fn(),
  $transaction: jest.fn((fn: any) => {
    if (typeof fn === 'function') {
      // Pass self-like mock — tests can override $transaction behavior as needed
      return fn({} as any);
    }
    return Promise.all(fn);
  }),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MockPrisma = { [K in keyof ReturnType<typeof createMockPrisma>]: any };
