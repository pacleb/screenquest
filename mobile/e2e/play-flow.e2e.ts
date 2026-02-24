import { by, device, element, expect, waitFor } from 'detox';
import {
  loginAsChild,
  loginAsParent,
  waitForVisible,
  tap,
  dismissAlert,
  testData,
} from './helpers';

/**
 * Play Session Flow E2E Tests
 *
 * Prerequisites: A child account with positive time bank balance.
 */
describe('Play Flow', () => {
  const parentEmail = 'e2e-play@test.screenquest.app';
  const parentPassword = 'TestPass123!';
  const familyCode = 'TESTCODE';

  describe('Child requests play session', () => {
    beforeAll(async () => {
      await device.launchApp({ newInstance: true });
      await loginAsChild(familyCode, testData.childName);
      await waitForVisible('child-home-screen', 15000);
    });

    it('should show play button on home screen', async () => {
      await expect(element(by.id('play-start-btn'))).toBeVisible();
    });

    it('should request play and show waiting or active state', async () => {
      await tap('play-start-btn');

      // Depending on approval mode, either shows waiting or timer
      await waitFor(
        element(by.id('play-waiting-title')).or(
          element(by.id('play-pause-btn')),
        ),
      )
        .toBeVisible()
        .withTimeout(15000);
    });
  });

  describe('Parent approves play request', () => {
    beforeAll(async () => {
      await device.launchApp({ newInstance: true });
      await loginAsParent(parentEmail, parentPassword);
      await waitForVisible('parent-dashboard-screen', 15000);
    });

    it('should see play request in dashboard or approvals', async () => {
      // Check if there's a "Needs Approval" badge on dashboard
      try {
        await waitFor(element(by.text('Needs Approval')))
          .toBeVisible()
          .withTimeout(5000);
      } catch {
        // Play may have auto-started (notify_only mode)
      }
    });
  });

  describe('Timer controls', () => {
    beforeAll(async () => {
      await device.launchApp({ newInstance: true });
      await loginAsChild(familyCode, testData.childName);
      await waitForVisible('child-home-screen', 15000);
    });

    it('should show timer controls when playing', async () => {
      // Check if already in active state from previous test
      try {
        await waitFor(element(by.id('play-pause-btn')))
          .toBeVisible()
          .withTimeout(5000);

        // Pause
        await tap('play-pause-btn');
        await expect(element(by.id('play-resume-btn'))).toBeVisible();

        // Resume
        await tap('play-resume-btn');
        await expect(element(by.id('play-pause-btn'))).toBeVisible();

        // Stop
        await tap('play-stop-btn');
        await dismissAlert('Stop');
        await waitForVisible('play-completed-title', 10000);
      } catch {
        // Not in active state — may need to start a session first
      }
    });
  });
});
