import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy – ScreenQuest",
  description:
    "ScreenQuest Privacy Policy. Learn how we collect, use, and protect your data and your children's data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Simple nav */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-sm">
              S
            </div>
            <span className="text-lg font-bold tracking-tight">
              Screen<span className="text-brand-600">Quest</span>
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-brand-600 transition-colors"
          >
            &larr; Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Last updated: February 17, 2026
        </p>

        <div className="prose prose-gray mt-8 max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline">
          {/* 1. Introduction */}
          <h2>1. Introduction</h2>
          <p>
            ScreenQuest (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
            provides a family-oriented mobile application designed to help
            parents and guardians manage their children&apos;s screen time
            through quests, rewards, and healthy habit-building (the
            &quot;Service&quot;). This Privacy Policy explains how we collect,
            use, disclose, and safeguard information when you use our
            application.
          </p>
          <p>
            We are committed to protecting your privacy and, in particular, the
            privacy of children. Our practices comply with the Children&apos;s
            Online Privacy Protection Act (&quot;COPPA&quot;) and applicable
            privacy regulations.
          </p>

          {/* 2. Information We Collect */}
          <h2>2. Information We Collect</h2>

          <h3>2.1 Information Provided by Parents/Guardians</h3>
          <ul>
            <li>
              <strong>Account information:</strong> name, email address, and
              password when creating a guardian account.
            </li>
            <li>
              <strong>Family profile:</strong> family name and optional profile
              customization.
            </li>
            <li>
              <strong>Payment information:</strong> subscription and in-app
              purchase data processed through Apple App Store / Google Play
              Store. We do not directly collect or store credit card numbers.
            </li>
          </ul>

          <h3>2.2 Information About Children</h3>
          <p>
            Child accounts are created and managed exclusively by a parent or
            guardian. We collect:
          </p>
          <ul>
            <li>
              <strong>Display name:</strong> a first name or nickname chosen by
              the parent (we do not require a child&apos;s full name).
            </li>
            <li>
              <strong>Age range:</strong> to tailor age-appropriate content and
              ensure COPPA compliance.
            </li>
            <li>
              <strong>PIN:</strong> a hashed numeric PIN for child login (stored
              securely, never in plain text).
            </li>
            <li>
              <strong>Quest activity:</strong> completed quests, earned rewards,
              and screen time usage within the app.
            </li>
            <li>
              <strong>Proof photos:</strong> optional photos uploaded by
              children as quest completion evidence, viewable only by their
              linked guardians.
            </li>
          </ul>

          <h3>2.3 Automatically Collected Information</h3>
          <ul>
            <li>
              <strong>Device information:</strong> device type, operating system
              version, and app version for compatibility and troubleshooting.
            </li>
            <li>
              <strong>Usage analytics:</strong> anonymous, aggregated usage
              patterns to improve the Service. We do not track children with
              advertising identifiers.
            </li>
          </ul>

          {/* 3. How We Use Information */}
          <h2>3. How We Use Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve the Service.</li>
            <li>
              Enable parents to create and manage family accounts and child
              profiles.
            </li>
            <li>
              Track quest completion, time bank balances, and reward progress.
            </li>
            <li>Send notifications related to quests and screen time.</li>
            <li>Process subscriptions and in-app purchases.</li>
            <li>
              Respond to customer support requests and communicate service
              updates.
            </li>
            <li>
              Ensure compliance with our Terms of Service and applicable laws.
            </li>
          </ul>

          {/* 4. Children's Privacy (COPPA) */}
          <h2>4. Children&apos;s Privacy (COPPA Compliance)</h2>
          <p>
            We take children&apos;s privacy seriously. ScreenQuest is designed
            so that:
          </p>
          <ul>
            <li>
              <strong>Parental consent is required.</strong> Only a verified
              parent or guardian can create a child profile. Children cannot
              create accounts independently.
            </li>
            <li>
              <strong>Minimal data collection.</strong> We collect only the
              information necessary for the app to function (display name, age
              range, quest activity).
            </li>
            <li>
              <strong>No behavioral advertising.</strong> We do not serve
              targeted advertisements to children or share children&apos;s data
              with third-party advertisers.
            </li>
            <li>
              <strong>No social features for children.</strong> Children cannot
              publicly share content, chat with other users, or interact with
              anyone outside their family unit.
            </li>
            <li>
              <strong>Parental access and control.</strong> Parents can review
              all data associated with their child&apos;s profile, modify it, or
              delete their child&apos;s account at any time through the app or
              by contacting us.
            </li>
          </ul>

          {/* 5. Data Sharing */}
          <h2>5. Data Sharing and Disclosure</h2>
          <p>
            We do <strong>not</strong> sell, rent, or trade personal
            information. We may share information only in the following limited
            circumstances:
          </p>
          <ul>
            <li>
              <strong>Service providers:</strong> trusted third parties that
              help us operate the Service (e.g., cloud hosting, email delivery),
              bound by strict confidentiality obligations.
            </li>
            <li>
              <strong>Legal compliance:</strong> when required by law, subpoena,
              or legal process, or to protect the rights, safety, or property of
              ScreenQuest, our users, or others.
            </li>
            <li>
              <strong>Business transfers:</strong> in connection with a merger,
              acquisition, or sale of assets, with prior notice to affected
              users.
            </li>
          </ul>

          {/* 6. Data Security */}
          <h2>6. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your
            data, including:
          </p>
          <ul>
            <li>Encryption of data in transit (TLS/SSL) and at rest.</li>
            <li>Hashed and salted passwords and PINs.</li>
            <li>Role-based access controls and regular security audits.</li>
            <li>
              Secure cloud infrastructure with automatic backups and monitoring.
            </li>
          </ul>
          <p>
            While we strive to protect your information, no method of
            transmission over the Internet is 100% secure. We encourage you to
            use strong, unique passwords.
          </p>

          {/* 7. Data Retention */}
          <h2>7. Data Retention and Deletion</h2>
          <p>
            We retain personal data only as long as necessary to provide the
            Service and fulfill the purposes described in this policy. When you
            delete your account:
          </p>
          <ul>
            <li>
              Account data is scheduled for permanent deletion within 30 days.
            </li>
            <li>
              Uploaded photos and proof images are deleted from our servers.
            </li>
            <li>
              Anonymized, aggregated analytics data may be retained for product
              improvement.
            </li>
          </ul>
          <p>
            Parents may request deletion of their child&apos;s data at any time
            by using the in-app account deletion feature or by contacting us at
            the email below.
          </p>

          {/* 8. Your Rights */}
          <h2>8. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you or your child.</li>
            <li>Correct inaccurate or incomplete data.</li>
            <li>Request deletion of your account and associated data.</li>
            <li>
              Withdraw consent for data collection (which may limit app
              functionality).
            </li>
            <li>Export your data in a portable format.</li>
          </ul>
          <p>
            To exercise any of these rights, use the in-app settings or contact
            us using the information below.
          </p>

          {/* 9. Third-Party Services */}
          <h2>9. Third-Party Services</h2>
          <p>Our app may integrate with or link to third-party services:</p>
          <ul>
            <li>
              <strong>Apple App Store / Google Play Store</strong> for app
              distribution and in-app purchases.
            </li>
            <li>
              <strong>Push notification services</strong> (Apple APNs / Firebase
              Cloud Messaging) for delivering quest reminders.
            </li>
          </ul>
          <p>
            These services have their own privacy policies, and we encourage you
            to review them.
          </p>

          {/* 10. Changes */}
          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify
            you of material changes by posting the updated policy in the app and
            on our website, with a revised &quot;Last updated&quot; date. For
            changes that affect children&apos;s data, we will seek renewed
            parental consent where required by law.
          </p>

          {/* 11. Contact */}
          <h2>11. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, our data practices,
            or wish to exercise your rights, please contact us at:
          </p>
          <ul>
            <li>
              <strong>Email:</strong>{" "}
              <a href="mailto:privacy@screenquest.app">
                privacy@screenquest.app
              </a>
            </li>
          </ul>
        </div>
      </main>

      {/* Simple footer */}
      <footer className="border-t border-gray-100 bg-gray-50 py-8">
        <div className="mx-auto max-w-4xl px-6 text-center text-sm text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} ScreenQuest. All rights reserved.
          </p>
          <div className="mt-2 flex justify-center gap-4">
            <Link href="/privacy" className="text-brand-600 hover:underline">
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-brand-600 transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
