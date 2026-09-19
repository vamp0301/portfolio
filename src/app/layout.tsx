import type { Metadata } from "next";
import { Syne, Manrope, JetBrains_Mono, Caveat } from "next/font/google";
import "./globals.css";

const syne = Syne({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-syne" });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-manrope" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-jetbrains" });
const caveat = Caveat({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-caveat" });

export const metadata: Metadata = {
  title: "Gauransh Agarwal — Backend Engineer · Full-Stack Builder · Prompt Engineer",
  description:
    "A guided tour through the systems Gauransh builds: data pipelines, multi-tenant SaaS, secure APIs, and RAG-powered AI workflows.",
  openGraph: {
    title: "Gauransh Agarwal — Interactive Engineering Portfolio",
    description: "I build the systems people don't see.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scene="hero" className={`${syne.variable} ${manrope.variable} ${jetbrains.variable} ${caveat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
