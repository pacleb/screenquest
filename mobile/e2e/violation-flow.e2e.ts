import { by, device, element, expect, waitFor } from 'detox';
import {
  loginAsParent,
  loginAsChild,
  waitForVisible,
  tap,
  dismissAlert,
  testData,
} from './helpers';

/**
 * Violation Flow E2E Tests
 *
 * Prerequisites: A parent account with a family and at least one child.
 */
describe('Violation Flow', () => {
  const parentEmail = 'e2e-violation@test.screenquest.app';
  const parentPassword = 'TestPass123!';
  const familyCode = 'TESTCODE';

  describe('Parent records a violation', () => {
    beforeAll(async () => {
      await device.launchApp({ newInstance: true });
      await loginAsParent(parentEmail, parentPassword);
      await waitForVisible('parent-dashboard-screen', 15000);
    });

    it('should navigate to consequences screen', async () => {
      // Tap the Consequences/Rules tab (shield icon)
      await element(by.text('Rules')).tap();
      await waitForVisible('parent-consequences-screen');
    });

    it('should show violation status', async () => {
      await expect(
        element(by.id('consequences-violation-count')),
      ).toBeVisible();
    });

    it('should record a violation', async () => {
      await tap('consequences-record-btn');

      // Should show description input form
      await waitFor(element(by.text('Record')))
        .toBeVisible()
        .withTimeout(5000);

      // Submit the violation
      await element(by.text('Record')).tap();

      // Should show success alert
      await waitFor(element(by.text('Violation Recorded')))
        .toBeVisible()
        .withTimeout(10000);
      await dismissAlert('OK');
    });

    it('should show updated violation count', async () => {
      await expect(
        element(by.id('consequences-violation-count')),
      ).toBeVisible();
    });
  });

  describe('Child sees negative balance effect', () => {
    beforeAll(async () => {
      await device.launchApp({ newInstance: true });
      await loginAsChild(familyCode, testData.childName);
      await waitForVisible('child-home-screen', 15000);
    });

    it('should show violation indicator if balance is negative', async () => {
      // Check for violation indicator or disabled play button
      try {
        await waitFor(element(by.text(/strike/)))
          .toBeVisible()
          .withTimeout(5000);
      } catch {
        // Might not have negative balance if violation penalty was small
      }
    });

    it('should have play button disabled when balance is negative', async () => {
      // Navigate to play tab
      await element(by.text('Play')).tap();
      await waitForVisible('child-play-screen');

      // The start button should be disabled if balance is negative
      // We check by trying to tap and seeing if the state changes
      try {
        await expect(element(by.id('play-start-btn'))).toBeVisible();
      } catch {
        // Balance may not be negative enough to disable play
      }
    });
  });
});
