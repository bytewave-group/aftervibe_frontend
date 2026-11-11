"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { inferTransitionTypes, NAV_BACK, NAV_FORWARD, pathOf } from "./nav-direction";

type NavDirectionContextValue = {
  setNavDirection: (direction: string) => void;
  peek: () => string;
};

const NavDirectionContext = createContext<NavDirectionContextValue | null>(null);

export function useNavDirection(): NavDirectionContextValue {
  const context = useContext(NavDirectionContext);
  return (
    context ?? {
      setNavDirection: () => undefined,
      peek: () => NAV_FORWARD,
    }
  );
}

/**
 * Direction flag for the snapshot page-slide. Set from link clicks before
 * the route changes, and from browser back/forward (popstate / Navigation API).
 */
export function NavDirectionProvider({ children }: { children: ReactNode }) {
  const dirRef = useRef(NAV_FORWARD);

  const setNavDirection = useCallback((direction: string) => {
    dirRef.current = direction === NAV_BACK ? NAV_BACK : NAV_FORWARD;
  }, []);

  const peek = useCallback(() => dirRef.current, []);

  useEffect(() => {
    const onPopState = () => {
      dirRef.current = NAV_BACK;
    };

    const navigation = (
      window as Window & {
        navigation?: {
          addEventListener: (
            type: "navigate",
            listener: (event: {
              navigationType?: string;
              destination?: { url?: string };
            }) => void,
          ) => void;
          removeEventListener: (
            type: "navigate",
            listener: (event: {
              navigationType?: string;
              destination?: { url?: string };
            }) => void,
          ) => void;
        };
      }
    ).navigation;

    const onNavigate = (event: {
      navigationType?: string;
      destination?: { url?: string };
    }) => {
      if (event.navigationType !== "traverse") return;
      const dest = event.destination?.url;
      if (!dest) {
        dirRef.current = NAV_BACK;
        return;
      }
      const types = inferTransitionTypes(pathOf(window.location.href), dest);
      dirRef.current = types?.[0] === NAV_FORWARD ? NAV_FORWARD : NAV_BACK;
    };

    if (navigation) {
      navigation.addEventListener("navigate", onNavigate);
    } else {
      window.addEventListener("popstate", onPopState);
    }

    return () => {
      if (navigation) {
        navigation.removeEventListener("navigate", onNavigate);
      } else {
        window.removeEventListener("popstate", onPopState);
      }
    };
  }, []);

  const value = useMemo(() => ({ setNavDirection, peek }), [setNavDirection, peek]);

  return (
    <NavDirectionContext.Provider value={value}>{children}</NavDirectionContext.Provider>
  );
}
