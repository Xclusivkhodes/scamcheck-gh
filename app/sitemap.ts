import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:4317";
  return [
    "",
    "/about",
    "/privacy",
    "/disclaimer",
    "/radar",
    "/family",
    "/whatsapp",
    "/share",
    "/shield",
    "/digest",
    "/ussd",
  ].map((path) => ({
    url: `${base}${path || "/"}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
