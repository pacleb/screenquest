import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/screenquest-mascot.png"
                alt="ScreenQuest"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="text-lg font-bold tracking-tight">
                Screen<span className="text-brand-600">Quest</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              Turning screen time into family time, one quest at a time.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>
                <Link
                  href="#features"
                  className="hover:text-brand-600 transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#pricing"
                  className="hover:text-brand-600 transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="#faq"
                  className="hover:text-brand-600 transition-colors"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="#download"
                  className="hover:text-brand-600 transition-colors"
                >
                  Download
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-brand-600 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-brand-600 transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/coppa"
                  className="hover:text-brand-600 transition-colors"
                >
                  COPPA Compliance
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>
                <a
                  href="mailto:support@screenquest.app"
                  className="hover:text-brand-600 transition-colors"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-brand-600 transition-colors"
                >
                  Help Center
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} ScreenQuest. All rights reserved.
          </p>
          <p className="text-xs text-gray-400">
            Made with care for families everywhere.
          </p>
        </div>
      </div>
    </footer>
  );
}
