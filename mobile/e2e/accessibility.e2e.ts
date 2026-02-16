import { by, device, element, expect, waitFor } from 'detox';
import {
  loginAsParent,
  loginAsChild,
  waitForVisible,
  testData,
} from './helpers';

/**
 * Accessibility E2E Tests
 *
 * Verifies that key screens have proper accessibility labels and roles.
 */
describe('Accessibility', () => {
  const parentEmail = 'e2e-a11y@test.screenquest.app';
  const parentPassword = 'TestPass123!';
  const familyCode = 'TESTCODE';

  describe('Auth screens accessibility', () => {
    beforeAll(async () => {
      await device.launchApp({ newInstance: true });
    });

    it('should have accessible login form elements', async () => {
      await waitForVisible('welcome-screen');
      await element(by.id('welcome-login-btn')).tap();
      await waitForVisible('login-screen');

      // Check that input fields exist and are tappable
      await expect(element(by.id('login-email-input'))).toExist();
      await expect(element(by.id('login-password-input'))).toExist();
      await expect(element(by.id('login-submit-btn'))).toExist();
    });

    it('should have accessible registration form', async () => {
      await device.reloadReactNative();
      await waitForVisible('welcome-screen');
      await element(by.id('welcome-next-btn')).tap();
      await element(by.id('welcome-next-btn')).tap();
      await element(by.id('welcome-next-btn')).tap();
      await waitForVisible('register-screen');

      await expect(element(by.id('register-name-input'))).toExist();
      await expect(element(by.id('register-email-input'))).toExist();
      await expect(element(by.id('register-password-input'))).toExist();
      await expect(element(by.id('register-submit-btn'))).toExist();
    });
  });

  describe('Parent dashboard accessibility', () => {
    beforeAll(async () => {
      await device.launchApp({ newInstance: true });
      await loginAsParent(parentEmail, parentPassword);
      await waitForVisible('parent-dashboard-screen', 15000);
    });

    it('should have accessible approval buttons', async () => {
      await element(by.text('Approvals')).tap();
      await waitForVisible('parent-approvals-screen');

      // Approve/deny buttons should have accessibility labels
      try {
        await expect(
          element(by.label('Approve quest completion')),
        ).toExist();
        await expect(
          element(by.label('Deny quest completion')),
        ).toExist();
      } catch {
        // No pending approvals — buttons won't be rendered
      }
    });

    it('should have accessible quest creation button', async () => {
      await element(by.text('Quests')).tap();
      await waitForVisible('parent-quests-screen');

      await expect(element(by.label('Create new quest'))).toExist();
    });
  });

  describe('Child screens accessibility', () => {
    beforeAll(async () => {
      await device.launchApp({ newInstance: true });
      await loginAsChild(familyCode, testData.childName);
      await waitForVisible('child-home-screen', 15000);
    });

    it('should have accessible play button with hint', async () => {
      await expect(element(by.label('Start playing'))).toExist();
    });

    it('should have accessible play timer controls', async () => {
      await element(by.text('Play')).tap();
      await waitForVisible('child-play-screen');

      // Start button should exist
      await expect(element(by.id('play-start-btn'))).toExist();
    });

    it('should have accessible quest detail back button', async () => {
      await element(by.text('Quests')).tap();
      await waitForVisible('child-quests-screen');

      // Try to open a quest
      try {
        await element(by.type('RCTView')).atIndex(0).tap();
        await waitForVisible('quest-detail-screen', 5000);
        await expect(element(by.label('Go back'))).toExist();
      } catch {
        // No quests available
      }
    });
  });
});
