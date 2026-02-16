import Image from "next/image";

const screenshots = [
  { src: "/screenshots/sq1.png", alt: "Quest Dashboard" },
  { src: "/screenshots/sq2.png", alt: "Quest Details" },
  { src: "/screenshots/sq3.png", alt: "Time Bank" },
  { src: "/screenshots/sq4.png", alt: "Play Timer" },
  { src: "/screenshots/sq5.png", alt: "Achievements" },
];

export function Screenshots() {
  return (
    <section
      id="screenshots"
      className="py-20 md:py-28 bg-gray-50 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 mb-3">
            Screenshots
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            See it in action
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            A beautiful, kid-friendly interface that the whole family will love.
          </p>
        </div>

        {/* Screenshot carousel */}
        <div className="flex gap-6 justify-center flex-wrap">
          {screenshots.map((shot) => (
            <div
              key={shot.alt}
              className="relative w-[220px] h-[440px] rounded-[2rem] overflow-hidden shadow-xl border-4 border-gray-800 bg-gray-900 flex-shrink-0"
            >
              <Image
                src={shot.src}
                alt={shot.alt}
                fill
                className="object-cover"
                sizes="220px"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
