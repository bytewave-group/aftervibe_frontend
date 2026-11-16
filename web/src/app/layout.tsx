import { AuthModalProvider } from "@/components/auth/AuthModalProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
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

export const metadata: Metadata = {
  title: "VOXX",
  description: "VOXX Club",
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
      className={`${notoSansSC.variable} h-full antialiased`}
    >
      <body className={`${notoSansSC.className} min-h-full bg-black text-white`}>
        <LocaleProvider>
          <AuthProvider>
            <AuthModalProvider>{children}</AuthModalProvider>
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
