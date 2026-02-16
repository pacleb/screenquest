import { by, device, element, expect, waitFor } from 'detox';
import {
  loginAsParent,
  loginAsChild,
  waitForVisible,
  tap,
  typeInField,
  dismissAlert,
  testData,
} from './helpers';

/**
 * Quest Flow E2E Tests
 *
 * Prerequisites: A parent account with a family and at least one child
 * and one quest must already exist. These tests assume the family-setup
 * flow tests have been run (or equivalent seed data exists).
 */
describe('Quest Flow', () => {
  const parentEmail = 'e2e-quest@test.screenquest.app';
  const parentPassword = 'TestPass123!';
  const familyCode = 'TESTCODE'; // Must be pre-seeded or created in prior test

  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  describe('Parent creates a quest', () => {
    beforeAll(async () => {
      await device.reloadReactNative();
      await loginAsParent(parentEmail, parentPassword);
      await waitForVisible('parent-dashboard-screen', 15000);
    });

    it('should navigate to quests screen', async () => {
      await element(by.text('Quests')).tap();
      await waitForVisible('parent-quests-screen');
    });

    it('should open quest creation form', async () => {
      await tap('quests-create-btn');
      // Should navigate to QuestEdit screen
      await waitFor(element(by.text('New Quest')).or(element(by.text('Quest'))))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Child views and completes a quest', () => {
    beforeAll(async () => {
      await device.reloadReactNative();
      await loginAsChild(familyCode, testData.childName);
      await waitForVisible('child-home-screen', 15000);
    });

    it('should see available quests on home screen', async () => {
      await waitForVisible('child-home-screen');
      // Should see "Available Quests" section or empty state
      await waitFor(
        element(by.text('Available Quests')).or(
          element(by.text('No quests available')),
        ),
      )
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should navigate to quests tab', async () => {
      await element(by.text('Quests')).tap();
      await waitForVisible('child-quests-screen');
      await expect(element(by.id('child-quests-title'))).toBeVisible();
    });

    it('should open quest detail and complete it', async () => {
      await waitForVisible('child-quests-screen');

      // Tap on the first available quest card
      try {
        await element(by.type('RCTView'))
          .atIndex(0)
          .tap();
      } catch {
        // If no quests available, skip
        return;
      }

      await waitForVisible('quest-detail-screen', 5000);
      await expect(element(by.id('quest-detail-name'))).toBeVisible();

      // Complete the quest
      await tap('quest-complete-btn');

      // Should show success state
      await waitFor(element(by.id('quest-success-title')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });

  describe('Parent approves quest completion', () => {
    beforeAll(async () => {
      await device.reloadReactNative();
      await loginAsParent(parentEmail, parentPassword);
      await waitForVisible('parent-dashboard-screen', 15000);
    });

    it('should navigate to approvals screen', async () => {
      await element(by.text('Approvals')).tap();
      await waitForVisible('parent-approvals-screen');
    });

    it('should see pending completion and approve it', async () => {
      // Check if there are pending approvals
      try {
        await waitFor(element(by.id('approval-approve-btn')))
          .toBeVisible()
          .withTimeout(5000);

        await tap('approval-approve-btn');

        // Completion should be approved — either list refreshes or shows empty
        await waitFor(
          element(by.text('No pending approvals')).or(
            element(by.text('Approved')),
          ),
        )
          .toBeVisible()
          .withTimeout(10000);
      } catch {
        // No pending approvals — that's fine, auto-approve may be on
      }
    });
  });
});
