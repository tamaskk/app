import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

// Italic serif used for accent words in the landing-page headlines
// ("intelligently", "thoughtfully designed", etc.). Exposed as a CSS
// variable so we can mix it inline with Tailwind utilities.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "HEFTOR — Pure Training Pro",
  description:
    "Adaptive strength training that learns from every set. Track your progression, climb the ranks, train smarter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="hu"
      className={`${inter.variable} ${instrumentSerif.variable} ${inter.className} h-full`}
    >
      <body className="min-h-full bg-black text-[#e5e2e1] flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}
