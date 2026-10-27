import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

const description =
  "Paste a Ghana MoMo, SMS, or WhatsApp message. ScamCheck GH says if it looks like a scam, shows the proof, and lists the numbers to call.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:4317"),
  title: {
    default: "ScamCheck GH — Check before you send",
    template: "%s — ScamCheck GH",
  },
  description,
  applicationName: "ScamCheck GH",
  authors: [{ name: "ScamCheck GH" }],
  keywords: ["Ghana", "MoMo", "scam", "mobile money", "SMS", "WhatsApp", "MTN"],
  openGraph: {
    title: "ScamCheck GH — Check before you send",
    description,
    type: "website",
    locale: "en_GH",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ScamCheck GH. Check before you send." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ScamCheck GH — Check before you send",
    description,
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0C0E" },
  ],
};

const themeBoot = `
try {
  var q = new URLSearchParams(location.search).get("theme");
  var saved = q || localStorage.getItem("sc-theme") || localStorage.getItem("scamcheck-theme");
  if (saved === "light" || saved === "dark") document.documentElement.setAttribute("data-theme", saved);
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script id="theme-boot" strategy="beforeInteractive">
          {themeBoot}
        </Script>
        {children}
      </body>
    </html>
  );
}
