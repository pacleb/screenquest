import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service – ScreenQuest",
  description:
    "ScreenQuest Terms of Service. Understand your rights and responsibilities when using our family screen time management app.",
};

export default function TermsOfServicePage() {
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
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Last updated: February 17, 2026
        </p>

        <div className="prose prose-gray mt-8 max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline">
          {/* 1. Acceptance of Terms */}
          <h2>1. Acceptance of Terms</h2>
          <p>
            Welcome to ScreenQuest! By accessing or using the ScreenQuest mobile
            application and related services (the &quot;Service&quot;), you
            agree to be bound by these Terms of Service (&quot;Terms&quot;). If
            you do not agree to these Terms, please do not use the Service.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you and
            ScreenQuest (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By
            creating an account, you confirm that you are at least 18 years old
            and have the legal authority to enter into this agreement.
          </p>

          {/* 2. Description of Service */}
          <h2>2. Description of Service</h2>
          <p>
            ScreenQuest is a family-oriented screen time management application
            that helps parents and guardians:
          </p>
          <ul>
            <li>Create and assign quests (tasks/chores) for children.</li>
            <li>
              Track quest completion and reward children with screen time
              credits.
            </li>
            <li>
              Manage a &quot;time bank&quot; system for earned screen time.
            </li>
            <li>
              Build healthy habits through gamification and positive
              reinforcement.
            </li>
          </ul>
          <p>
            The Service is designed to be used by families where parents or
            guardians maintain oversight and control of children&apos;s
            accounts.
          </p>

          {/* 3. Account Registration */}
          <h2>3. Account Registration and Security</h2>
          <h3>3.1 Guardian Accounts</h3>
          <p>
            To use ScreenQuest, you must create a guardian (parent) account. You
            agree to:
          </p>
          <ul>
            <li>Provide accurate and complete registration information.</li>
            <li>Maintain the security of your account credentials.</li>
            <li>
              Notify us immediately of any unauthorized access to your account.
            </li>
            <li>
              Accept responsibility for all activities that occur under your
              account.
            </li>
          </ul>

          <h3>3.2 Child Accounts</h3>
          <p>
            Child accounts may only be created by a parent or legal guardian.
            By creating a child account, you represent and warrant that:
          </p>
          <ul>
            <li>
              You are the parent or legal guardian of the child for whom you are
              creating the account.
            </li>
            <li>
              You consent to the collection and use of your child&apos;s
              information as described in our{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </li>
            <li>
              You will supervise your child&apos;s use of the Service as
              appropriate.
            </li>
          </ul>

          {/* 4. Subscriptions and Payments */}
          <h2>4. Subscriptions and Payments</h2>
          <h3>4.1 Subscription Plans</h3>
          <p>
            ScreenQuest offers subscription-based access to premium features.
            Subscription plans, pricing, and features are described in the app
            and may change from time to time.
          </p>

          <h3>4.2 Billing</h3>
          <ul>
            <li>
              Subscriptions are billed through Apple App Store or Google Play
              Store.
            </li>
            <li>
              Subscriptions automatically renew unless canceled at least 24
              hours before the end of the current billing period.
            </li>
            <li>
              Payment will be charged to your app store account upon
              confirmation of purchase.
            </li>
          </ul>

          <h3>4.3 Cancellation and Refunds</h3>
          <p>
            You may cancel your subscription at any time through your app store
            account settings. Refunds are handled according to Apple or
            Google&apos;s refund policies. We do not provide direct refunds for
            subscriptions processed through app stores.
          </p>

          {/* 5. User Conduct */}
          <h2>5. User Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>
              Use the Service for any unlawful purpose or in violation of these
              Terms.
            </li>
            <li>
              Upload, post, or transmit any content that is harmful, offensive,
              obscene, or otherwise objectionable.
            </li>
            <li>
              Attempt to gain unauthorized access to other accounts, our
              systems, or networks.
            </li>
            <li>
              Interfere with or disrupt the Service or servers/networks
              connected to the Service.
            </li>
            <li>
              Use automated means (bots, scrapers, etc.) to access the Service.
            </li>
            <li>
              Impersonate any person or entity or misrepresent your affiliation.
            </li>
            <li>
              Upload photos or content that contain inappropriate imagery or
              violate third-party rights.
            </li>
          </ul>

          {/* 6. Content and Intellectual Property */}
          <h2>6. Content and Intellectual Property</h2>
          <h3>6.1 User Content</h3>
          <p>
            You retain ownership of content you upload (such as quest proof
            photos). By uploading content, you grant us a limited license to
            store, display, and process that content solely to provide the
            Service.
          </p>

          <h3>6.2 Our Content</h3>
          <p>
            The Service, including its design, graphics, text, and software, is
            owned by ScreenQuest and protected by copyright, trademark, and
            other intellectual property laws. You may not copy, modify,
            distribute, or create derivative works without our written
            permission.
          </p>

          {/* 7. Privacy */}
          <h2>7. Privacy</h2>
          <p>
            Your use of the Service is also governed by our{" "}
            <Link href="/privacy">Privacy Policy</Link>, which explains how we
            collect, use, and protect your information. Our privacy practices
            are designed to comply with the Children&apos;s Online Privacy
            Protection Act (COPPA) and other applicable regulations.
          </p>

          {/* 8. Disclaimers */}
          <h2>8. Disclaimers</h2>
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
            AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
            INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS
            FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
          </p>
          <p>
            We do not warrant that the Service will be uninterrupted,
            error-free, or secure. You use the Service at your own risk.
          </p>
          <p>
            ScreenQuest is a tool to assist with screen time management but is
            not a substitute for parental supervision and judgment.
          </p>

          {/* 9. Limitation of Liability */}
          <h2>9. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, SCREENQUEST SHALL NOT BE
            LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
            PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, PROFITS, OR GOODWILL,
            ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE.
          </p>
          <p>
            Our total liability for any claims arising under these Terms shall
            not exceed the amount you paid for the Service in the twelve (12)
            months preceding the claim.
          </p>

          {/* 10. Indemnification */}
          <h2>10. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless ScreenQuest, its officers,
            directors, employees, and agents from any claims, damages, losses,
            or expenses (including reasonable attorneys&apos; fees) arising from
            your use of the Service, violation of these Terms, or infringement
            of any third-party rights.
          </p>

          {/* 11. Termination */}
          <h2>11. Termination</h2>
          <p>
            We may suspend or terminate your access to the Service at any time,
            with or without cause, with or without notice. You may terminate
            your account at any time by using the account deletion feature in
            the app or by contacting us.
          </p>
          <p>
            Upon termination, your right to use the Service ceases immediately,
            and we may delete your account data in accordance with our Privacy
            Policy.
          </p>

          {/* 12. Dispute Resolution */}
          <h2>12. Dispute Resolution</h2>
          <p>
            Any disputes arising from these Terms or your use of the Service
            shall be resolved through binding arbitration in accordance with the
            rules of the American Arbitration Association, rather than in court,
            except that you may assert claims in small claims court if your
            claims qualify.
          </p>
          <p>
            <strong>Class Action Waiver:</strong> You agree that any dispute
            resolution will be conducted on an individual basis and not as part
            of a class, consolidated, or representative action.
          </p>

          {/* 13. Governing Law */}
          <h2>13. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with
            the laws of the State of California, United States, without regard
            to its conflict of law provisions.
          </p>

          {/* 14. Changes to Terms */}
          <h2>14. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify you of
            material changes by posting the updated Terms in the app and on our
            website, with a revised &quot;Last updated&quot; date. Your
            continued use of the Service after changes become effective
            constitutes acceptance of the revised Terms.
          </p>

          {/* 15. Contact */}
          <h2>15. Contact Us</h2>
          <p>
            If you have questions about these Terms of Service, please contact
            us at:
          </p>
          <ul>
            <li>
              <strong>Email:</strong>{" "}
              <a href="mailto:support@screenquest.app">
                support@screenquest.app
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
            <Link
              href="/privacy"
              className="hover:text-brand-600 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-brand-600 hover:underline">
              Terms of Service
            </Link>
            <Link
              href="/coppa"
              className="hover:text-brand-600 transition-colors"
            >
              COPPA Compliance
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
