"use client";

import { BACK_HIT_COVER_STYLE } from "@/components/navigation/back-hit";
import { useTranslations } from "@/i18n/locale-provider";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  InstantNavContext,
  currentLocationKey,
  hrefKey,
  type InstantNavValue,
} from "./instant-nav";
import { canonicalPath, NAV_BACK, NAV_FORWARD, pathOf } from "./nav-direction";
import { useNavDirection } from "./NavDirectionProvider";
import { skeletonForPath } from "./PageSkeletons";

/**
 * iOS UINavigationController-style push/pop.
 *
 * The current page's React tree is never cloned at tap time. Two stacked
 * layers swap roles: the live tree stays in its current layer and only
 * transforms (outgoing); the other layer shows a skeleton, an idle-time
 * snapshot, or the new route once it commits. router.push (or router.back
 * on a completed edge swipe) runs in the same tick as the first frame.
 */
const PAGE_MS = 420;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const PARALLAX = 30;
/**
 * No dark overlay or edge shadow on push / pop / swipe-back: on the dark Voxx shell they read as a
 * "shadow" over the page (was DIM_MAX 0.12 + a visible .pt-shadow gradient). The slide itself stays.
 */
const DIM_MAX = 0;
const SHADOW_OPACITY = "0";
const EDGE_PX = 20;
const SAFETY_MS = 4000;
const SNAPSHOT_LIMIT = 8;
const LOCATION_POLL_MS = 50;
const COMPLETE_RATIO = 0.35;
const COMPLETE_VELOCITY = 0.45;

type Crumb = { path: string; key: string; href: string };

type Pending = {
  id: number;
  href: string;
  path: string;
  key: string;
  dir: string;
  originPath: string;
  originKey: string;
  originHref: string;
};

function prefersReduce(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function locationKeyFromHooks(pathname: string, search: string): string {
  const path = canonicalPath(pathname);
  return search ? `${path}?${search}` : path;
}

function hrefFromKey(key: string): string {
  return key || "/";
}

function lastCrumb(stack: Crumb[]): Crumb | null {
  return stack.length > 0 ? stack[stack.length - 1]! : null;
}

function syncScroll(fromEl: HTMLElement, toEl: HTMLElement) {
  if (fromEl.scrollTop) toEl.scrollTop = fromEl.scrollTop;
  if (fromEl.scrollLeft) toEl.scrollLeft = fromEl.scrollLeft;
  const fromNodes = fromEl.querySelectorAll<HTMLElement>("*");
  const toNodes = toEl.querySelectorAll<HTMLElement>("*");
  const n = Math.min(fromNodes.length, toNodes.length);
  for (let i = 0; i < n; i += 1) {
    const source = fromNodes[i];
    const dest = toNodes[i];
    if (!source || !dest) continue;
    if (source.scrollTop) dest.scrollTop = source.scrollTop;
    if (source.scrollLeft) dest.scrollLeft = source.scrollLeft;
  }
}

function clonePage(el: HTMLElement): HTMLElement {
  const clone = el.cloneNode(true) as HTMLElement;
  syncScroll(el, clone);
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("data-nav-snap", "1");
  clone.style.height = "100%";
  clone.style.width = "100%";
  clone.style.pointerEvents = "none";
  return clone;
}

function setX(el: HTMLElement | null, percent: number) {
  if (!el) return;
  el.style.transform = `translate3d(${percent}%,0,0)`;
}

function setXpx(el: HTMLElement | null, px: number) {
  if (!el) return;
  el.style.transform = `translate3d(${px}px,0,0)`;
}

/**
 * Layers are transparent (the shell background shows through), so the lower page would ghost through the
 * page sliding over it. Clip the lower layer to the strip left of the upper layer's edge:
 * hidden width (from its right) = 100% + lowerX% - upperX%.
 */
function clipRightPercent(lowerPercent: number, upperPercent: number): number {
  return Math.max(0, Math.min(100, 100 + lowerPercent - upperPercent));
}

function clipInset(rightPercent: number): string {
  return `inset(0 ${rightPercent}% 0 0)`;
}

function setClipRight(el: HTMLElement | null, rightPercent: number | null) {
  if (!el) return;
  el.style.clipPath = rightPercent == null ? "" : clipInset(rightPercent);
}

function setDim(el: HTMLElement | null, opacity: number) {
  if (!el) return;
  el.style.opacity = String(Math.max(0, Math.min(1, opacity)));
}

function scheduleIdle(fn: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(() => fn(), { timeout: 600 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, 120);
  return () => window.clearTimeout(id);
}

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = canonicalPath(usePathname() ?? "/");
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const hookKey = locationKeyFromHooks(pathname, search);
  const router = useRouter();
  const { peek, setNavDirection } = useNavDirection();
  const t = useTranslations();

  const stageRef = useRef<HTMLDivElement>(null);
  const layerARef = useRef<HTMLDivElement>(null);
  const layerBRef = useRef<HTMLDivElement>(null);
  const coverARef = useRef<HTMLDivElement>(null);
  const coverBRef = useRef<HTMLDivElement>(null);
  const shadowARef = useRef<HTMLDivElement>(null);
  const shadowBRef = useRef<HTMLDivElement>(null);
  const liveARef = useRef<HTMLDivElement>(null);
  const liveBRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);

  const snapshots = useRef<Map<string, HTMLElement>>(new Map());
  const prevPathRef = useRef(pathname);
  const prevKeyRef = useRef(hookKey);
  const pendingRef = useRef<Pending | null>(null);
  const originRef = useRef<Crumb | null>(null);
  const stackRef = useRef<Crumb[]>([]);
  const animatingRef = useRef(false);
  const animationsRef = useRef<Animation[]>([]);
  const idRef = useRef(0);
  const arrivedRef = useRef(false);
  const recentPushRef = useRef<{ key: string; at: number } | null>(null);
  const swipeRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastT: number;
    velocity: number;
    width: number;
    active: boolean;
  } | null>(null);
  const idleCancelRef = useRef<(() => void) | null>(null);
  const childrenRef = useRef<ReactNode>(children);
  const frontIsARef = useRef(true);
  const revertToKeyRef = useRef<string | null>(null);

  const [pending, setPending] = useState<Pending | null>(null);
  const [frontIsA, setFrontIsA] = useState(true);
  const [blocking, setBlocking] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [revertTo, setRevertTo] = useState<string | null>(null);
  const [parked, setParked] = useState<ReactNode>(null);

  useLayoutEffect(() => {
    childrenRef.current = children;
  });

  const arrived = pending != null && hookKey === pending.key;
  const holding = revertTo != null && hookKey !== revertTo;

  const frontLayer = () => (frontIsARef.current ? layerARef.current : layerBRef.current);
  const backLayer = () => (frontIsARef.current ? layerBRef.current : layerARef.current);
  const frontCover = () => (frontIsARef.current ? coverARef.current : coverBRef.current);
  const backCover = () => (frontIsARef.current ? coverBRef.current : coverARef.current);
  const frontShadow = () => (frontIsARef.current ? shadowARef.current : shadowBRef.current);
  const backShadow = () => (frontIsARef.current ? shadowBRef.current : shadowARef.current);
  const frontLive = () => (frontIsARef.current ? liveARef.current : liveBRef.current);

  const parkSnap = useCallback((node: HTMLElement | null) => {
    if (!node || !node.parentElement) return;
    if (coverARef.current?.contains(node) || coverBRef.current?.contains(node)) return;
    node.remove();
  }, []);

  const putSnapshot = useCallback(
    (key: string, node: HTMLElement) => {
      const map = snapshots.current;
      const prev = map.get(key);
      if (prev && prev !== node) parkSnap(prev);
      map.delete(key);
      map.set(key, node);
      while (map.size > SNAPSHOT_LIMIT) {
        const first = map.keys().next().value;
        if (!first) break;
        const stale = map.get(first);
        if (stale && stale !== node) parkSnap(stale);
        map.delete(first);
      }
    },
    [parkSnap],
  );

  const attachTo = useCallback((host: HTMLElement | null, node: HTMLElement | null) => {
    if (!host) return;
    host.replaceChildren();
    if (node) host.appendChild(node);
  }, []);

  const snapshotFor = useCallback((key: string, path: string) => {
    return snapshots.current.get(key) ?? snapshots.current.get(path) ?? null;
  }, []);

  const scheduleCapture = useCallback(
    (key: string, path: string) => {
      idleCancelRef.current?.();
      idleCancelRef.current = scheduleIdle(() => {
        idleCancelRef.current = null;
        if (pendingRef.current || animatingRef.current || swipeRef.current?.active) return;
        if (currentLocationKey() !== key && currentLocationKey().split("?")[0] !== path) return;
        const live = frontLive();
        if (!live) return;
        const snap = clonePage(live);
        putSnapshot(key, snap);
        if (path !== key) snapshots.current.set(path, snap);
      });
    },
    [putSnapshot],
  );

  const clearAnimations = useCallback(() => {
    for (const animation of animationsRef.current) {
      try {
        animation.cancel();
      } catch {
        /* ignore */
      }
    }
    animationsRef.current = [];
    animatingRef.current = false;
  }, []);

  const clearCovers = useCallback(() => {
    attachTo(coverARef.current, null);
    attachTo(coverBRef.current, null);
  }, [attachTo]);

  const applySettled = useCallback(() => {
    const reset = (el: HTMLElement | null) => {
      if (!el) return;
      for (const animation of el.getAnimations()) {
        try {
          animation.cancel();
        } catch {
          /* ignore */
        }
      }
      el.style.transform = "none";
      el.style.clipPath = "";
      el.style.opacity = "1";
      el.style.zIndex = "";
      el.style.pointerEvents = "";
      el.style.visibility = "";
    };
    reset(layerARef.current);
    reset(layerBRef.current);
    const dim = dimRef.current;
    if (dim) {
      for (const animation of dim.getAnimations()) {
        try {
          animation.cancel();
        } catch {
          /* ignore */
        }
      }
      dim.style.opacity = "0";
      dim.style.visibility = "";
      dim.style.pointerEvents = "none";
    }
    if (shadowARef.current) shadowARef.current.style.opacity = "0";
    if (shadowBRef.current) shadowBRef.current.style.opacity = "0";
    const stage = stageRef.current;
    if (stage && !pendingRef.current) {
      stage.removeAttribute("data-nav-pending");
      stage.removeAttribute("data-ios-nav");
    }
  }, []);

  useLayoutEffect(() => {
    if (!pendingRef.current) applySettled();
  }, [applySettled, frontIsA]);

  const finishPending = useCallback(
    (
      nextPath = pathOf(typeof window === "undefined" ? "/" : window.location.href),
      mode: "commit" | "revert" = "commit",
    ) => {
      clearAnimations();
      const nextKey = typeof window === "undefined" ? nextPath : currentLocationKey();
      const shouldSwap = mode === "commit" && pendingRef.current != null;
      pendingRef.current = null;
      arrivedRef.current = false;
      setPending(null);
      setBlocking(false);
      setShowSkeleton(false);
      clearCovers();

      if (shouldSwap) {
        frontIsARef.current = !frontIsARef.current;
        setFrontIsA(frontIsARef.current);
      }

      prevPathRef.current = nextPath;
      prevKeyRef.current = nextKey;
      applySettled();

      if (mode !== "revert") {
        revertToKeyRef.current = null;
        setRevertTo(null);
        setParked(null);
      }
      scheduleCapture(nextKey, nextPath);
    },
    [applySettled, clearAnimations, clearCovers, scheduleCapture],
  );

  const runSlide = useCallback(
    (opts: {
      dir: string;
      fromPercent: number;
      toPercent: number;
      underFrom: number;
      underTo: number;
      dimFrom: number;
      dimTo: number;
      onDone: () => void;
    }) => {
      const current = frontLayer();
      const under = backLayer();
      const dim = dimRef.current;
      const outgoingShadow = frontShadow();
      const incomingShadow = backShadow();
      if (!current) {
        opts.onDone();
        return;
      }
      setX(current, opts.fromPercent);
      setX(under, opts.underFrom);
      setDim(dim, opts.dimFrom);
      const isBack = opts.dir === NAV_BACK;
      if (outgoingShadow) outgoingShadow.style.opacity = isBack ? SHADOW_OPACITY : "0";
      if (incomingShadow) incomingShadow.style.opacity = isBack ? "0" : SHADOW_OPACITY;
      current.style.zIndex = isBack ? "3" : "1";
      if (under) {
        under.style.zIndex = isBack ? "1" : "3";
        under.style.visibility = "visible";
      }
      if (dim) dim.style.zIndex = "2";

      // The lower layer (outgoing on push, incoming on back) is clipped at the upper layer's edge so it
      // never shows through the transparent page sliding over it.
      const currentClip = isBack
        ? null
        : [clipRightPercent(opts.fromPercent, opts.underFrom), clipRightPercent(opts.toPercent, opts.underTo)];
      const underClip = isBack
        ? [clipRightPercent(opts.underFrom, opts.fromPercent), clipRightPercent(opts.underTo, opts.toPercent)]
        : null;
      setClipRight(current, currentClip ? currentClip[0] : null);
      setClipRight(under, underClip ? underClip[0] : null);

      const currentAnim = current.animate(
        [
          {
            transform: `translate3d(${opts.fromPercent}%,0,0)`,
            ...(currentClip ? { clipPath: clipInset(currentClip[0]) } : {}),
          },
          {
            transform: `translate3d(${opts.toPercent}%,0,0)`,
            ...(currentClip ? { clipPath: clipInset(currentClip[1]) } : {}),
          },
        ],
        { duration: PAGE_MS, easing: EASE, fill: "forwards" },
      );
      const underAnim = under
        ? under.animate(
            [
              {
                transform: `translate3d(${opts.underFrom}%,0,0)`,
                ...(underClip ? { clipPath: clipInset(underClip[0]) } : {}),
              },
              {
                transform: `translate3d(${opts.underTo}%,0,0)`,
                ...(underClip ? { clipPath: clipInset(underClip[1]) } : {}),
              },
            ],
            { duration: PAGE_MS, easing: EASE, fill: "forwards" },
          )
        : null;
      const dimAnim = dim
        ? dim.animate(
            [{ opacity: opts.dimFrom }, { opacity: opts.dimTo }],
            { duration: PAGE_MS, easing: EASE, fill: "forwards" },
          )
        : null;
      animationsRef.current = [currentAnim, underAnim, dimAnim].filter(Boolean) as Animation[];
      animatingRef.current = true;

      const done = () => {
        if (pendingRef.current && animationsRef.current[0] !== currentAnim) return;
        animatingRef.current = false;
        opts.onDone();
      };
      void Promise.all(animationsRef.current.map((a) => a.finished)).then(done, done);
    },
    [],
  );

  const begin = useCallback(
    (href: string, direction?: string) => {
      const destPath = pathOf(href);
      const destKey = hrefKey(href);
      const fromPath = prevPathRef.current;
      const fromKey = prevKeyRef.current;
      if (!destPath) return;

      const origin = originRef.current;
      if (pendingRef.current && origin && destKey === origin.key) {
        revertToKeyRef.current = origin.key;
        setRevertTo(origin.key);
        finishPending(origin.path, "revert");
        if (currentLocationKey() !== origin.key) {
          router.push(origin.href);
        }
        return;
      }

      if (destKey === fromKey && !pendingRef.current) return;

      const here = typeof window === "undefined" ? destKey : currentLocationKey();
      const alreadyThere = destKey === here;

      if (prefersReduce()) {
        if (!alreadyThere) {
          recentPushRef.current = { key: destKey, at: Date.now() };
          router.push(href);
        }
        return;
      }

      const dir =
        direction === NAV_BACK || direction === NAV_FORWARD
          ? direction
          : destPath === "/" && fromPath !== "/"
            ? NAV_BACK
            : NAV_FORWARD;
      setNavDirection(dir);

      const existing = pendingRef.current;
      if (existing && existing.key === destKey) {
        if (!alreadyThere) {
          recentPushRef.current = { key: destKey, at: Date.now() };
          router.push(href);
        }
        return;
      }

      // A mid-slide pointerup can hit a neighboring link once the outgoing
      // layer has translated (e.g. 转盘 → 商城). Keep the original destination.
      if (existing) {
        return;
      }

      const originCrumb: Crumb = {
        path: fromPath,
        key: fromKey,
        href: hrefFromKey(fromKey),
      };
      const next: Pending = {
        id: (idRef.current += 1),
        href,
        path: destPath,
        key: destKey,
        dir,
        originPath: fromPath,
        originKey: fromKey,
        originHref: hrefFromKey(fromKey),
      };
      arrivedRef.current = alreadyThere;
      pendingRef.current = next;
      originRef.current = originCrumb;
      setParked(childrenRef.current);
      revertToKeyRef.current = null;
      setRevertTo(null);

      const stage = stageRef.current;
      if (stage) {
        stage.setAttribute("data-nav-pending", destPath);
        stage.setAttribute("data-ios-nav", dir);
      }

      const incoming = snapshotFor(destKey, destPath);
      attachTo(frontCover(), null);
      attachTo(backCover(), incoming);

      const back = backLayer();
      if (back) back.style.visibility = "visible";
      const front = frontLayer();
      if (front) front.style.pointerEvents = "none";

      setShowSkeleton(!incoming);
      setBlocking(!alreadyThere);
      setPending(next);

      const afterSlide = (isBack: boolean) => {
        const pendingNow = pendingRef.current;
        const location = currentLocationKey();
        const urlArrived =
          arrivedRef.current ||
          (pendingNow != null &&
            (location === pendingNow.key || prevKeyRef.current === pendingNow.key));
        if (urlArrived) {
          if (isBack) {
            if (stackRef.current.length > 0) stackRef.current.pop();
            originRef.current = lastCrumb(stackRef.current);
          } else {
            stackRef.current.push(originCrumb);
            originRef.current = originCrumb;
          }
          finishPending(pendingNow?.path ?? pathOf(window.location.href), "commit");
          return;
        }
        arrivedRef.current = false;
        setBlocking(false);
      };

      if (dir === NAV_BACK) {
        runSlide({
          dir,
          fromPercent: 0,
          toPercent: 100,
          underFrom: -PARALLAX,
          underTo: 0,
          dimFrom: DIM_MAX,
          dimTo: 0,
          onDone: () => afterSlide(true),
        });
      } else {
        setX(front, 0);
        setX(back, 100);
        setDim(dimRef.current, 0);
        const incomingShadow = backShadow();
        if (incomingShadow) incomingShadow.style.opacity = SHADOW_OPACITY;
        runSlide({
          dir,
          fromPercent: 0,
          toPercent: -PARALLAX,
          underFrom: 100,
          underTo: 0,
          dimFrom: 0,
          dimTo: DIM_MAX,
          onDone: () => afterSlide(false),
        });
      }

      if (!alreadyThere) {
        recentPushRef.current = { key: destKey, at: Date.now() };
        router.push(href);
      }
    },
    [
      attachTo,
      finishPending,
      router,
      runSlide,
      setNavDirection,
      snapshotFor,
    ],
  );

  const cancel = useCallback(() => {
    if (!pendingRef.current) return;
    const origin = originRef.current;
    const key = origin?.key ?? prevKeyRef.current;
    revertToKeyRef.current = key;
    setRevertTo(key);
    finishPending(prevPathRef.current, "revert");
  }, [finishPending]);

  const goBack = useCallback(() => {
    const origin = originRef.current ?? lastCrumb(stackRef.current);
    const mid = pendingRef.current != null;
    if (mid) {
      const targetKey = origin?.key ?? "/";
      const targetHref = origin?.href ?? "/";
      const targetPath = origin?.path ?? "/";
      revertToKeyRef.current = targetKey;
      setRevertTo(targetKey);
      finishPending(targetPath, "revert");
      if (currentLocationKey() !== targetKey) {
        router.push(targetHref);
      }
      return;
    }
    const target = origin?.href ?? (pathname === "/" ? null : "/");
    if (!target) return;
    begin(target, NAV_BACK);
  }, [begin, finishPending, pathname, router]);

  const onLocationCommit = useCallback(
    (nextKey: string, nextPath: string) => {
      const pendingNow = pendingRef.current;
      const recent = recentPushRef.current;

      if (revertToKeyRef.current && nextKey === revertToKeyRef.current) {
        revertToKeyRef.current = null;
        setRevertTo(null);
        setParked(null);
        prevPathRef.current = nextPath;
        prevKeyRef.current = nextKey;
        applySettled();
        scheduleCapture(nextKey, nextPath);
        return;
      }

      if (pendingNow && nextKey === pendingNow.key) {
        arrivedRef.current = true;
        prevPathRef.current = nextPath;
        prevKeyRef.current = nextKey;
        if (!animatingRef.current) {
          if (pendingNow.dir === NAV_BACK) {
            if (stackRef.current.length > 0) stackRef.current.pop();
            originRef.current = lastCrumb(stackRef.current);
          } else {
            const crumb = {
              path: pendingNow.originPath,
              key: pendingNow.originKey,
              href: pendingNow.originHref,
            };
            stackRef.current.push(crumb);
            originRef.current = crumb;
          }
          finishPending(nextPath, "commit");
        } else {
          setBlocking(false);
          setShowSkeleton(false);
          attachTo(backCover(), null);
        }
        return;
      }

      if (pendingNow && nextKey !== pendingNow.key && nextKey !== pendingNow.originKey) {
        finishPending(nextPath, "commit");
        return;
      }

      if (!pendingNow && nextKey !== prevKeyRef.current) {
        if (nextPath === prevPathRef.current) {
          prevKeyRef.current = nextKey;
          scheduleCapture(nextKey, nextPath);
          return;
        }
        if (recent && recent.key === nextKey && Date.now() - recent.at < 8000) {
          recentPushRef.current = null;
          prevPathRef.current = nextPath;
          prevKeyRef.current = nextKey;
          scheduleCapture(nextKey, nextPath);
          return;
        }
        if (prefersReduce()) {
          prevPathRef.current = nextPath;
          prevKeyRef.current = nextKey;
          scheduleCapture(nextKey, nextPath);
          return;
        }
        const dir = peek() === NAV_BACK ? NAV_BACK : NAV_FORWARD;
        begin(nextKey, dir);
        prevPathRef.current = nextPath;
        prevKeyRef.current = nextKey;
      }
    },
    [applySettled, attachTo, begin, finishPending, peek, scheduleCapture],
  );

  useLayoutEffect(() => {
    if (hookKey === prevKeyRef.current && !pendingRef.current && !revertToKeyRef.current) return;
    onLocationCommit(hookKey, pathname);
  }, [hookKey, pathname, onLocationCommit]);

  useEffect(() => {
    if (!pending) return;
    const tick = () => {
      const key = currentLocationKey();
      if (key !== (pendingRef.current?.originKey ?? prevKeyRef.current)) {
        onLocationCommit(key, pathOf(window.location.href));
      }
    };
    tick();
    const poll = window.setInterval(tick, LOCATION_POLL_MS);
    const safety = window.setTimeout(() => {
      const pendingNow = pendingRef.current;
      if (pendingNow) {
        // Client navigation did not commit. A full load avoids staying on the
        // skeleton after a poisoned route cache, and does not snap back.
        window.location.assign(pendingNow.href);
        return;
      }
      finishPending(pathOf(window.location.href), "commit");
    }, SAFETY_MS);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(safety);
    };
  }, [pending, finishPending, onLocationCommit]);

  useEffect(() => {
    const onPop = () => {
      const dest = `${window.location.pathname}${window.location.search}`;
      setNavDirection(NAV_BACK);
      const pendingNow = pendingRef.current;
      if (pendingNow && (pendingNow.key === dest || pendingNow.dir === NAV_BACK)) {
        return;
      }
      begin(dest, NAV_BACK);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [begin, setNavDirection]);

  useEffect(() => {
    if (pending || animatingRef.current) return;
    scheduleCapture(hookKey, pathname);
  }, [pending, hookKey, pathname, scheduleCapture]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.setAttribute("data-nav-ready", "1");
    return () => {
      stage.removeAttribute("data-nav-ready");
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const api = {
      begin,
      cancel,
      goBack,
      getState: () => ({
        pendingPath: pendingRef.current?.path ?? null,
        pendingKey: pendingRef.current?.key ?? null,
        blocking,
        location: typeof window === "undefined" ? "" : currentLocationKey(),
      }),
    };
    (window as Window & { __instantNavTest?: typeof api }).__instantNavTest = api;
    return () => {
      delete (window as Window & { __instantNavTest?: typeof api }).__instantNavTest;
    };
  }, [begin, blocking, cancel, goBack]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const endSwipe = (complete: boolean) => {
      const swipe = swipeRef.current;
      swipeRef.current = null;
      if (!swipe?.active) return;
      const front = frontLayer();
      const under = backLayer();
      const dim = dimRef.current;
      const width = swipe.width || stage.getBoundingClientRect().width || 1;
      const dx = Math.max(0, swipe.lastX - swipe.startX);
      const progress = Math.min(1, dx / width);
      if (!complete) {
        runSlide({
          dir: NAV_BACK,
          fromPercent: progress * 100,
          toPercent: 0,
          underFrom: -PARALLAX + progress * PARALLAX,
          underTo: -PARALLAX,
          dimFrom: DIM_MAX * (1 - progress),
          dimTo: 0,
          onDone: () => {
            animatingRef.current = false;
            setX(front, 0);
            setX(under, -PARALLAX);
            setClipRight(front, null);
            setClipRight(under, null);
            setDim(dim, 0);
            if (front) front.style.pointerEvents = "";
            const shadow = frontShadow();
            if (shadow) shadow.style.opacity = "0";
            if (under) under.style.visibility = "";
            clearAnimations();
            attachTo(backCover(), null);
          },
        });
        return;
      }
      const origin =
        originRef.current ??
        lastCrumb(stackRef.current) ??
        (pathname === "/" ? null : { path: "/", key: "/", href: "/" });
      const target = origin?.href ?? "/";
      const destKey = origin?.key ?? "/";
      const destPath = origin?.path ?? "/";
      setParked(childrenRef.current);
      const next: Pending = {
        id: (idRef.current += 1),
        href: target,
        path: destPath,
        key: destKey,
        dir: NAV_BACK,
        originPath: prevPathRef.current,
        originKey: prevKeyRef.current,
        originHref: hrefFromKey(prevKeyRef.current),
      };
      pendingRef.current = next;
      arrivedRef.current = currentLocationKey() === destKey;
      originRef.current = origin;
      setPending(next);
      setBlocking(true);
      runSlide({
        dir: NAV_BACK,
        fromPercent: progress * 100,
        toPercent: 100,
        underFrom: -PARALLAX + progress * PARALLAX,
        underTo: 0,
        dimFrom: DIM_MAX * (1 - progress),
        dimTo: 0,
        onDone: () => {
          const pendingNow = pendingRef.current;
          const location = currentLocationKey();
          const urlArrived =
            arrivedRef.current || (pendingNow != null && location === pendingNow.key);
          if (urlArrived) {
            if (stackRef.current.length > 0) stackRef.current.pop();
            originRef.current = lastCrumb(stackRef.current);
            finishPending(pendingNow?.path ?? destPath, "commit");
            return;
          }
          setBlocking(false);
        },
      });
      if (currentLocationKey() !== destKey) {
        recentPushRef.current = { key: destKey, at: Date.now() };
        router.back();
      }
    };

    const onDown = (event: PointerEvent) => {
      if (prefersReduce()) return;
      if (event.button != null && event.button !== 0) return;
      if (swipeRef.current) return;
      const rect = stage.getBoundingClientRect();
      if (event.clientX - rect.left > EDGE_PX) return;
      const origin = originRef.current ?? lastCrumb(stackRef.current);
      const canPop = pendingRef.current != null || origin != null || pathname !== "/";
      if (!canPop) return;
      const target = event.target as Element | null;
      if (
        target?.closest(
          "a, button, input, textarea, select, [data-nav-back], [data-nav-no-swipe]",
        )
      ) {
        return;
      }

      if (pendingRef.current && pendingRef.current.dir !== NAV_BACK) {
        event.preventDefault();
        goBack();
        return;
      }

      swipeRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastT: event.timeStamp,
        velocity: 0,
        width: rect.width || 1,
        active: false,
      };
    };

    const onMove = (event: PointerEvent) => {
      const swipe = swipeRef.current;
      if (!swipe || swipe.pointerId !== event.pointerId) return;
      const dx = event.clientX - swipe.startX;
      const dy = event.clientY - swipe.startY;
      if (!swipe.active) {
        if (dx < 8) return;
        if (Math.abs(dy) > dx) {
          swipeRef.current = null;
          return;
        }
        swipe.active = true;
        try {
          stage.setPointerCapture(event.pointerId);
        } catch {
          /* ignore */
        }
        clearAnimations();
        const origin =
          originRef.current ??
          lastCrumb(stackRef.current) ??
          (pathname === "/" ? null : { path: "/", key: "/", href: "/" });
        const snap = origin ? snapshotFor(origin.key, origin.path) : snapshotFor("/", "/");
        if (snap) attachTo(backCover(), snap);
        const under = backLayer();
        if (under) under.style.visibility = "visible";
        const front = frontLayer();
        if (front) front.style.pointerEvents = "none";
        const shadow = frontShadow();
        if (shadow) shadow.style.opacity = SHADOW_OPACITY;
        setDim(dimRef.current, DIM_MAX);
        stage.setAttribute("data-nav-pending", origin?.path ?? "/");
        stage.setAttribute("data-ios-nav", NAV_BACK);
      }
      const width = swipe.width || 1;
      const x = Math.max(0, Math.min(width, dx));
      const dt = event.timeStamp - swipe.lastT || 16;
      swipe.velocity = (event.clientX - swipe.lastX) / dt;
      swipe.lastX = event.clientX;
      swipe.lastT = event.timeStamp;
      const progress = x / width;
      setXpx(frontLayer(), x);
      setXpx(backLayer(), (-PARALLAX / 100) * width + (PARALLAX / 100) * x);
      setClipRight(backLayer(), clipRightPercent(-PARALLAX + PARALLAX * progress, progress * 100));
      setDim(dimRef.current, DIM_MAX * (1 - progress));
      event.preventDefault();
    };

    const onUp = (event: PointerEvent) => {
      const swipe = swipeRef.current;
      if (!swipe || swipe.pointerId !== event.pointerId) return;
      if (!swipe.active) {
        swipeRef.current = null;
        return;
      }
      const dx = Math.max(0, swipe.lastX - swipe.startX);
      const progress = dx / (swipe.width || 1);
      const complete = progress > COMPLETE_RATIO || swipe.velocity >= COMPLETE_VELOCITY;
      endSwipe(complete);
    };

    const onCancel = (event: PointerEvent) => {
      const swipe = swipeRef.current;
      if (!swipe || swipe.pointerId !== event.pointerId) return;
      if (swipe.active) endSwipe(false);
      else swipeRef.current = null;
    };

    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onCancel);
    return () => {
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onCancel);
    };
  }, [
    attachTo,
    clearAnimations,
    finishPending,
    goBack,
    pathname,
    router,
    runSlide,
    snapshotFor,
  ]);

  const value = useMemo<InstantNavValue>(
    () => ({ begin, cancel, goBack }),
    [begin, cancel, goBack],
  );

  const covering = Boolean(pending && blocking);
  const aIsFront = frontIsA;
  const settledFrontStyle: CSSProperties | undefined = pending
    ? undefined
    : {
        position: "relative",
        flex: "1 1 auto",
        height: "100%",
        width: "100%",
        minHeight: 0,
        transform: "none",
        opacity: 1,
        visibility: "visible",
        pointerEvents: "auto",
      };
  const settledBackStyle: CSSProperties | undefined = pending
    ? undefined
    : {
        position: "absolute",
        inset: 0,
        height: "100%",
        width: "100%",
        transform: "none",
        opacity: 1,
        visibility: "hidden",
        pointerEvents: "none",
      };
  const settledDimStyle: CSSProperties | undefined = pending
    ? undefined
    : { opacity: 0, pointerEvents: "none" };
  const frontContent = holding || pending ? parked : children;
  const backContent = pending && arrived ? children : null;
  const contentA = aIsFront ? frontContent : backContent;
  const contentB = aIsFront ? backContent : frontContent;
  const skeletonOnA = Boolean(showSkeleton && pending && !aIsFront);
  const skeletonOnB = Boolean(showSkeleton && pending && aIsFront);

  return (
    <InstantNavContext.Provider value={value}>
      <div
        ref={stageRef}
        className="pt-stage"
        style={{ background: "transparent" }}
        data-nav-pending={covering || pending ? pending?.path : undefined}
        data-nav-blocking={covering ? "1" : "0"}
        data-ios-nav={pending?.dir}
      >
        <div
          ref={layerARef}
          className="pt-layer"
          data-front={aIsFront ? "1" : "0"}
          style={{
            background: "transparent",
            ...(aIsFront ? settledFrontStyle : settledBackStyle),
          }}
          inert={aIsFront ? undefined : true}
        >
          <div ref={shadowARef} className="pt-shadow" aria-hidden="true" />
          <div ref={coverARef} className="pt-cover" aria-hidden="true" />
          {skeletonOnA && pending ? (
            <div className="pt-cover" aria-hidden="true">
              {skeletonForPath(pending.path)}
            </div>
          ) : null}
          <div ref={liveARef} className="pt-live">
            {contentA}
          </div>
        </div>
        <div ref={dimRef} className="pt-dim" aria-hidden="true" style={settledDimStyle} />
        <div
          ref={layerBRef}
          className="pt-layer"
          data-front={aIsFront ? "0" : "1"}
          style={{
            background: "transparent",
            ...(aIsFront ? settledBackStyle : settledFrontStyle),
          }}
          inert={aIsFront ? true : undefined}
        >
          <div ref={shadowBRef} className="pt-shadow" aria-hidden="true" />
          <div ref={coverBRef} className="pt-cover" aria-hidden="true" />
          {skeletonOnB && pending ? (
            <div className="pt-cover" aria-hidden="true">
              {skeletonForPath(pending.path)}
            </div>
          ) : null}
          <div ref={liveBRef} className="pt-live">
            {contentB}
          </div>
        </div>
        {covering ? (
          <button
            type="button"
            className="anim-press back-hit"
            style={BACK_HIT_COVER_STYLE}
            aria-label={t("common.back")}
            data-nav-back="1"
            data-nav-no-swipe=""
            onPointerDown={(event) => {
              event.stopPropagation();
              goBack();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/icon-back.svg" alt="" width={13.9167} height={23.8333} />
          </button>
        ) : null}
        <div className="pt-edge" data-nav-edge="1" aria-hidden="true" />
      </div>
    </InstantNavContext.Provider>
  );
}
