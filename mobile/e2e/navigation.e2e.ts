import { by, device, element, expect, waitFor } from 'detox';
import {
  loginAsParent,
  loginAsChild,
  waitForVisible,
  testData,
} from './helpers';

/**
 * Navigation E2E Tests
 *
 * Verifies all tab transitions and modal navigation work correctly.
 */
describe('Navigation', () => {
  const parentEmail = 'e2e-nav@test.screenquest.app';
  const parentPassword = 'TestPass123!';
  const familyCode = 'TESTCODE';

  describe('Parent tab navigation', () => {
    beforeAll(async () => {
      await device.launchApp({ newInstance: true });
      await loginAsParent(parentEmail, parentPassword);
      await waitForVisible('parent-dashboard-screen', 15000);
    });

    it('should navigate to Dashboard tab', async () => {
      await element(by.text('Dashboard')).tap();
      await waitForVisible('parent-dashboard-screen');
    });

    it('should navigate to Approvals tab', async () => {
      await element(by.text('Approvals')).tap();
      await waitForVisible('parent-approvals-screen');
    });

    it('should navigate to Quests tab', async () => {
      await element(by.text('Quests')).tap();
      await waitForVisible('parent-quests-screen');
    });

    it('should navigate to Rules tab', async () => {
      await element(by.text('Rules')).tap();
      await waitForVisible('parent-consequences-screen');
    });

    it('should navigate to Family tab', async () => {
      await element(by.text('Family')).tap();
      // Family screen should be visible
      await waitFor(element(by.text('Family Members')).or(element(by.text('Family'))))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should navigate to Settings tab', async () => {
      await element(by.text('Settings')).tap();
      await waitForVisible('parent-settings-screen');
    });

    it('should open quest creation modal from Quests tab', async () => {
      await element(by.text('Quests')).tap();
      await waitForVisible('parent-quests-screen');
      await element(by.id('quests-create-btn')).tap();

      // Quest edit modal should appear
      await waitFor(element(by.text('New Quest')).or(element(by.text('Quest'))))
        .toBeVisible()
        .withTimeout(5000);

      // Go back
      await device.pressBack();
    });
  });

  describe('Child tab navigation', () => {
    beforeAll(async () => {
      await device.launchApp({ newInstance: true });
      await loginAsChild(familyCode, testData.childName);
      await waitForVisible('child-home-screen', 15000);
    });

    it('should navigate to Home tab', async () => {
      await element(by.text('Home')).tap();
      await waitForVisible('child-home-screen');
    });

    it('should navigate to Quests tab', async () => {
      await element(by.text('Quests')).tap();
      await waitForVisible('child-quests-screen');
    });

    it('should navigate to Play tab', async () => {
      await element(by.text('Play')).tap();
      await waitForVisible('child-play-screen');
    });

    it('should navigate to Trophies tab', async () => {
      await element(by.text('Trophies')).tap();
      // Trophies screen should be visible
      await waitFor(element(by.text('Trophies')).or(element(by.text('Achievements'))))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should navigate to Profile tab', async () => {
      await element(by.text('Profile')).tap();
      // Profile screen should be visible
      await waitFor(element(by.text('Profile')).or(element(by.text(testData.childName))))
        .toBeVisible()
        .withTimeout(5000);
    });
  });
});
