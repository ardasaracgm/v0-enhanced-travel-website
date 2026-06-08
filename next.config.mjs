import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["*.app.github.dev", "localhost:3000", "localhost:3001"],
    },
  },

  // Vize .docx şablonu binary'i — Vercel serverless trace'i .ts import'undan
  // göremez; admin docx route'una açıkça dahil et (yoksa prod'da readFile patlar).
  // NOT: key glob olarak eşlenir → literal "[id]" bracket'i karakter-sınıfı sayılır
  // ve eşleşmez. "**" tüm alt-yolu (slash dahil [id]/docx) yakalar → güvenli.
  outputFileTracingIncludes: {
    "/api/admin/visa/**": ["./lib/visa/docx/templates/kapi-vizesi-form.docx"],
  },

  // ignoreBuildErrors stays OFF; if a real type error appears in this
  // kademe we want the build to fail loudly, not ship a broken locale.
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
