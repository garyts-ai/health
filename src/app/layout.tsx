import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Geist_Mono, Manrope } from "next/font/google";
import "./training-os-tokens.css";
import "./globals.css";
import "./district.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  weight: "variable",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "HealthMaxer — Neon Training District",
  description:
    "A private training and recovery dashboard that blends WHOOP and Hevy into daily decisions, interactive trends, and a portable context packet.",
  applicationName: "HealthMaxer",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HealthMaxer",
  },
  icons: {
    icon: "/health-os-icon.svg",
    apple: "/health-os-icon.svg",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#07070b",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${geistMono.variable} ${bigShoulders.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
