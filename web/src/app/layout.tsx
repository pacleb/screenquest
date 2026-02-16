import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScreenQuest – Turn Screen Time Into Family Time",
  description:
    "ScreenQuest helps families manage screen time through fun quests, rewards, and healthy habits. Available on iOS and Android.",
  keywords: [
    "screen time",
    "parental controls",
    "family app",
    "kids",
    "quests",
    "rewards",
  ],
  openGraph: {
    title: "ScreenQuest – Turn Screen Time Into Family Time",
    description:
      "Help your kids earn screen time by completing real-world quests. Build healthy habits as a family.",
    type: "website",
    locale: "en_US",
    siteName: "ScreenQuest",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScreenQuest – Turn Screen Time Into Family Time",
    description:
      "Help your kids earn screen time by completing real-world quests. Build healthy habits as a family.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased">
      <body className="bg-white text-gray-900 font-sans">{children}</body>
    </html>
  );
}
