import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah M.",
    role: "Mom of 3",
    quote:
      "ScreenQuest completely changed our mornings. My kids actually WANT to do their chores now so they can earn play time. No more fights!",
    stars: 5,
  },
  {
    name: "David L.",
    role: "Dad of 2",
    quote:
      "Finally an app that teaches responsibility instead of just blocking everything. My daughter loves checking off her quests.",
    stars: 5,
  },
  {
    name: "Jessica R.",
    role: "Mom of 1",
    quote:
      "The photo proof feature is genius. I can see what my son accomplished even when I'm at work. And he's so proud to show it!",
    stars: 5,
  },
];

export function Testimonials() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 mb-3">
            Testimonials
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by families everywhere
          </h2>
        </div>

        {/* Cards */}
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm"
            >
              <div className="flex gap-0.5 mb-4">
                {[...Array(t.stars)].map((_, i) => (
                  <Star
                    key={i}
                    size={18}
                    className="fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <blockquote className="text-gray-700 leading-relaxed mb-6">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div>
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-gray-500">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
