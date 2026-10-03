import type { MetadataRoute } from "next";

// Daftar ini wajib memuat semua URL lama migimo.id yang dipertahankan sebelum domain dipindahkan.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://migimo.id/", changeFrequency: "weekly", priority: 1 }];
}
