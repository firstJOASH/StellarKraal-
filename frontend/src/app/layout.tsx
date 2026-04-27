import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StellarKraal — Livestock Micro-Lending",
  description: "Livestock-backed micro-lending on Stellar/Soroban",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-cream text-brown min-h-screen">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-brown focus:text-cream focus:rounded-lg focus:font-semibold"
        >
          Skip to content
        </a>
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
