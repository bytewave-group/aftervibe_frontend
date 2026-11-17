"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type HomeTab = "home" | "me";

interface HomeTabContextValue {
  tab: HomeTab;
  setTab: (tab: HomeTab) => void;
}

const HomeTabContext = createContext<HomeTabContextValue | null>(null);

export function tabFromSearch(search: string): HomeTab {
  const value = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(value).get("tab") === "me" ? "me" : "home";
}

export function urlForTab(tab: HomeTab, currentSearch = ""): string {
  const params = new URLSearchParams(
    currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch,
  );
  if (tab === "me") {
    params.set("tab", "me");
  } else {
    params.delete("tab");
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export function useHomeTab(): HomeTabContextValue {
  const context = useContext(HomeTabContext);
  return context ?? { tab: "home", setTab: () => undefined };
}

export function HomeTabProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const { openLogin } = useAuthModal();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const urlTab: HomeTab = searchParams.get("tab") === "me" ? "me" : "home";

  const [localTab, setLocalTab] = useState<HomeTab | null>(null);
  const [prevSearch, setPrevSearch] = useState(searchKey);
  if (searchKey !== prevSearch) {
    setPrevSearch(searchKey);
    setLocalTab(null);
  }

  const tab = localTab ?? urlTab;

  const setTab = useCallback((next: HomeTab) => {
    setLocalTab(next);
    const url = urlForTab(next, window.location.search);
    const current = `${window.location.pathname}${window.location.search}`;
    if (url !== current) {
      window.history.pushState(window.history.state, "", url);
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      setLocalTab(tabFromSearch(window.location.search));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (tab !== "me" || status !== "guest") return;
    openLogin("/?tab=me");
  }, [openLogin, status, tab]);

  const value = useMemo(() => ({ tab, setTab }), [tab, setTab]);

  return <HomeTabContext.Provider value={value}>{children}</HomeTabContext.Provider>;
}
