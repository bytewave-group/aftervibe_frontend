"use client";

import { BottomNav } from "@/components/layout/BottomNav";
import { HomeTabProvider } from "@/components/layout/HomeTabProvider";
import { NavDirectionProvider } from "@/components/navigation/NavDirectionProvider";
import { PageTransition } from "@/components/navigation/PageTransition";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

const HOME_SCROLL_PAD =
  "pb-[calc(104px+max(20px,env(safe-area-inset-bottom))+24px)]";
const PAGE_PAD = "pb-[max(20px,env(safe-area-inset-bottom))]";

function ShellFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center bg-black">
      <div
        className="relative flex h-dvh w-full max-w-[440px] flex-col overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(0, 0, 0, 0.15) 0%, rgba(208, 31, 37, 0.15) 100%), linear-gradient(90deg, #000 0%, #000 100%)",
        }}
      >
        <div className="pointer-events-none absolute top-[156px] left-1/2 size-[441px] -translate-x-1/2 opacity-25">
          <Image
            src="/images/bg-glow.png"
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
  const pathname = usePathname();
  const showNav = pathname === "/";

  return (
    <HomeTabProvider>
      <NavDirectionProvider>
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
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <main
      className={`relative z-10 min-h-0 flex-1 overflow-x-hidden overflow-y-auto ${isHome ? HOME_SCROLL_PAD : "pb-6"}`}
    >
      {children}
    </main>
  );
}
