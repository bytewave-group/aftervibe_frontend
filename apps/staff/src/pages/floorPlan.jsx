import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Page, f7 } from "framework7-react";
import Header from "../components/header";
import { useTranslation } from "../services/useTranslation";
import useAuthenticate from "../actions/Authenticate";
import { loadUser } from "../components/action/preferences";
import env from "../../environment.json";
import { createFloorSocket, FLOOR_SOCKET_STATUS } from "../services/floorSocket";
import { FLOOR_STATE, formatElapsed, initials, liveTiming, strongestState } from "../utils/floorLive";
import FloorPlanViewer from "../components/ktv/FloorPlanViewer";
import KtvSpotPicker from "../components/ktv/KtvSpotPicker";
import "../css/floor-plan.scss";

const FALLBACK_REFRESH_MS = 30000;
const SAFETY_REFRESH_MS = 120000;
const OTHERS_TAB = "others";
const SCOPE_ALL = "all";
const FILTER = Object.freeze({ ALL: "all", OCCUPIED: "occupied", ENDING: "ending", FREE: "free" });

const Avatar = ({ src, name, size = 28 }) => {
    const [failed, setFailed] = useState(false);
    if (src && !failed) {
        return <img className="fp-avatar" src={src} alt="" style={{ width: size, height: size }} onError={() => setFailed(true)} />;
    }
    return (
        <span className="fp-avatar fp-avatar-text" style={{ width: size, height: size, fontSize: Math.max(9, size / 2.6) }}>
            {initials(name)}
        </span>
    );
};

const FloorPlanPage = ({ f7router }) => {
    const { t } = useTranslation();
    const { floor_plan_live, floor_ws_ticket, move_order_ktv, move_spot_ktv, end_order_ktv } = useAuthenticate();

    const [live, setLive] = useState(null);
    const [fetchedAt, setFetchedAt] = useState(() => Date.now());
    const [nowTick, setNowTick] = useState(() => Date.now());
    const [loadError, setLoadError] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [tab, setTab] = useState("list");
    const [filter, setFilter] = useState(FILTER.ALL);
    const [scope, setScope] = useState(SCOPE_ALL);
    const [planId, setPlanId] = useState(null);
    const [socketStatus, setSocketStatus] = useState(FLOOR_SOCKET_STATUS.CONNECTING);
    const [sheetKey, setSheetKey] = useState(null);
    const [moveSession, setMoveSession] = useState(null);
    // Whole spot move (整桌换房): null, or { spot: {type, id, name} | null, manual: bool, note: string }.
    const [moveAll, setMoveAll] = useState(null);
    const [busy, setBusy] = useState(false);
    const [user, setUser] = useState(null);

    const refreshTimer = useRef(null);
    const mounted = useRef(true);

    const fetchLive = useCallback(async () => {
        const response = await floor_plan_live({ private_key: env.private_key });
        if (!mounted.current) {
            return;
        }
        setIsLoading(false);
        if (response && response.status && response.data) {
            setLive(response.data);
            setFetchedAt(Date.now());
            setNowTick(Date.now());
            setLoadError("");
        } else {
            setLoadError((response && response.message) || t("Failed to load floor plan"));
        }
    }, [floor_plan_live, t]);

    const scheduleRefresh = useCallback(() => {
        clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(fetchLive, 400);
    }, [fetchLive]);

    useEffect(() => {
        mounted.current = true;
        loadUser().then((value) => mounted.current && setUser(value));
        fetchLive();
        const tick = setInterval(() => setNowTick(Date.now()), 1000);
        const socket = createFloorSocket({
            getTicket: () => floor_ws_ticket({ private_key: env.private_key }),
            onEvent: () => scheduleRefresh(),
            onStatus: (status) => mounted.current && setSocketStatus(status),
        });
        const onVisible = () => {
            if (document.visibilityState === "visible") {
                socket.reconnectNow();
                scheduleRefresh();
            }
        };
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            mounted.current = false;
            clearInterval(tick);
            clearTimeout(refreshTimer.current);
            document.removeEventListener("visibilitychange", onVisible);
            socket.stop();
        };
    }, []);

    // Fallback: refresh every 30s while the socket is down / not configured, and every 2 min as a safety net.
    useEffect(() => {
        const every = socketStatus === FLOOR_SOCKET_STATUS.LIVE ? SAFETY_REFRESH_MS : FALLBACK_REFRESH_MS;
        const timer = setInterval(fetchLive, every);
        return () => clearInterval(timer);
    }, [socketStatus, fetchLive]);

    const deltaSeconds = Math.max(0, (nowTick - fetchedAt) / 1000);
    const timingOptions = {
        endingSoonSeconds: live?.ending_soon_seconds ?? 300,
        graceMinutes: live?.grace_minutes ?? 15,
    };
    const timing = (session) => liveTiming(session, deltaSeconds, timingOptions);

    const plans = useMemo(() => live?.plans || [], [live]);
    const others = useMemo(() => live?.others || [], [live]);
    const unplaced = useMemo(() => live?.unplaced || [], [live]);
    const girls = useMemo(() => live?.girls || [], [live]);
    const role = live?.role || user?.role;
    const appPermissions = user?.app_permissions || [];
    const canAdd = Boolean(live?.can_assign) && (role !== "mummy" || appPermissions.includes("order_ktv"));

    useEffect(() => {
        if (!plans.length && others.length) {
            setPlanId((current) => current ?? OTHERS_TAB);
            return;
        }
        if (plans.length && (planId === null || (planId !== OTHERS_TAB && !plans.some((plan) => plan.id === planId)))) {
            setPlanId(plans[0].id);
        }
    }, [plans, others, planId]);

    // Every assignable place (plan spots + rooms / tables not on a plan), keyed by "ktv_room:3".
    const places = useMemo(() => {
        const map = new Map();
        plans.forEach((plan) => {
            plan.spots.forEach((spot) => {
                if (spot.assignable && spot.key && !map.has(spot.key)) {
                    map.set(spot.key, { ...spot, planName: plan.name });
                }
            });
        });
        others.forEach((other) => {
            if (!map.has(other.key)) {
                map.set(other.key, { ...other, assignable: true, planName: t("Not on floor plan") });
            }
        });
        return map;
    }, [plans, others, t]);

    const sessionsFor = (place) => (place?.sessions || []).filter((session) => timing(session).state !== FLOOR_STATE.FREE);
    const placeState = (place) => strongestState(sessionsFor(place).map((session) => timing(session).state));

    const sheetPlace = useMemo(() => {
        if (!sheetKey) {
            return null;
        }
        if (sheetKey.startsWith("order:")) {
            const orderId = Number(sheetKey.slice(6));
            const session = unplaced.find((item) => item.order_id === orderId)
                || girls.map((girl) => girl.session).find((item) => item && item.order_id === orderId);
            return session ? { key: sheetKey, name: session.table || t("No table"), sessions: [session], assignable: false, virtual: true } : null;
        }
        return places.get(sheetKey) || null;
    }, [sheetKey, places, unplaced, girls, t]);

    const openSession = (session) => {
        if (session.spot_key && places.has(session.spot_key)) {
            setSheetKey(session.spot_key);
        } else {
            setSheetKey(`order:${session.order_id}`);
        }
    };

    const closeSheet = () => {
        setSheetKey(null);
        setMoveSession(null);
        setMoveAll(null);
    };

    const toast = (text, type = "success") => {
        f7.toast.show({ text, position: "center", closeTimeout: 2000, cssClass: type === "error" ? "fp-toast-error" : "" });
    };

    const doMove = async (session, target) => {
        if (busy) {
            return;
        }
        setBusy(true);
        const response = await move_order_ktv({
            private_key: env.private_key,
            order_id: session.order_id,
            spot_type: target.link_type,
            spot_id: target.link_id,
        });
        setBusy(false);
        if (!response?.status) {
            toast(response?.message || t("Failed to move"), "error");
            return;
        }
        toast(response.message || t("Moved"));
        setMoveSession(null);
        setSheetKey(target.key);
        fetchLive();
    };

    const confirmMove = (session, target) => {
        f7.dialog.confirm(
            t("Move {{name}} to {{place}}?", { name: session.staff_name || "", place: target.name }),
            t("Move room"),
            () => doMove(session, target)
        );
    };

    const confirmEnd = (session) => {
        f7.dialog.confirm(
            t("End {{name}}'s KTV session now? Amount and commission will not change", { name: session.staff_name || "" }),
            t("End session"),
            async () => {
                if (busy) {
                    return;
                }
                setBusy(true);
                const response = await end_order_ktv({ private_key: env.private_key, order_id: session.order_id });
                setBusy(false);
                if (!response?.status) {
                    toast(response?.message || t("Failed to end session"), "error");
                    return;
                }
                toast(response.message || t("Session ended"));
                fetchLive();
            }
        );
    };

    const doMoveAll = async (place, target, note) => {
        if (busy) {
            return;
        }
        setBusy(true);
        const response = await move_spot_ktv({
            private_key: env.private_key,
            from_spot_type: place.link_type,
            from_spot_id: place.link_id,
            spot_type: target.type,
            spot_id: target.id,
            note: note || undefined,
        });
        setBusy(false);
        if (!response?.status) {
            toast(response?.message || t("Failed to move"), "error");
            return;
        }
        toast(response.message || t("Moved"));
        setMoveAll(null);
        setSheetKey(`${target.type}:${target.id}`);
        fetchLive();
    };

    const confirmMoveAll = (place, target, note, movable, skipped) => {
        const text = skipped > 0
            ? t("Move {{count}} girls from {{from}} to {{to}}? {{skipped}} not yours will stay", { count: movable, from: place.name, to: target.name, skipped })
            : t("Move all {{count}} girls from {{from}} to {{to}}?", { count: movable, from: place.name, to: target.name });
        f7.dialog.confirm(text, t("Move whole table"), () => doMoveAll(place, target, note));
    };

    const goAdd = (place) => {
        const query = new URLSearchParams({
            spot_type: place.link_type,
            spot_id: String(place.link_id),
            spot_name: place.name || "",
        });
        closeSheet();
        f7router.navigate(`/ktv?${query.toString()}`);
    };

    const goExtend = (session) => {
        closeSheet();
        f7router.navigate(`/ktv-extend/${session.order_id}`);
    };

    const timeLine = (session) => {
        const value = timing(session);
        if (value.remaining > 0) {
            return `${formatElapsed(value.elapsed)} · ${t("Left")} ${formatElapsed(value.remaining)}`;
        }
        return `${formatElapsed(value.elapsed)} · ${t("Overtime")} ${formatElapsed(value.overtime)}`;
    };

    const stateLabel = (state) => ({
        [FLOOR_STATE.FREE]: t("Free"),
        [FLOOR_STATE.OCCUPIED]: t("Occupied"),
        [FLOOR_STATE.ENDING]: t("Ending soon"),
        [FLOOR_STATE.GRACE]: t("Overtime"),
    }[state] || state);

    const currentPlan = plans.find((plan) => plan.id === planId) || null;

    // List view: every room / table once, grouped by area (when the API sends one) inside each floor plan tab.
    const groups = useMemo(() => {
        const result = [];
        const seen = new Set();
        const push = (scope, title, subtitle, place) => {
            const id = `${scope}|${title}`;
            let group = result.find((item) => item.id === id);
            if (!group) {
                group = { id, scope, title, subtitle, places: [] };
                result.push(group);
            }
            group.places.push(place);
        };
        const areaOf = (place) => place.area_name || place.area?.name || "";
        plans.forEach((plan) => {
            plan.spots.forEach((spot) => {
                if (!spot.assignable || !spot.key || seen.has(spot.key)) {
                    return;
                }
                seen.add(spot.key);
                const area = areaOf(spot);
                push(String(plan.id), area || plan.name, area ? plan.name : "", places.get(spot.key) || spot);
            });
        });
        others.forEach((other) => {
            if (seen.has(other.key)) {
                return;
            }
            seen.add(other.key);
            const area = areaOf(other);
            const kind = String(other.key || "").startsWith("ktv_room") ? t("KTV rooms") : t("Tables");
            push(OTHERS_TAB, area || kind, t("Not on floor plan"), places.get(other.key) || other);
        });
        return result;
    }, [plans, others, places, t]);

    const allListPlaces = groups.flatMap((group) => group.places);
    const matchesFilter = (place, value) => {
        const state = placeState(place);
        if (value === FILTER.OCCUPIED) {
            return state !== FLOOR_STATE.FREE;
        }
        if (value === FILTER.ENDING) {
            return state === FLOOR_STATE.ENDING || state === FLOOR_STATE.GRACE;
        }
        if (value === FILTER.FREE) {
            return state === FLOOR_STATE.FREE;
        }
        return true;
    };
    const filterCounts = {
        [FILTER.ALL]: allListPlaces.length,
        [FILTER.OCCUPIED]: allListPlaces.filter((place) => matchesFilter(place, FILTER.OCCUPIED)).length,
        [FILTER.ENDING]: allListPlaces.filter((place) => matchesFilter(place, FILTER.ENDING)).length,
        [FILTER.FREE]: allListPlaces.filter((place) => matchesFilter(place, FILTER.FREE)).length,
    };
    const scopeTabs = [
        ...plans.filter((plan) => groups.some((group) => group.scope === String(plan.id))).map((plan) => ({ id: String(plan.id), name: plan.name })),
        ...(groups.some((group) => group.scope === OTHERS_TAB) ? [{ id: OTHERS_TAB, name: t("Other rooms / tables") }] : []),
    ];
    const visibleGroups = groups
        .filter((group) => scope === SCOPE_ALL || group.scope === scope)
        .map((group) => ({ ...group, places: group.places.filter((place) => matchesFilter(place, filter)) }))
        .filter((group) => group.places.length > 0);

    const renderPlaceCard = (place) => {
        const placeSessions = sessionsFor(place);
        const state = placeState(place);
        const lead = placeSessions[0] ? timing(placeSessions[0]) : null;
        return (
            <button key={place.key} type="button" className={`fp-card fp-state-${state}`} onClick={() => setSheetKey(place.key)}>
                <div className="fp-card-head">
                    <span className="fp-card-name">{place.name}</span>
                    <span className={`fp-pill fp-state-${state}`}>{stateLabel(state)}</span>
                </div>
                {placeSessions.length === 0 ? (
                    <div className="fp-card-free">{canAdd ? `+ ${t("Tap to add a girl")}` : t("No one here right now")}</div>
                ) : (
                    <>
                        <div className="fp-card-girls">
                            {placeSessions.slice(0, 3).map((session) => {
                                const value = timing(session);
                                return (
                                    <div key={session.order_id} className="fp-card-girl">
                                        <Avatar src={session.staff_avatar} name={session.staff_name} size={26} />
                                        <span className="fp-card-girl-name">{session.staff_name}</span>
                                        <span className={`fp-card-girl-time fp-state-${value.state}`}>
                                            {value.remaining > 0 ? formatElapsed(value.remaining) : `+${formatElapsed(value.overtime)}`}
                                        </span>
                                    </div>
                                );
                            })}
                            {placeSessions.length > 3 && (
                                <div className="fp-card-more">+{placeSessions.length - 3} {t("girls")}</div>
                            )}
                        </div>
                        {lead && (
                            <div className="fp-card-foot">
                                <span>{t("Elapsed")} {formatElapsed(lead.elapsed)}</span>
                                <span>{lead.remaining > 0 ? `${t("Left")} ${formatElapsed(lead.remaining)}` : `${t("Overtime")} ${formatElapsed(lead.overtime)}`}</span>
                            </div>
                        )}
                    </>
                )}
            </button>
        );
    };

    const statusText = {
        [FLOOR_SOCKET_STATUS.LIVE]: t("Live"),
        [FLOOR_SOCKET_STATUS.CONNECTING]: t("Connecting"),
        [FLOOR_SOCKET_STATUS.OFFLINE]: t("Offline, refreshing every 30s"),
        [FLOOR_SOCKET_STATUS.DISABLED]: t("Refreshing every 30s"),
    }[socketStatus];

    const moveTargets = useMemo(() => {
        if (!moveSession) {
            return [];
        }
        return Array.from(places.values()).filter((place) => place.key !== moveSession.spot_key);
    }, [moveSession, places]);

    const moveAllLayout = useMemo(() => {
        if (!moveAll || !sheetKey) {
            return null;
        }
        const withCount = (spot) => ({ ...spot, occupied_count: sessionsFor(spot).length });
        const planRows = plans.map((plan) => ({
            ...plan,
            spots: plan.spots.filter((spot) => spot.assignable && spot.key !== sheetKey).map(withCount),
        }));
        const otherRows = others.filter((other) => other.key !== sheetKey).map(withCount);
        return {
            plans: planRows,
            others: otherRows,
            has_layout: otherRows.length > 0 || planRows.some((plan) => plan.spots.length > 0),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [moveAll, sheetKey, plans, others, live]);

    const updatedAt = new Date(fetchedAt);
    const updatedText = `${String(updatedAt.getHours()).padStart(2, "0")}:${String(updatedAt.getMinutes()).padStart(2, "0")}:${String(updatedAt.getSeconds()).padStart(2, "0")}`;
    const activeGirls = girls.filter((girl) => girl.session && timing(girl.session).state !== FLOOR_STATE.FREE).length;
    const hasPlaces = plans.length > 0 || others.length > 0;

    const legend = (
        <div className="fp-legend">
            {[FLOOR_STATE.FREE, FLOOR_STATE.OCCUPIED, FLOOR_STATE.ENDING, FLOOR_STATE.GRACE].map((state) => (
                <span key={state} className={`fp-legend-item fp-state-${state}`}>
                    <i />
                    {stateLabel(state)}
                </span>
            ))}
        </div>
    );

    const unplacedSection = unplaced.length > 0 && (
        <div className="fp-unplaced">
            <div className="fp-section-title">{t("Not on floor plan")}</div>
            {unplaced.map((session) => (
                <div key={session.order_id} className={`fp-girl-row fp-state-${timing(session).state}`} onClick={() => openSession(session)}>
                    <Avatar src={session.staff_avatar} name={session.staff_name} />
                    <div className="fp-girl-main">
                        <div className="fp-girl-name">{session.staff_name}</div>
                        <div className="fp-girl-meta">{session.table || t("No table")} · {timeLine(session)}</div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <Page name="floor-plan" className="floor-plan-page" onPageAfterIn={() => fetchLive()}>
            <Header title={t("Floor Plan")} />
            <div className="fp-wrap">
                <div className="fp-tabs">
                    <button type="button" className={`fp-tab${tab === "list" ? " active" : ""}`} onClick={() => setTab("list")}>
                        {t("List")}
                    </button>
                    <button type="button" className={`fp-tab${tab === "plan" ? " active" : ""}`} onClick={() => setTab("plan")}>
                        {t("Plan")}
                    </button>
                    <button type="button" className={`fp-tab${tab === "girls" ? " active" : ""}`} onClick={() => setTab("girls")}>
                        {t("Girls")} {activeGirls}/{girls.length}
                    </button>
                </div>

                <button type="button" className={`fp-live fp-live-${socketStatus}`} onClick={() => fetchLive()}>
                    <span className="fp-live-dot" />
                    <span className="fp-live-text">{statusText}</span>
                    <span className="fp-live-updated">{t("Updated {{time}}", { time: updatedText })} ↻</span>
                </button>

                {isLoading && <div className="fp-empty">{t("Loading...")}</div>}
                {!isLoading && loadError && <div className="fp-error">{loadError}</div>}

                {!isLoading && live && tab !== "girls" && !hasPlaces && (
                    <div className="fp-empty">{t("No floor plan yet, set it up in the admin under Table layout")}</div>
                )}

                {!isLoading && live && tab === "list" && hasPlaces && (
                    <>
                        <div className="fp-filters">
                            {[
                                [FILTER.ALL, t("All")],
                                [FILTER.OCCUPIED, t("Occupied")],
                                [FILTER.ENDING, t("Ending soon")],
                                [FILTER.FREE, t("Free")],
                            ].map(([value, label]) => (
                                <button key={value} type="button" className={`fp-filter fp-filter-${value}${filter === value ? " active" : ""}`} onClick={() => setFilter(value)}>
                                    {label}
                                    <span className="fp-filter-count">{filterCounts[value]}</span>
                                </button>
                            ))}
                        </div>

                        {scopeTabs.length > 1 && (
                            <div className="fp-plan-tabs">
                                <button type="button" className={`fp-chip${scope === SCOPE_ALL ? " active" : ""}`} onClick={() => setScope(SCOPE_ALL)}>
                                    {t("All areas")}
                                </button>
                                {scopeTabs.map((item) => (
                                    <button key={item.id} type="button" className={`fp-chip${scope === item.id ? " active" : ""}`} onClick={() => setScope(item.id)}>
                                        {item.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {visibleGroups.length === 0 && <div className="fp-empty">{t("Nothing matches this filter")}</div>}

                        {visibleGroups.map((group) => (
                            <section key={group.id} className="fp-group">
                                <div className="fp-group-head">
                                    <span className="fp-group-title">{group.title}</span>
                                    {group.subtitle && <span className="fp-group-sub">{group.subtitle}</span>}
                                    <span className="fp-group-count">{group.places.length}</span>
                                </div>
                                <div className="fp-card-grid">{group.places.map(renderPlaceCard)}</div>
                            </section>
                        ))}

                        {unplacedSection}
                    </>
                )}

                {!isLoading && live && tab === "plan" && hasPlaces && (
                    <>
                        {(plans.length > 1 || (plans.length && others.length)) && (
                            <div className="fp-plan-tabs">
                                {plans.map((plan) => (
                                    <button key={plan.id} type="button" className={`fp-chip${planId === plan.id ? " active" : ""}`} onClick={() => setPlanId(plan.id)}>
                                        {plan.name}
                                    </button>
                                ))}
                                {others.length > 0 && (
                                    <button type="button" className={`fp-chip${planId === OTHERS_TAB ? " active" : ""}`} onClick={() => setPlanId(OTHERS_TAB)}>
                                        {t("Other rooms / tables")}
                                    </button>
                                )}
                            </div>
                        )}

                        {legend}

                        {currentPlan && planId !== OTHERS_TAB && (
                            <FloorPlanViewer
                                plan={currentPlan}
                                stateOf={placeState}
                                sessionsOf={sessionsFor}
                                renderAvatar={(session, size) => <Avatar src={session.staff_avatar} name={session.staff_name} size={size} />}
                                onSelect={(spot) => setSheetKey(spot.key)}
                                labels={{
                                    hint: t("Pinch or drag to move, tap a room for details"),
                                    zoomIn: t("Zoom in"),
                                    zoomOut: t("Zoom out"),
                                    fit: t("Fit"),
                                }}
                            />
                        )}

                        {planId === OTHERS_TAB && (
                            <div className="fp-card-grid">{others.map((other) => renderPlaceCard(places.get(other.key) || other))}</div>
                        )}

                        {unplacedSection}
                    </>
                )}

                {!isLoading && live && tab === "girls" && (
                    <div className="fp-girls">
                        {girls.length === 0 && <div className="fp-empty">{t("No girls on duty")}</div>}
                        {girls.map((girl) => {
                            const session = girl.session && timing(girl.session).state !== FLOOR_STATE.FREE ? girl.session : null;
                            const state = session ? timing(session).state : FLOOR_STATE.FREE;
                            return (
                                <div
                                    key={girl.staff_id}
                                    className={`fp-girl-row fp-state-${state}`}
                                    onClick={session ? () => openSession(session) : undefined}
                                >
                                    <Avatar src={girl.avatar} name={girl.name} size={36} />
                                    <div className="fp-girl-main">
                                        <div className="fp-girl-name">{girl.name}</div>
                                        <div className="fp-girl-meta">
                                            {session ? `${session.table || t("No table")} · ${timeLine(session)}` : t("Available")}
                                        </div>
                                    </div>
                                    <div className="fp-girl-count">
                                        <span>{girl.today_count}</span>
                                        <small>{t("Today")}</small>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {sheetPlace && (
                <div className="fp-sheet-backdrop" onClick={closeSheet}>
                    <div className="fp-sheet" onClick={(event) => event.stopPropagation()}>
                        <div className="fp-sheet-handle" />
                        <div className="fp-sheet-header">
                            <div>
                                <div className="fp-sheet-title">{sheetPlace.name}</div>
                                {sheetPlace.planName && <div className="fp-sheet-sub">{sheetPlace.planName}</div>}
                            </div>
                            <span className={`fp-badge fp-state-${placeState(sheetPlace)}`}>{stateLabel(placeState(sheetPlace))}</span>
                        </div>

                        {!moveSession && !moveAll && (() => {
                            const here = sessionsFor(sheetPlace);
                            const movable = here.filter((session) => session.can_manage).length;
                            if (sheetPlace.virtual || !sheetPlace.link_type || here.length === 0 || movable === 0 || places.size < 2) {
                                return null;
                            }
                            return (
                                <button type="button" className="fp-btn primary block fp-move-all-btn" onClick={() => setMoveAll({ spot: null, manual: false, note: "" })}>
                                    ⇄ {t("Move whole table")} ({movable === here.length ? here.length : `${movable}/${here.length}`})
                                </button>
                            );
                        })()}

                        {moveAll && (() => {
                            const here = sessionsFor(sheetPlace);
                            const movable = here.filter((session) => session.can_manage);
                            const skipped = here.length - movable.length;
                            const target = moveAll.manual ? null : moveAll.spot;
                            return (
                                <div className="fp-move-all">
                                    <div className="fp-section-title">{t("Move everyone at {{name}} to", { name: sheetPlace.name })}</div>
                                    <div className="fp-move-all-girls">
                                        {movable.map((session) => (
                                            <span key={session.order_id} className="fp-move-all-girl">
                                                <Avatar src={session.staff_avatar} name={session.staff_name} size={22} />
                                                {session.staff_name}
                                            </span>
                                        ))}
                                    </div>
                                    {skipped > 0 && (
                                        <div className="fp-move-all-warn">{t("{{count}} girls here belong to another mummy and will stay", { count: skipped })}</div>
                                    )}
                                    <KtvSpotPicker
                                        t={t}
                                        layout={moveAllLayout}
                                        selectedSpot={moveAll.spot}
                                        onSelectSpot={(spot) => setMoveAll((current) => ({ ...current, spot }))}
                                        manual={false}
                                        onManualChange={() => {}}
                                        tableNumber=""
                                        onTableNumberChange={() => {}}
                                        inputId="fp-move-all"
                                        allowManual={false}
                                    />
                                    <input
                                        type="text"
                                        className="fp-note-input"
                                        maxLength={255}
                                        placeholder={t("Note (optional)")}
                                        value={moveAll.note}
                                        onChange={(event) => {
                                            const note = event.target.value;
                                            setMoveAll((current) => ({ ...current, note }));
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="fp-btn primary block"
                                        disabled={busy || !target}
                                        onClick={() => confirmMoveAll(sheetPlace, target, moveAll.note.trim(), movable.length, skipped)}
                                    >
                                        {target ? t("Move {{count}} to {{name}}", { count: movable.length, name: target.name }) : t("Select room / table")}
                                    </button>
                                    <button type="button" className="fp-btn block" onClick={() => setMoveAll(null)}>{t("Cancel")}</button>
                                </div>
                            );
                        })()}

                        {!moveSession && !moveAll && (
                            <>
                                {sessionsFor(sheetPlace).length === 0 && <div className="fp-empty">{t("No one here right now")}</div>}
                                {sessionsFor(sheetPlace).map((session) => {
                                    const value = timing(session);
                                    return (
                                        <div key={session.order_id} className={`fp-session fp-state-${value.state}`}>
                                            <div className="fp-session-top">
                                                <Avatar src={session.staff_avatar} name={session.staff_name} size={40} />
                                                <div className="fp-girl-main">
                                                    <div className="fp-girl-name">{session.staff_name}</div>
                                                    <div className="fp-girl-meta">
                                                        {t("Mummy")}: {session.mummy_name || "-"}
                                                        {session.extension_count > 0 ? ` · ${t("Extensions")}: ${session.extension_count}` : ""}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="fp-session-times">
                                                <div>
                                                    <small>{t("Elapsed")}</small>
                                                    <strong>{formatElapsed(value.elapsed)}</strong>
                                                </div>
                                                <div>
                                                    <small>{value.remaining > 0 ? t("Remaining") : t("Overtime")}</small>
                                                    <strong>{formatElapsed(value.remaining > 0 ? value.remaining : value.overtime)}</strong>
                                                </div>
                                                <div>
                                                    <small>{t("End Time")}</small>
                                                    <strong>{String(session.end_time || "").slice(11, 16) || "-"}</strong>
                                                </div>
                                            </div>
                                            <div className="fp-session-actions">
                                                {session.can_extend && (
                                                    <button type="button" className="fp-btn primary" onClick={() => goExtend(session)}>{t("Extend time")}</button>
                                                )}
                                                {session.can_manage && places.size > 0 && (
                                                    <button type="button" className="fp-btn" onClick={() => setMoveSession(session)}>{t("Move room")}</button>
                                                )}
                                                {session.can_manage && (
                                                    <button type="button" className="fp-btn danger" onClick={() => confirmEnd(session)}>{t("End session")}</button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {canAdd && sheetPlace.assignable && !sheetPlace.virtual && (
                                    <button type="button" className="fp-btn primary block" onClick={() => goAdd(sheetPlace)}>
                                        + {t("Add girl (KTV order)")}
                                    </button>
                                )}
                            </>
                        )}

                        {moveSession && (
                            <div className="fp-move">
                                <div className="fp-section-title">
                                    {t("Move {{name}} to", { name: moveSession.staff_name || "" })}
                                </div>
                                <div className="fp-move-list">
                                    {moveTargets.map((place) => {
                                        const state = placeState(place);
                                        const count = sessionsFor(place).length;
                                        return (
                                            <button key={place.key} type="button" className={`fp-move-item fp-state-${state}`} disabled={busy} onClick={() => confirmMove(moveSession, place)}>
                                                <span className="fp-move-name">{place.name}</span>
                                                <span className="fp-move-meta">{place.planName}{count ? ` · ${count} ${t("girls")}` : ""}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <button type="button" className="fp-btn block" onClick={() => setMoveSession(null)}>{t("Cancel")}</button>
                            </div>
                        )}

                        <button type="button" className="fp-btn ghost block" onClick={closeSheet}>{t("Close")}</button>
                    </div>
                </div>
            )}
        </Page>
    );
};

export default FloorPlanPage;
