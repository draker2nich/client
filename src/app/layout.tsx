import type { Metadata } from "next";
import { Raleway, Playfair_Display } from "next/font/google";
import "./globals.css";

const raleway = Raleway({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  weight: ["200", "300", "400", "500"],
});

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "AI Fashion Designer",
  description: "Design clothes with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${raleway.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body className="font-[var(--font-body)] antialiased bg-[#09090b] text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}