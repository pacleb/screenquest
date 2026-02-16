import { Clock, Target, Trophy, Shield, Bell, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Real-World Quests",
    description:
      "Create custom quests like reading, homework, chores, or outdoor play. Kids complete them to earn screen time.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Clock,
    title: "Time Bank",
    description:
      "Earned minutes go straight into a time bank. Kids spend from their balance — no more endless negotiations.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: Trophy,
    title: "Gamification & Rewards",
    description:
      "Levels, streaks, badges, and XP keep kids motivated. Celebrate achievements with the whole family.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Shield,
    title: "COPPA Compliant & Safe",
    description:
      "Built from the ground up for children's privacy. No ads, no tracking, no data selling. Ever.",
    color: "bg-green-50 text-green-600",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description:
      "Parents get notified when quests are completed. Kids get reminders for daily goals. Everyone stays in the loop.",
    color: "bg-rose-50 text-rose-600",
  },
  {
    icon: BarChart3,
    title: "Family Dashboard",
    description:
      "See screen time trends, quest completion rates, and streak progress. Understand your family's habits at a glance.",
    color: "bg-indigo-50 text-indigo-600",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 mb-3">
            Features
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything your family needs
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            A complete toolkit to turn screen time from a battle into a bonding
            experience.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-gray-100 bg-white p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}
              >
                <feature.icon size={24} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
