import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlaySessionService } from './play-session.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimeBankService } from '../time-bank/time-bank.service';
import { NotificationService } from '../notification/notification.service';
import { createMockPrisma, MockPrisma } from '../__mocks__/prisma.mock';
import { createMockNotification, MockNotification } from '../__mocks__/notification.mock';

describe('PlaySessionService', () => {
  let service: PlaySessionService;
  let prisma: MockPrisma;
  let timeBankService: {
    getBalance: jest.Mock;
    deductTime: jest.Mock;
    creditTime: jest.Mock;
  };
  let notificationService: MockNotification;

  beforeEach(async () => {
    prisma = createMockPrisma();
    timeBankService = {
      getBalance: jest.fn(),
      deductTime: jest.fn(),
      creditTime: jest.fn(),
    };
    notificationService = createMockNotification();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaySessionService,
        { provide: PrismaService, useValue: prisma },
        { provide: TimeBankService, useValue: timeBankService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<PlaySessionService>(PlaySessionService);
  });

  describe('requestPlay', () => {
    const setupChild = (playSettings: any = null) => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'child-1',
        role: 'child',
        familyId: 'fam-1',
        name: 'Kid',
        playSettings,
      });
    };

    it('auto-starts session when notify_only mode', async () => {
      setupChild({ playApprovalMode: 'notify_only' });
      prisma.playSession.findFirst.mockResolvedValue(null);
      timeBankService.getBalance.mockResolvedValue({ totalMinutes: 60 });
      prisma.playSession.findMany.mockResolvedValue([]); // daily usage
      prisma.playSession.create.mockResolvedValue({
        id: 'sess-1',
        childId: 'child-1',
        status: 'active',
        requestedMinutes: 30,
        startedAt: new Date(),
        totalPausedSeconds: 0,
        pausedAt: null,
      });

      // Mock validatePlayHours — we need to set the time within allowed hours
      jest.spyOn(service as any, 'validatePlayHours').mockImplementation(() => {});

      const result = await service.requestPlay('child-1', { requestedMinutes: 30 });

      expect(result.status).toBe('active');
      expect(timeBankService.deductTime).toHaveBeenCalledWith('child-1', 30);
    });

    it('creates requested session when require_approval mode', async () => {
      setupChild({ playApprovalMode: 'require_approval' });
      prisma.playSession.findFirst.mockResolvedValue(null);
      timeBankService.getBalance.mockResolvedValue({ totalMinutes: 60 });
      prisma.playSession.findMany.mockResolvedValue([]);
      prisma.playSession.create.mockResolvedValue({
        id: 'sess-1',
        childId: 'child-1',
        status: 'requested',
        requestedMinutes: 30,
        startedAt: null,
        totalPausedSeconds: 0,
        pausedAt: null,
      });

      jest.spyOn(service as any, 'validatePlayHours').mockImplementation(() => {});

      const result = await service.requestPlay('child-1', { requestedMinutes: 30 });

      expect(result.status).toBe('requested');
      expect(timeBankService.deductTime).not.toHaveBeenCalled();
    });

    it('rejects when balance is negative', async () => {
      setupChild();
      prisma.playSession.findFirst.mockResolvedValue(null);
      timeBankService.getBalance.mockResolvedValue({ totalMinutes: -30 });

      await expect(
        service.requestPlay('child-1', { requestedMinutes: 15 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when balance is insufficient', async () => {
      setupChild();
      prisma.playSession.findFirst.mockResolvedValue(null);
      timeBankService.getBalance.mockResolvedValue({ totalMinutes: 10 });

      await expect(
        service.requestPlay('child-1', { requestedMinutes: 30 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects concurrent sessions', async () => {
      setupChild();
      prisma.playSession.findFirst.mockResolvedValue({
        id: 'existing',
        status: 'active',
      });

      await expect(
        service.requestPlay('child-1', { requestedMinutes: 30 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-child users', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'parent-1',
        role: 'parent',
        familyId: 'fam-1',
      });

      await expect(
        service.requestPlay('parent-1', { requestedMinutes: 30 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('stopSession', () => {
    it('refunds remaining time on early stop', async () => {
      const startedAt = new Date(Date.now() - 10 * 60 * 1000); // 10 min ago
      prisma.playSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        childId: 'child-1',
        status: 'active',
        requestedMinutes: 30,
        startedAt,
        totalPausedSeconds: 0,
        pausedAt: null,
      });
      prisma.playSession.update.mockResolvedValue({
        id: 'sess-1',
        status: 'stopped',
        startedAt,
        endedAt: new Date(),
        requestedMinutes: 30,
        totalPausedSeconds: 0,
        pausedAt: null,
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'child-1',
        name: 'Kid',
        familyId: 'fam-1',
      });

      await service.stopSession('sess-1', 'child-1');

      // Should refund roughly 20 min (30 requested - 10 elapsed)
      expect(timeBankService.creditTime).toHaveBeenCalledWith(
        'child-1',
        expect.any(Number),
        'stackable',
        null,
      );
      const refundedMinutes = timeBankService.creditTime.mock.calls[0][1];
      expect(refundedMinutes).toBeGreaterThanOrEqual(19);
      expect(refundedMinutes).toBeLessThanOrEqual(20);
    });

    it('throws if session is not active or paused', async () => {
      prisma.playSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        childId: 'child-1',
        status: 'completed',
      });

      await expect(
        service.stopSession('sess-1', 'child-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for missing session', async () => {
      prisma.playSession.findUnique.mockResolvedValue(null);

      await expect(
        service.stopSession('sess-999', 'child-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for wrong child', async () => {
      prisma.playSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        childId: 'child-1',
        status: 'active',
      });

      await expect(
        service.stopSession('sess-1', 'child-2'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('pauseSession', () => {
    it('pauses an active session', async () => {
      prisma.playSession.findUnique.mockResolvedValueOnce({
        id: 'sess-1',
        childId: 'child-1',
        status: 'active',
        requestedMinutes: 30,
        startedAt: new Date(),
        totalPausedSeconds: 0,
        pausedAt: null,
      });
      prisma.playSession.update.mockResolvedValue({
        id: 'sess-1',
        status: 'paused',
        pausedAt: new Date(),
        requestedMinutes: 30,
        startedAt: new Date(),
        totalPausedSeconds: 0,
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'child-1',
        name: 'Kid',
        familyId: 'fam-1',
      });

      const result = await service.pauseSession('sess-1', 'child-1');

      expect(result.status).toBe('paused');
    });
  });

  describe('approveSession', () => {
    it('approves and deducts time', async () => {
      prisma.playSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        childId: 'child-1',
        status: 'requested',
        requestedMinutes: 30,
      });
      // getSessionWithParentAccess checks child + user
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'child-1', familyId: 'fam-1', role: 'child' })
        .mockResolvedValueOnce({ id: 'parent-1', familyId: 'fam-1', role: 'parent' });
      prisma.playSession.update.mockResolvedValue({
        id: 'sess-1',
        status: 'active',
        requestedMinutes: 30,
        startedAt: new Date(),
        totalPausedSeconds: 0,
        pausedAt: null,
      });

      const result = await service.approveSession('sess-1', 'parent-1');

      expect(result.status).toBe('active');
      expect(timeBankService.deductTime).toHaveBeenCalledWith('child-1', 30);
    });
  });

  describe('getPlaySettings', () => {
    it('returns defaults when no settings stored', () => {
      const settings = service.getPlaySettings(null);

      expect(settings.playApprovalMode).toBe('notify_only');
      expect(settings.dailyScreenTimeCap).toBe(120);
    });

    it('merges stored settings with defaults', () => {
      const settings = service.getPlaySettings({
        dailyScreenTimeCap: 60,
      });

      expect(settings.dailyScreenTimeCap).toBe(60);
      expect(settings.playApprovalMode).toBe('notify_only'); // default
    });
  });
});
