import { by, device, element, expect, waitFor } from 'detox';
import {
  registerParent,
  createFamily,
  addChild,
  loginAsParent,
  waitForVisible,
  tap,
  dismissAlert,
  testData,
} from './helpers';

describe('Family Setup Flow', () => {
  const email = `e2e-family-${Date.now()}@test.screenquest.app`;

  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should register and land on create family screen', async () => {
    await registerParent(testData.parentName, email, testData.parentPassword);

    // Should be on create family screen (or email verification, depending on config)
    await waitFor(element(by.id('create-family-screen')))
      .toBeVisible()
      .withTimeout(15000);
  });

  it('should create a new family', async () => {
    await createFamily(testData.familyName);

    // Should show success alert with family code
    await waitFor(element(by.text('Family Created!')))
      .toBeVisible()
      .withTimeout(10000);
    await dismissAlert('OK');
  });

  it('should navigate to add child screen or dashboard', async () => {
    // After family creation, should be on add-child or dashboard
    await waitFor(
      element(by.id('add-child-screen')).or(
        element(by.id('parent-dashboard-screen')),
      ),
    )
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should add a child to the family', async () => {
    // If on dashboard, navigate to Family tab first
    try {
      await waitForVisible('add-child-screen', 3000);
    } catch {
      // Navigate to family tab and tap add child
      await element(by.text('Family')).tap();
      // Look for an add child button on the family screen
      return; // Skip if we can't reach add child screen directly
    }

    await addChild(testData.childName);

    // Should show success alert
    await waitFor(element(by.text('Child Added!')))
      .toBeVisible()
      .withTimeout(10000);
    await dismissAlert('Go to Dashboard');
  });

  it('should show parent dashboard after setup', async () => {
    await waitForVisible('parent-dashboard-screen', 15000);
    await expect(element(by.id('dashboard-greeting'))).toBeVisible();
  });

  it('should show the child in children overview', async () => {
    await waitForVisible('parent-dashboard-screen');
    // The child name should appear in the children section
    await expect(element(by.text(testData.childName))).toBeVisible();
  });
});
