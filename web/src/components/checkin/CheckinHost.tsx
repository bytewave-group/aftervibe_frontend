"use client";

import { CheckinDialog } from "@/components/checkin/CheckinDialog";
import { useAuth } from "@/components/auth/AuthProvider";
import { loginUrl } from "@/lib/auth/redirect";
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

interface CheckinContextValue {
  openCheckin: () => void;
}

const CheckinContext = createContext<CheckinContextValue | null>(null);

export function useCheckin() {
  const context = useContext(CheckinContext);
  if (!context) {
    throw new Error("useCheckin must be used within CheckinHost");
  }
  return context;
}

export function CheckinHost({ children }: { children: ReactNode }) {
  const { isAuthed } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("checkin") === "1";
  const [manualOpen, setManualOpen] = useState(false);
  const open = manualOpen || (fromQuery && isAuthed);

  const close = useCallback(() => {
    setManualOpen(false);
    if (fromQuery) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("checkin");
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    }
  }, [fromQuery, router, searchParams]);

  const openCheckin = useCallback(() => {
    setManualOpen(true);
  }, []);

  useEffect(() => {
    if (!fromQuery || isAuthed) return;
    router.replace(loginUrl("/?checkin=1"));
  }, [fromQuery, isAuthed, router]);

  const value = useMemo(() => ({ openCheckin }), [openCheckin]);

  return (
    <CheckinContext.Provider value={value}>
      {children}
      <CheckinDialog open={open} onClose={close} />
    </CheckinContext.Provider>
  );
}
