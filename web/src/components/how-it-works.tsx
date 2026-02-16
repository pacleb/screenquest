import { ClipboardList, Camera, Timer } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: ClipboardList,
    title: "Create Quests",
    description:
      "Parents set up quests with clear goals and time rewards. Pick from the quest library or create your own.",
    color: "from-blue-500 to-indigo-600",
  },
  {
    step: "02",
    icon: Camera,
    title: "Kids Complete & Prove",
    description:
      "Children complete quests in the real world and submit photo proof. Parents approve with one tap.",
    color: "from-purple-500 to-pink-600",
  },
  {
    step: "03",
    icon: Timer,
    title: "Earn & Play",
    description:
      "Approved quests add minutes to the Time Bank. Kids start a play session and the timer counts down fairly.",
    color: "from-amber-500 to-orange-600",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 mb-3">
            How It Works
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple for parents. Fun for kids.
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Three easy steps — that&apos;s all it takes. No complicated setup,
            no steep learning curve.
          </p>
        </div>

        {/* Steps */}
        <div className="grid gap-12 md:grid-cols-3 md:gap-8">
          {steps.map((item, i) => (
            <div key={item.step} className="relative text-center">
              {/* Connector line (desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-gray-300 to-transparent" />
              )}

              {/* Icon */}
              <div
                className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br ${item.color} text-white shadow-lg`}
              >
                <item.icon size={36} />
              </div>

              {/* Step number */}
              <div className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                Step {item.step}
              </div>

              <h3 className="text-xl font-bold mb-3">{item.title}</h3>
              <p className="text-gray-600 leading-relaxed max-w-xs mx-auto">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
