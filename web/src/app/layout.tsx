import { AuthModalProvider } from "@/components/auth/AuthModalProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { LegacyTenantLink } from "@/components/navigation/LegacyTenantLink";
import { LocaleProvider } from "@/i18n/locale-provider";
import { defaultLocale, localeHtmlLang } from "@/i18n/config";
import type { Metadata, Viewport } from "next";
import { Noto_Sans_SC } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const SITE_TITLE = "VOXX Club";
const SITE_DESCRIPTION = "VOXX 以动感音乐、绚丽灯光与热烈氛围，点亮你的夜晚。";

export const metadata: Metadata = {
  metadataBase: new URL("https://voxxclub.vip"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_TITLE,
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: SITE_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/images/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang={localeHtmlLang[defaultLocale]}
      className={`${notoSansSC.variable} h-full overscroll-none antialiased`}
    >
      <body className={`${notoSansSC.className} min-h-full overscroll-none bg-black text-white`}>
        <LegacyTenantLink />
        <LocaleProvider>
          <AuthProvider>
            <AuthModalProvider>{children}</AuthModalProvider>
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
