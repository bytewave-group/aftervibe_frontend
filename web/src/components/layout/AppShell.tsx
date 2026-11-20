"use client";

import { BottomNav } from "@/components/layout/BottomNav";
import { HomeTabProvider } from "@/components/layout/HomeTabProvider";
import { NavDirectionProvider } from "@/components/navigation/NavDirectionProvider";
import { PageTransition } from "@/components/navigation/PageTransition";
import { canonicalPath } from "@/components/navigation/nav-direction";
import { FIGMA_SHELL_BG, FIGMA_SOLID_PAGE_BG, isSolidPageBg } from "@/lib/figma-backgrounds";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

const HOME_SCROLL_PAD =
  "pb-[calc(104px+env(safe-area-inset-bottom)+16px)]";
const PAGE_PAD = "pb-[max(20px,env(safe-area-inset-bottom))]";

function ShellFrame({ children }: { children: ReactNode }) {
  return (
    // Pinned to the viewport (fixed inset-0, no document scroll/rubber-band), so the bottom tab bar stays
    // on the bottom edge in iOS Safari as its toolbar shows/hides; only PageMain scrolls.
    <div className="fixed inset-0 flex justify-center overflow-hidden overscroll-none bg-black">
      <div
        className="relative flex h-full w-full max-w-[440px] flex-col overflow-hidden"
        style={{
          backgroundImage: FIGMA_SHELL_BG,
        }}
      >
        <div className="pointer-events-none absolute top-[156px] left-1/2 size-[441px] -translate-x-1/2 opacity-25">
          <Image
            src="/images/bg-glow.webp"
            alt=""
            fill
            sizes="441px"
            className="object-cover"
            priority
          />
        </div>
        {children}
      </div>
    </div>
  );
}

function ShellContent({ children }: { children: ReactNode }) {
  const pathname = canonicalPath(usePathname() ?? "/");
  const showNav = pathname === "/";
  const solidBg = isSolidPageBg(pathname);

  return (
    <HomeTabProvider>
      <NavDirectionProvider>
        {solidBg ? (
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{ background: FIGMA_SOLID_PAGE_BG }}
            aria-hidden="true"
          />
        ) : null}
        <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          <PageTransition>
            <div
              className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden ${showNav ? "" : PAGE_PAD}`}
            >
              {children}
              {showNav ? <BottomNav /> : null}
            </div>
          </PageTransition>
        </div>
      </NavDirectionProvider>
    </HomeTabProvider>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ShellFrame>
      <Suspense
        fallback={
          <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        }
      >
        <ShellContent>{children}</ShellContent>
      </Suspense>
    </ShellFrame>
  );
}

export function PageMain({ children }: { children: ReactNode }) {
  const pathname = canonicalPath(usePathname() ?? "/");
  const isHome = pathname === "/";

  return (
    <main
      className={`relative z-10 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain ${isHome ? HOME_SCROLL_PAD : "pb-6"}`}
    >
      {children}
    </main>
  );
}
