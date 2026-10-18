import type { Metadata, Viewport } from "next";
import "@fontsource-variable/raleway";
import "./globals.css";
import { BRAND } from "@config/brand";

export const metadata: Metadata = {
  title: BRAND.productName,
  description: "Find, vet and rank creators.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
