export function Cta() {
  return (
    <section
      id="download"
      className="py-20 md:py-28 bg-gradient-to-br from-brand-600 to-brand-800 text-white"
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to make screen time meaningful?
        </h2>
        <p className="mt-4 text-lg text-brand-200 max-w-xl mx-auto">
          Join thousands of families who&apos;ve transformed their daily routine
          with ScreenQuest. Download free today.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* App Store */}
          <a
            href="https://apps.apple.com/ph/app/screenquest-earned-play-time/id6759257648"
            className="inline-flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur px-6 py-3.5 text-white border border-white/20 hover:bg-white/20 transition-colors"
          >
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            <div className="text-left">
              <div className="text-xs opacity-80">Download on the</div>
              <div className="text-base font-semibold -mt-0.5">App Store</div>
            </div>
          </a>

          {/* Google Play */}
          <a
            href="https://play.google.com"
            className="inline-flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur px-6 py-3.5 text-white border border-white/20 hover:bg-white/20 transition-colors"
          >
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zM14.852 13.06l2.36 2.36-10.496 6.009 8.136-8.37zm3.458-2.063l2.14 1.226a1 1 0 010 1.554l-2.14 1.226-2.598-2.672 2.598-1.334zM6.716 3.571l10.496 6.009-2.36 2.36-8.136-8.37z" />
            </svg>
            <div className="text-left">
              <div className="text-xs opacity-80">Get it on</div>
              <div className="text-base font-semibold -mt-0.5">Google Play</div>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
