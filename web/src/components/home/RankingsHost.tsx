"use client";

import { RankingsDialog } from "@/components/home/RankingsDialog";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface RankingsContextValue {
  openRankings: () => void;
}

const RankingsContext = createContext<RankingsContextValue | null>(null);

export function useRankings() {
  const context = useContext(RankingsContext);
  if (!context) {
    throw new Error("useRankings must be used within RankingsHost");
  }
  return context;
}

export function RankingsHost({
  children,
  lists,
}: {
  children: ReactNode;
  lists: ReactNode;
}) {
  const { status, isAuthed } = useAuth();
  const { openLogin } = useAuthModal();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("rankings") === "1";
  const [manualOpen, setManualOpen] = useState(false);
  const open = manualOpen || (fromQuery && isAuthed);

  const close = useCallback(() => {
    setManualOpen(false);
    if (fromQuery) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("rankings");
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    }
  }, [fromQuery, router, searchParams]);

  const openRankings = useCallback(() => {
    setManualOpen(true);
  }, []);

  useEffect(() => {
    if (!fromQuery || status !== "guest") return;
    const qs = searchParams.toString();
    openLogin(qs ? `/?${qs}` : "/?rankings=1");
  }, [fromQuery, openLogin, searchParams, status]);

  const value = useMemo(() => ({ openRankings }), [openRankings]);

  return (
    <RankingsContext.Provider value={value}>
      {children}
      <RankingsDialog open={open} onClose={close}>{lists}</RankingsDialog>
    </RankingsContext.Provider>
  );
}
