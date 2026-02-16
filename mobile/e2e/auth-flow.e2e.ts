import { by, device, element, expect, waitFor } from 'detox';
import {
  goToLogin,
  goToRegister,
  loginAsParent,
  loginAsChild,
  registerParent,
  waitForVisible,
  typeInField,
  tap,
  dismissAlert,
  testData,
} from './helpers';

describe('Auth Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show the welcome screen on first launch', async () => {
    await waitForVisible('welcome-screen');
    await expect(element(by.text('Welcome to ScreenQuest!'))).toBeVisible();
  });

  it('should navigate through onboarding slides', async () => {
    await waitForVisible('welcome-screen');
    await tap('welcome-next-btn'); // Slide 2
    await expect(element(by.text('Parents Set Quests'))).toBeVisible();
    await tap('welcome-next-btn'); // Slide 3
    await expect(element(by.text('Everyone Wins!'))).toBeVisible();
  });

  it('should navigate to register screen via Get Started', async () => {
    await goToRegister();
    await expect(element(by.text('Create Account'))).toBeVisible();
  });

  it('should navigate to login screen via "I already have an account"', async () => {
    await goToLogin();
    await expect(element(by.text('Welcome Back!'))).toBeVisible();
  });

  it('should navigate to child login via "I\'m a kid"', async () => {
    await waitForVisible('welcome-screen');
    await tap('welcome-child-btn');
    await waitForVisible('login-screen');
    // Should be in child mode
    await expect(element(by.id('login-family-code-input'))).toBeVisible();
  });

  it('should toggle between parent and child login modes', async () => {
    await goToLogin();

    // Default: parent mode
    await expect(element(by.id('login-email-input'))).toBeVisible();

    // Switch to child mode
    await tap('login-child-tab');
    await expect(element(by.id('login-family-code-input'))).toBeVisible();
    await expect(element(by.id('login-child-name-input'))).toBeVisible();

    // Switch back to parent mode
    await tap('login-parent-tab');
    await expect(element(by.id('login-email-input'))).toBeVisible();
    await expect(element(by.id('login-password-input'))).toBeVisible();
  });

  it('should show error on parent login with invalid credentials', async () => {
    await goToLogin();
    await tap('login-parent-tab');
    await typeInField('login-email-input', 'invalid@test.com');
    await typeInField('login-password-input', 'wrongpassword');
    await tap('login-submit-btn');

    // Should show an alert
    await waitFor(element(by.text('Login Failed')))
      .toBeVisible()
      .withTimeout(10000);
    await dismissAlert('OK');
  });

  it('should show error on parent login with empty fields', async () => {
    await goToLogin();
    await tap('login-parent-tab');
    await tap('login-submit-btn');

    await waitFor(element(by.text('Error')))
      .toBeVisible()
      .withTimeout(5000);
    await dismissAlert('OK');
  });

  it('should register a new parent account', async () => {
    await registerParent();

    // Should navigate to email verification or create-family screen
    await waitFor(
      element(by.id('create-family-screen')).or(
        element(by.text('Verify Your Email')),
      ),
    )
      .toBeVisible()
      .withTimeout(15000);
  });

  it('should show error on duplicate registration', async () => {
    await goToRegister();
    await typeInField('register-name-input', testData.parentName);
    await typeInField('register-email-input', testData.parentEmail);
    await typeInField('register-password-input', testData.parentPassword);
    await tap('register-submit-btn');

    await waitFor(element(by.text('Registration Failed')))
      .toBeVisible()
      .withTimeout(10000);
    await dismissAlert('OK');
  });

  it('should navigate from login to register via sign up link', async () => {
    await goToLogin();
    await tap('login-signup-link');
    await waitForVisible('register-screen');
  });

  it('should navigate from register to login via sign in link', async () => {
    await goToRegister();
    await tap('register-login-link');
    await waitForVisible('login-screen');
  });
});
