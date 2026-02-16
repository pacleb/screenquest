"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Is ScreenQuest safe for my kids?",
    a: "Absolutely. ScreenQuest is fully COPPA compliant. We never show ads, never sell data, and never track children. All data is encrypted and stored securely.",
  },
  {
    q: "What ages is ScreenQuest designed for?",
    a: "ScreenQuest works great for kids aged 5–14, but families with older teens use it too. Quests and rewards are fully customizable to suit any age.",
  },
  {
    q: "Can both parents manage the family?",
    a: "Yes! Multiple guardians can be linked to a single family. Both parents (even in separate households) can create quests, approve completions, and monitor screen time.",
  },
  {
    q: "What happens when screen time runs out?",
    a: "The app shows a gentle reminder that time is up. Parents can set consequences for violations or simply let the timer encourage kids to get back to real-world activities.",
  },
  {
    q: "Can I try Premium before paying?",
    a: "Yes! Premium comes with a 7-day free trial. No credit card required to start. You can cancel anytime from your app store account settings.",
  },
  {
    q: "Does it work on both iPhone and Android?",
    a: "Yes, ScreenQuest is available on both the Apple App Store and Google Play Store. Family data syncs across all devices in real time.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 mb-3">
            FAQ
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        {/* Accordion */}
        <div className="divide-y divide-gray-200">
          {faqs.map((faq, i) => (
            <div key={i} className="py-5">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-base font-medium pr-4">{faq.q}</span>
                <ChevronDown
                  size={20}
                  className={`flex-shrink-0 text-gray-400 transition-transform ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === i && (
                <p className="mt-3 text-gray-600 leading-relaxed pr-8">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
