import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    features: [
      "1 family, up to 2 children",
      "5 active quests",
      "Basic time bank",
      "Quest library access",
      "Photo proof",
    ],
    cta: "Get Started Free",
    highlighted: false,
  },
  {
    name: "Premium",
    price: "$4.99",
    period: "/month",
    description: "For the whole family",
    features: [
      "Unlimited children",
      "Unlimited active quests",
      "Advanced time bank controls",
      "Full quest library",
      "Detailed analytics dashboard",
      "Priority support",
      "Custom quest categories",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 mb-3">
            Pricing
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, family-friendly pricing
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Start free. Upgrade when you&apos;re ready. Cancel anytime.
          </p>
        </div>

        {/* Plans */}
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 ${
                plan.highlighted
                  ? "bg-brand-600 text-white shadow-xl shadow-brand-600/20 ring-2 ring-brand-600"
                  : "bg-white border border-gray-200 shadow-sm"
              }`}
            >
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p
                className={`mt-1 text-sm ${
                  plan.highlighted ? "text-brand-200" : "text-gray-500"
                }`}
              >
                {plan.description}
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                <span
                  className={`text-sm ${
                    plan.highlighted ? "text-brand-200" : "text-gray-500"
                  }`}
                >
                  {plan.period}
                </span>
              </div>

              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check
                      size={18}
                      className={`mt-0.5 flex-shrink-0 ${
                        plan.highlighted ? "text-brand-200" : "text-brand-600"
                      }`}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#download"
                className={`mt-8 block w-full rounded-full py-3 text-center text-sm font-semibold transition-colors ${
                  plan.highlighted
                    ? "bg-white text-brand-700 hover:bg-brand-50"
                    : "bg-brand-600 text-white hover:bg-brand-700"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
