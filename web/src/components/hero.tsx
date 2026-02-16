import { Star, Shield, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28 hero-gradient">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
            <Sparkles size={14} />
            Now available on iOS & Android
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl leading-[1.1]">
            Turn Screen Time
            <br />
            Into <span className="text-gradient">Family Time</span>
          </h1>

          {/* Sub-headline */}
          <p className="mt-6 text-lg text-gray-600 md:text-xl max-w-2xl mx-auto leading-relaxed">
            Kids earn screen time by completing real-world quests — reading,
            chores, exercise, and more. Build healthy habits together, one quest
            at a time.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#download"
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 transition-all hover:shadow-xl hover:shadow-brand-600/30"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              App Store
            </a>
            <a
              href="#download"
              className="inline-flex items-center gap-2 rounded-full border-2 border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-800 shadow-sm hover:border-brand-300 hover:bg-brand-50 transition-all"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zM14.852 13.06l2.36 2.36-10.496 6.009 8.136-8.37zm3.458-2.063l2.14 1.226a1 1 0 010 1.554l-2.14 1.226-2.598-2.672 2.598-1.334zM6.716 3.571l10.496 6.009-2.36 2.36-8.136-8.37z" />
              </svg>
              Google Play
            </a>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className="fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <span className="ml-1 font-medium">4.9/5</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-1.5">
              <Shield size={16} className="text-green-500" />
              <span>COPPA Compliant</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-gray-300" />
            <span>10K+ Families</span>
          </div>
        </div>
      </div>

      {/* Background decorations */}
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-brand-100/30 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-brand-100/20 blur-3xl" />
    </section>
  );
}
