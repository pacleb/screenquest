/**
 * Send test emails for all 5 email templates.
 *
 * Usage:  npx ts-node send-test-emails.ts your@email.com
 */
import { Resend } from 'resend';
import {
  verifyEmailTemplate,
  passwordResetTemplate,
  familyInviteTemplate,
  accountDeletionRequestedTemplate,
  accountDeletedTemplate,
} from './src/mail/templates';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_AvTLJK4k_CJ45Cj6ysNAcM4wVDkLdTxxK';
const FROM = 'ScreenQuest <noreply@restdayapps.com>';

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error('Usage: npx ts-node send-test-emails.ts <your-email>');
    process.exit(1);
  }

  const resend = new Resend(RESEND_API_KEY);

  const emails = [
    {
      subject: '[TEST] Verify your ScreenQuest email',
      html: verifyEmailTemplate({
        name: 'Jerome',
        verifyUrl: 'https://screenquest.app/verify?token=test-token-123',
      }),
    },
    {
      subject: '[TEST] Reset your ScreenQuest password',
      html: passwordResetTemplate({
        name: 'Jerome',
        resetUrl: 'https://screenquest.app/reset?token=test-token-456',
      }),
    },
    {
      subject: "[TEST] You're invited to join the Pacleb Family on ScreenQuest!",
      html: familyInviteTemplate({
        familyName: 'Pacleb Family',
        inviterName: 'Jerome',
        familyCode: 'QUEST42',
      }),
    },
    {
      subject: '[TEST] ScreenQuest Account Deletion Request',
      html: accountDeletionRequestedTemplate({
        name: 'Jerome',
        gracePeriodEndsAt: '2026-03-16',
      }),
    },
    {
      subject: '[TEST] Your ScreenQuest Account Has Been Deleted',
      html: accountDeletedTemplate({
        name: 'Jerome',
      }),
    },
  ];

  console.log(`Sending ${emails.length} test emails to ${to}...\n`);

  for (const email of emails) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM,
        to,
        subject: email.subject,
        html: email.html,
      });

      if (error) {
        console.error(`✗ ${email.subject}: ${error.message}`);
      } else {
        console.log(`✓ ${email.subject}  (id: ${data?.id})`);
      }
    } catch (err: any) {
      console.error(`✗ ${email.subject}: ${err.message}`);
    }
  }

  console.log('\nDone!');
}

main();
