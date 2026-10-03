import type { Metadata } from "next";
import { Caveat, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-caveat-src",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://migimo.id"),
  alternates: { canonical: "/" },
  title: "Migimo - Mudah dan Untung",
  description:
    "Kirim uang ke Indonesia semudah chat. Bayar dengan QRIS Cross Border, dan separuh keuntungan kiriman kembali ke kamu.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${caveat.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
