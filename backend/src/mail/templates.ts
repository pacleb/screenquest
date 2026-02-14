// Shared layout wrapper for all emails
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function layout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ScreenQuest</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f7; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6C63FF 0%, #4ECDC4 100%); padding:32px 40px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:700; letter-spacing:-0.5px;">🏰 ScreenQuest</h1>
              <p style="margin:6px 0 0; color:rgba(255,255,255,0.85); font-size:14px;">Earn screen time through real-world quests</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px; border-top:1px solid #eaeaea; text-align:center;">
              <p style="margin:0; color:#999; font-size:12px; line-height:18px;">
                © ${new Date().getFullYear()} ScreenQuest. All rights reserved.<br />
                You received this email because your address was used on ScreenQuest.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(text: string, url: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr>
      <td align="center">
        <a href="${url}" target="_blank" style="display:inline-block; background:linear-gradient(135deg, #6C63FF 0%, #4ECDC4 100%); color:#ffffff; text-decoration:none; padding:14px 36px; border-radius:8px; font-size:16px; font-weight:600; letter-spacing:0.3px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`;
}

// ------- Templates -------

export function verifyEmailTemplate(data: {
  name: string;
  verifyUrl: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 16px; color:#333; font-size:22px;">Welcome, ${escapeHtml(data.name)}! 👋</h2>
    <p style="margin:0 0 8px; color:#555; font-size:15px; line-height:24px;">
      Thanks for signing up for ScreenQuest! Please verify your email address to get started.
    </p>
    ${button('Verify Email', data.verifyUrl)}
    <p style="margin:0; color:#999; font-size:13px; line-height:20px;">
      If you didn't create a ScreenQuest account, you can safely ignore this email. This link expires in 24 hours.
    </p>
  `);
}

export function passwordResetTemplate(data: {
  name: string;
  resetUrl: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 16px; color:#333; font-size:22px;">Reset Your Password</h2>
    <p style="margin:0 0 8px; color:#555; font-size:15px; line-height:24px;">
      Hi ${escapeHtml(data.name)}, we received a request to reset your password. Click the button below to choose a new one.
    </p>
    ${button('Reset Password', data.resetUrl)}
    <p style="margin:0; color:#999; font-size:13px; line-height:20px;">
      If you didn't request a password reset, you can safely ignore this email. This link expires in 1 hour.
    </p>
  `);
}

export function familyInviteTemplate(data: {
  familyName: string;
  inviterName: string;
  familyCode: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 16px; color:#333; font-size:22px;">You're Invited! 🎉</h2>
    <p style="margin:0 0 8px; color:#555; font-size:15px; line-height:24px;">
      <strong>${escapeHtml(data.inviterName)}</strong> has invited you to join the <strong>${escapeHtml(data.familyName)}</strong> family on ScreenQuest.
    </p>
    <p style="margin:0 0 8px; color:#555; font-size:15px; line-height:24px;">
      ScreenQuest helps kids earn screen time by completing real-world quests — chores, learning activities, and more!
    </p>
    <div style="margin:24px 0; padding:20px; background-color:#f8f7ff; border-radius:8px; text-align:center; border:2px dashed #6C63FF;">
      <p style="margin:0 0 8px; color:#666; font-size:13px; text-transform:uppercase; letter-spacing:1px;">Your Family Code</p>
      <p style="margin:0; color:#6C63FF; font-size:32px; font-weight:700; letter-spacing:4px; font-family:monospace;">${data.familyCode}</p>
    </div>
    <p style="margin:0 0 16px; color:#555; font-size:15px; line-height:24px;">
      <strong>How to join:</strong>
    </p>
    <ol style="margin:0 0 16px; padding-left:20px; color:#555; font-size:15px; line-height:28px;">
      <li>Download ScreenQuest from the App Store</li>
      <li>Create an account</li>
      <li>Tap <strong>"Join a Family"</strong> and enter the code above</li>
    </ol>
    <p style="margin:0; color:#999; font-size:13px; line-height:20px;">
      This invitation was sent to you by ${escapeHtml(data.inviterName)}. If you don't know this person, you can safely ignore this email.
    </p>
  `);
}

export function accountDeletionRequestedTemplate(data: {
  name: string;
  gracePeriodEndsAt: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 16px; color:#333; font-size:22px;">Account Deletion Requested</h2>
    <p style="margin:0 0 8px; color:#555; font-size:15px; line-height:24px;">
      Hi ${escapeHtml(data.name)}, we've received your request to delete your ScreenQuest account.
    </p>
    <p style="margin:0 0 8px; color:#555; font-size:15px; line-height:24px;">
      Your account and all associated data will be <strong>permanently deleted after ${escapeHtml(data.gracePeriodEndsAt)}</strong>.
    </p>
    <p style="margin:0 0 8px; color:#555; font-size:15px; line-height:24px;">
      If you change your mind, you can cancel this request from the app Settings before that date.
    </p>
    <div style="margin:24px 0; padding:16px; background-color:#fff3f3; border-radius:8px; border:1px solid #ffcccc;">
      <p style="margin:0; color:#cc0000; font-size:14px; line-height:22px;">
        <strong>What will be deleted:</strong> Your profile, family data, quest history, Time Bank records, achievements, and any uploaded photos.
      </p>
    </div>
    <p style="margin:0; color:#999; font-size:13px; line-height:20px;">
      If you did not request this, please log in immediately and cancel the deletion.
    </p>
  `);
}

export function accountDeletedTemplate(data: {
  name: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 16px; color:#333; font-size:22px;">Account Deleted</h2>
    <p style="margin:0 0 8px; color:#555; font-size:15px; line-height:24px;">
      Hi ${escapeHtml(data.name)}, your ScreenQuest account has been permanently deleted along with all associated data.
    </p>
    <p style="margin:0 0 8px; color:#555; font-size:15px; line-height:24px;">
      We're sorry to see you go. If you ever want to return, you can create a new account at any time.
    </p>
    <p style="margin:0; color:#999; font-size:13px; line-height:20px;">
      This is an automated confirmation. No further action is needed.
    </p>
  `);
}
