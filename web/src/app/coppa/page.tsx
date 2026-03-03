import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "COPPA Compliance – ScreenQuest",
  description:
    "Learn how ScreenQuest complies with the Children's Online Privacy Protection Act (COPPA) to protect your children's privacy.",
};

export default function COPPACompliancePage() {
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
          COPPA Compliance
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Last updated: February 17, 2026
        </p>

        <div className="prose prose-gray mt-8 max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline">
          {/* 1. Our Commitment */}
          <h2>1. Our Commitment to Children&apos;s Privacy</h2>
          <p>
            ScreenQuest is committed to protecting the privacy of children under
            13 years of age. We comply fully with the Children&apos;s Online
            Privacy Protection Act (&quot;COPPA&quot;), a U.S. federal law
            designed to protect children&apos;s personal information collected
            online.
          </p>
          <p>
            This page explains our specific practices related to children&apos;s
            data and how we meet COPPA requirements. For our complete data
            practices, please also review our{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>

          {/* 2. What is COPPA */}
          <h2>2. What is COPPA?</h2>
          <p>
            The Children&apos;s Online Privacy Protection Act (COPPA) is a U.S.
            law that applies to the online collection of personal information
            from children under 13. COPPA requires operators of websites and
            online services directed to children, or that knowingly collect
            information from children under 13, to:
          </p>
          <ul>
            <li>
              Provide notice to parents about their information practices.
            </li>
            <li>
              Obtain verifiable parental consent before collecting personal
              information from children.
            </li>
            <li>
              Give parents the choice to consent to collection without
              consenting to disclosure to third parties.
            </li>
            <li>
              Provide parents access to their child&apos;s personal information
              and the ability to delete it.
            </li>
            <li>
              Not condition a child&apos;s participation on the collection of
              more personal information than is reasonably necessary.
            </li>
            <li>
              Maintain the confidentiality, security, and integrity of
              children&apos;s personal information.
            </li>
          </ul>

          {/* 3. How ScreenQuest Complies */}
          <h2>3. How ScreenQuest Complies with COPPA</h2>

          <h3>3.1 Parental Consent Requirement</h3>
          <p>
            ScreenQuest requires a parent or legal guardian to create and manage
            all child accounts. Children cannot sign up independently or provide
            personal information without parental involvement.
          </p>
          <ul>
            <li>
              <strong>Account creation:</strong> Only verified adult users
              (parents/guardians) can create child profiles within their family
              account.
            </li>
            <li>
              <strong>Implicit consent:</strong> By creating a child profile,
              the parent provides consent for the limited data collection
              necessary to operate the Service.
            </li>
            <li>
              <strong>Ongoing control:</strong> Parents maintain full control
              over their child&apos;s account and can modify or delete it at any
              time.
            </li>
          </ul>

          <h3>3.2 Information We Collect from Children</h3>
          <p>
            We collect only the minimum information necessary to provide our
            Service:
          </p>
          <ul>
            <li>
              <strong>Display name:</strong> A first name or nickname chosen by
              the parent (we do not collect full legal names of children).
            </li>
            <li>
              <strong>Age range:</strong> An age bracket to ensure
              age-appropriate experiences.
            </li>
            <li>
              <strong>PIN:</strong> A numeric PIN for child login, stored in
              hashed form (never plain text).
            </li>
            <li>
              <strong>Quest activity:</strong> Records of completed quests,
              earned rewards, and screen time usage within the app.
            </li>
            <li>
              <strong>Proof photos (optional):</strong> Photos uploaded by
              children as quest completion evidence, visible only to linked
              guardians.
            </li>
          </ul>

          <h3>3.3 Information We Do NOT Collect from Children</h3>
          <ul>
            <li>Full legal name or surname</li>
            <li>Home address or geolocation data</li>
            <li>Phone number or email address</li>
            <li>Social Security number or government IDs</li>
            <li>Advertising identifiers or persistent identifiers for tracking</li>
            <li>Audio or video recordings (beyond optional proof photos)</li>
          </ul>

          <h3>3.4 How We Use Children&apos;s Information</h3>
          <p>Children&apos;s information is used solely to:</p>
          <ul>
            <li>Enable children to log in and use the app.</li>
            <li>Display their profile within the family unit.</li>
            <li>Track quest completion and time bank balances.</li>
            <li>Show progress and achievements to linked guardians.</li>
          </ul>

          <h3>3.5 No Third-Party Sharing or Advertising</h3>
          <p>
            We do <strong>not</strong>:
          </p>
          <ul>
            <li>
              Share children&apos;s personal information with third parties for
              marketing or advertising purposes.
            </li>
            <li>Display targeted or behavioral advertising to children.</li>
            <li>
              Allow children to communicate with users outside their family
              unit.
            </li>
            <li>
              Enable children to make their information publicly available.
            </li>
          </ul>

          <h3>3.6 No Social Features for Children</h3>
          <p>
            ScreenQuest does not include social networking features for
            children:
          </p>
          <ul>
            <li>No public profiles or usernames</li>
            <li>No chat, messaging, or communication with other users</li>
            <li>No sharing of content outside the family unit</li>
            <li>No leaderboards with other families</li>
          </ul>

          {/* 4. Parental Rights */}
          <h2>4. Parental Rights and Controls</h2>
          <p>As a parent or guardian, you have the right to:</p>
          <ul>
            <li>
              <strong>Review information:</strong> Access all personal
              information collected about your child through the app settings.
            </li>
            <li>
              <strong>Request changes:</strong> Modify your child&apos;s display
              name, avatar, or other profile information at any time.
            </li>
            <li>
              <strong>Delete your child&apos;s account:</strong> Remove your
              child&apos;s profile and all associated data using the in-app
              deletion feature.
            </li>
            <li>
              <strong>Refuse further collection:</strong> You may request that
              we stop collecting information from your child, though this may
              require deleting their account.
            </li>
            <li>
              <strong>Request direct deletion:</strong> Contact us at any time
              to request deletion of your child&apos;s data.
            </li>
          </ul>

          {/* 5. How to Exercise Rights */}
          <h2>5. How to Exercise Your Rights</h2>
          <h3>5.1 In-App Options</h3>
          <ul>
            <li>
              Go to <strong>Settings → Family → [Child Name]</strong> to view
              and edit child profile information.
            </li>
            <li>
              Use the <strong>Delete Child Account</strong> option to remove a
              child&apos;s profile and data.
            </li>
            <li>
              Use the <strong>Delete Family Account</strong> option to remove
              all accounts including children&apos;s data.
            </li>
          </ul>

          <h3>5.2 Contact Us Directly</h3>
          <p>
            You may also contact us directly to exercise your parental rights:
          </p>
          <ul>
            <li>
              <strong>Email:</strong>{" "}
              <a href="mailto:privacy@screenquest.app">
                privacy@screenquest.app
              </a>
            </li>
          </ul>
          <p>
            Please include your account email address and the name of the child
            profile(s) in question. We will verify your identity as the guardian
            before processing requests.
          </p>

          {/* 6. Data Security */}
          <h2>6. Data Security for Children&apos;s Information</h2>
          <p>
            We implement robust security measures to protect children&apos;s
            data:
          </p>
          <ul>
            <li>All data transmitted using TLS/SSL encryption.</li>
            <li>Child PINs are hashed (never stored in plain text).</li>
            <li>Access controls limit employee access to user data.</li>
            <li>Regular security audits and vulnerability assessments.</li>
            <li>Secure cloud infrastructure with monitoring and backups.</li>
          </ul>

          {/* 7. Data Retention */}
          <h2>7. Data Retention</h2>
          <p>
            We retain children&apos;s data only as long as necessary to provide
            the Service. When a child&apos;s account is deleted:
          </p>
          <ul>
            <li>
              All personal information is scheduled for permanent deletion
              within 30 days.
            </li>
            <li>Proof photos are promptly removed from our servers.</li>
            <li>
              Quest history and activity data associated with the child is
              deleted.
            </li>
          </ul>

          {/* 8. Updates to Practices */}
          <h2>8. Updates to Our Practices</h2>
          <p>
            If we make material changes to how we collect, use, or disclose
            children&apos;s personal information, we will:
          </p>
          <ul>
            <li>Update this page and our Privacy Policy.</li>
            <li>Notify parents via email or in-app notification.</li>
            <li>
              Obtain new parental consent when required by COPPA before making
              changes that materially affect existing children&apos;s data.
            </li>
          </ul>

          {/* 9. Contact */}
          <h2>9. Contact Us</h2>
          <p>
            If you have questions about our COPPA compliance or wish to exercise
            your parental rights, please contact us at:
          </p>
          <ul>
            <li>
              <strong>Email:</strong>{" "}
              <a href="mailto:privacy@screenquest.app">
                privacy@screenquest.app
              </a>
            </li>
          </ul>
          <p>
            We are committed to working with parents to ensure their
            children&apos;s privacy is protected.
          </p>
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
            <Link
              href="/terms"
              className="hover:text-brand-600 transition-colors"
            >
              Terms of Service
            </Link>
            <Link href="/coppa" className="text-brand-600 hover:underline">
              COPPA Compliance
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
