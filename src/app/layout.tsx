import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { brand } from "@/lib/brand";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["500", "600"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: brand.promise,
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = { themeColor: "#3550C4" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
