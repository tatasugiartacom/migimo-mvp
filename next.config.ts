import type { NextConfig } from "next";

// Pengalihan SEMENTARA (302) untuk alamat lama migimo.id yang sudah terindeks Google.
// Hapus satu per satu setelah halamannya dibuat ulang di alamat yang sama.
const ALAMAT_LAMA = [
  "/legalitas",
  "/faq-migimo",
  "/company-profile",
  "/unduh-aplikasi",
  "/post/:slug*",
  "/blog/:slug*",
  "/blog",
  "/category/:slug*",
  "/tag/:slug*",
];

const nextConfig: NextConfig = {
  async redirects() {
    return ALAMAT_LAMA.map((source) => ({ source, destination: "/", permanent: false }));
  },
};

export default nextConfig;
