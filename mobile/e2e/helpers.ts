import { by, device, element, expect, waitFor } from 'detox';

// Test credentials — use a dedicated test account on the backend
const TEST_PARENT_EMAIL = `e2e-parent-${Date.now()}@test.screenquest.app`;
const TEST_PARENT_PASSWORD = 'TestPass123!';
const TEST_PARENT_NAME = 'E2E Parent';
const TEST_FAMILY_NAME = 'E2E Test Family';
const TEST_CHILD_NAME = 'E2E Kid';

export const testData = {
  parentEmail: TEST_PARENT_EMAIL,
  parentPassword: TEST_PARENT_PASSWORD,
  parentName: TEST_PARENT_NAME,
  familyName: TEST_FAMILY_NAME,
  childName: TEST_CHILD_NAME,
};

/**
 * Wait for an element to be visible with a custom timeout.
 */
export async function waitForVisible(testID: string, timeoutMs = 10000) {
  await waitFor(element(by.id(testID)))
    .toBeVisible()
    .withTimeout(timeoutMs);
}

/**
 * Wait for an element to exist (may not be visible) with a custom timeout.
 */
export async function waitForExists(testID: string, timeoutMs = 10000) {
  await waitFor(element(by.id(testID)))
    .toExist()
    .withTimeout(timeoutMs);
}

/**
 * Type text into an input field, clearing it first.
 */
export async function typeInField(testID: string, text: string) {
  await element(by.id(testID)).clearText();
  await element(by.id(testID)).typeText(text);
}

/**
 * Tap an element by testID.
 */
export async function tap(testID: string) {
  await element(by.id(testID)).tap();
}

/**
 * Dismiss the keyboard if visible.
 */
export async function dismissKeyboard() {
  if (device.getPlatform() === 'ios') {
    // Tap outside the keyboard area
    await element(by.id('login-screen')).tap({ x: 10, y: 10 });
  } else {
    await device.pressBack();
  }
}

/**
 * Navigate to login screen from welcome.
 */
export async function goToLogin() {
  await waitForVisible('welcome-screen');
  await tap('welcome-login-btn');
  await waitForVisible('login-screen');
}

/**
 * Navigate to register screen from welcome.
 */
export async function goToRegister() {
  await waitForVisible('welcome-screen');
  // Swipe through onboarding slides or tap Get Started
  await tap('welcome-next-btn');
  await tap('welcome-next-btn');
  await tap('welcome-next-btn'); // "Get Started" on last slide
  await waitForVisible('register-screen');
}

/**
 * Register a new parent account.
 * Ends on the email verification or create-family screen.
 */
export async function registerParent(
  name = testData.parentName,
  email = testData.parentEmail,
  password = testData.parentPassword,
) {
  await goToRegister();
  await typeInField('register-name-input', name);
  await typeInField('register-email-input', email);
  await typeInField('register-password-input', password);
  await tap('register-submit-btn');
}

/**
 * Login as a parent.
 * Ends on the dashboard or setup screen.
 */
export async function loginAsParent(
  email = testData.parentEmail,
  password = testData.parentPassword,
) {
  await goToLogin();
  // Ensure parent tab is selected
  await tap('login-parent-tab');
  await typeInField('login-email-input', email);
  await typeInField('login-password-input', password);
  await tap('login-submit-btn');
}

/**
 * Login as a child.
 * Ends on the child home screen.
 */
export async function loginAsChild(
  familyCode: string,
  childName = testData.childName,
) {
  await goToLogin();
  // Switch to child tab
  await tap('login-child-tab');
  await typeInField('login-family-code-input', familyCode);
  await typeInField('login-child-name-input', childName);
  await tap('login-submit-btn');
}

/**
 * Create a family from the setup flow.
 * Assumes we're on the create-family screen.
 */
export async function createFamily(familyName = testData.familyName) {
  await waitForVisible('create-family-screen');
  await tap('family-create-tab');
  await typeInField('family-name-input', familyName);
  await tap('family-create-btn');
}

/**
 * Add a child from the add-child screen.
 * Assumes we're on the add-child screen.
 */
export async function addChild(childName = testData.childName) {
  await waitForVisible('add-child-screen');
  await typeInField('add-child-name-input', childName);
  await tap('add-child-consent-checkbox');
  await tap('add-child-submit-btn');
}

/**
 * Logout the current user.
 * Works for both parent and child roles.
 */
export async function logout() {
  // Navigate to settings tab (parent) or profile tab (child)
  try {
    // Try parent settings
    await element(by.id('parent-settings-screen')).tap();
  } catch {
    // May need to navigate to settings tab first
    try {
      await element(by.text('Settings')).tap();
    } catch {
      // Try child profile
      await element(by.text('Profile')).tap();
    }
  }
  await tap('settings-logout-btn');
  await waitForVisible('welcome-screen', 15000);
}

/**
 * Dismiss a native alert dialog by tapping a button with the given label.
 */
export async function dismissAlert(buttonLabel = 'OK') {
  if (device.getPlatform() === 'ios') {
    await element(by.label(buttonLabel)).atIndex(0).tap();
  } else {
    await element(by.text(buttonLabel)).tap();
  }
}

/**
 * Scroll down on a scrollable element.
 */
export async function scrollDown(testID: string, pixels = 300) {
  await element(by.id(testID)).scroll(pixels, 'down');
}
