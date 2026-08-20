import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "noise.nyc — how loud is your block?",
    template: "%s · noise.nyc",
  },
  description:
    "A crowd-sourced map of apartment noise in New York City. Rate your place in 30 seconds — no typing — and see how every block sounds at night.",
  openGraph: {
    title: "noise.nyc — how loud is your block?",
    description:
      "Rate your apartment's noise in 30 seconds and unlock the map of how NYC sounds at night.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#12131f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
