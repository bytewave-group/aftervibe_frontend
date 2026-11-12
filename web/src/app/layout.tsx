import { AuthModalProvider } from "@/components/auth/AuthModalProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { LocaleProvider } from "@/i18n/locale-provider";
import { defaultLocale, localeHtmlLang } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { getT } from "@/i18n/get-locale";
import { hasCustomerSession } from "@/lib/auth/session";
import type { Metadata, Viewport } from "next";
import { Noto_Sans_SC } from "next/font/google";
import { Suspense, type ReactNode } from "react";
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

function Providers({
  locale,
  messages,
  isAuthed,
  children,
}: {
  locale: "zh" | "en";
  messages: ReturnType<typeof getMessages>;
  isAuthed: boolean;
  children: ReactNode;
}) {
  return (
    <LocaleProvider locale={locale} messages={messages}>
      <AuthProvider isAuthed={isAuthed}>
        <AuthModalProvider>{children}</AuthModalProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}

async function LocaleRoot({ children }: { children: ReactNode }) {
  const { locale, messages } = await getT();
  const isAuthed = await hasCustomerSession();
  return (
    <Providers locale={locale} messages={messages} isAuthed={isAuthed}>
      {children}
    </Providers>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={localeHtmlLang[defaultLocale]}
      className={`${notoSansSC.variable} h-full antialiased`}
    >
      <body className={`${notoSansSC.className} min-h-full bg-black text-white`}>
        {/* Keep a static provider shell so prerendered page segments (e.g.
            /?auth=login after a guest redirect) can call useLocale/useAuth
            even while async LocaleRoot is still resolving. */}
        <Providers
          locale={defaultLocale}
          messages={getMessages(defaultLocale)}
          isAuthed={false}
        >
          <Suspense fallback={children}>
            <LocaleRoot>{children}</LocaleRoot>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
