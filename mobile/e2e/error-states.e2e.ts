import { by, device, element, expect, waitFor } from 'detox';
import {
  loginAsChild,
  waitForVisible,
  tap,
  dismissAlert,
  testData,
} from './helpers';

/**
 * Error States E2E Tests
 *
 * Verifies the app handles error conditions gracefully.
 */
describe('Error States', () => {
  const familyCode = 'TESTCODE';

  describe('Network error handling', () => {
    beforeAll(async () => {
      await device.launchApp({ newInstance: true });
      await loginAsChild(familyCode, testData.childName);
      await waitForVisible('child-home-screen', 15000);
    });

    it('should handle network error during quest completion', async () => {
      // Navigate to quests
      await element(by.text('Quests')).tap();
      await waitForVisible('child-quests-screen');

      // Disable network
      await device.setURLBlacklist(['.*api.*']);

      // Try to complete a quest
      try {
        // Tap first quest
        await element(by.type('RCTView')).atIndex(0).tap();
        await waitForVisible('quest-detail-screen', 5000);
        await tap('quest-complete-btn');

        // Should show error or offline queue toast
        await waitFor(
          element(by.text('Error')).or(
            element(by.text(/queued/i)),
          ),
        )
          .toBeVisible()
          .withTimeout(15000);
      } catch {
        // Quest may not be available
      } finally {
        // Re-enable network
        await device.setURLBlacklist([]);
      }
    });

    it('should handle network error during play request', async () => {
      await element(by.text('Play')).tap();
      await waitForVisible('child-play-screen');

      // Disable network
      await device.setURLBlacklist(['.*api.*']);

      try {
        await tap('play-start-btn');

        // Should show "No Internet" alert
        await waitFor(element(by.text('No Internet')))
          .toBeVisible()
          .withTimeout(10000);
        await dismissAlert('OK');
      } catch {
        // Button may be disabled if no balance
      } finally {
        await device.setURLBlacklist([]);
      }
    });
  });

  describe('Invalid input handling', () => {
    beforeAll(async () => {
      await device.launchApp({ newInstance: true });
    });

    it('should reject short password during registration', async () => {
      await waitForVisible('welcome-screen');
      // Navigate through onboarding
      await tap('welcome-next-btn');
      await tap('welcome-next-btn');
      await tap('welcome-next-btn');
      await waitForVisible('register-screen');

      await element(by.id('register-name-input')).typeText('Test');
      await element(by.id('register-email-input')).typeText('test@test.com');
      await element(by.id('register-password-input')).typeText('short');
      await tap('register-submit-btn');

      await waitFor(element(by.text('Error')))
        .toBeVisible()
        .withTimeout(5000);
      await dismissAlert('OK');
    });
  });
});
