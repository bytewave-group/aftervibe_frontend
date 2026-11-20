import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

const MAX_ZOOM = 5;
const ZOOM_STEP = 1.5;
const TAP_SLOP = 8;
const PAN_PADDING = 32;
const MARKER_MIN = 30;
const MARKER_MAX = 52;
const COMPACT_BELOW = 34;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Floor plan with pinch / wheel zoom and drag-to-pan. The plan image is scaled with a CSS transform;
 * markers live in an unscaled overlay so they keep a readable screen size at any zoom level.
 */
const FloorPlanViewer = ({ plan, stateOf, sessionsOf, renderAvatar, onSelect, labels }) => {
    const viewportRef = useRef(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
    const viewRef = useRef(view);
    const pointers = useRef(new Map());
    const gesture = useRef(null);
    const moved = useRef(false);

    const aspect = (plan.canvas_height || 1000) / (plan.canvas_width || 1600);
    const baseWidth = size.width;
    const baseHeight = size.width * aspect;
    const fitScale = baseHeight > 0 && size.height > 0 ? Math.min(1, size.height / baseHeight) : 1;

    const clampView = useCallback((next) => {
        const scale = clamp(next.scale, fitScale, fitScale * MAX_ZOOM);
        const contentW = baseWidth * scale;
        const contentH = baseHeight * scale;
        const axis = (offset, content, viewport) => (content <= viewport
            ? (viewport - content) / 2
            : clamp(offset, viewport - content - PAN_PADDING, PAN_PADDING));
        return { scale, x: axis(next.x, contentW, size.width), y: axis(next.y, contentH, size.height) };
    }, [fitScale, baseWidth, baseHeight, size.width, size.height]);

    const apply = useCallback((next) => {
        const value = clampView(next);
        viewRef.current = value;
        setView(value);
    }, [clampView]);

    const fit = useCallback(() => apply({ scale: fitScale, x: 0, y: 0 }), [apply, fitScale]);

    // Measure: width = container, height = fit-to-width height capped at ~62% of the screen.
    useLayoutEffect(() => {
        const element = viewportRef.current;
        if (!element) {
            return undefined;
        }
        const measure = () => {
            const width = element.clientWidth;
            const maxHeight = Math.max(260, Math.round(window.innerHeight * 0.62));
            setSize({ width, height: Math.min(Math.round(width * aspect), maxHeight) });
        };
        measure();
        const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
        observer?.observe(element);
        window.addEventListener("resize", measure);
        return () => {
            observer?.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [aspect]);

    // Re-fit when the plan or the viewport size changes.
    useEffect(() => {
        fit();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plan.id, size.width, size.height]);

    const zoomAt = useCallback((factor, px, py) => {
        const current = viewRef.current;
        const scale = clamp(current.scale * factor, fitScale, fitScale * MAX_ZOOM);
        const ratio = scale / current.scale;
        apply({ scale, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio });
    }, [apply, fitScale]);

    const zoomCenter = (factor) => zoomAt(factor, size.width / 2, size.height / 2);

    const localPoint = (event) => {
        const rect = viewportRef.current.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const startGesture = () => {
        const points = Array.from(pointers.current.values());
        const current = viewRef.current;
        if (points.length >= 2) {
            const [a, b] = points;
            gesture.current = {
                type: "pinch",
                distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
                mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
                view: current,
            };
        } else if (points.length === 1) {
            gesture.current = { type: "pan", start: points[0], view: current };
        } else {
            gesture.current = null;
        }
    };

    const onPointerDown = (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }
        if (pointers.current.size === 0) {
            moved.current = false;
        }
        pointers.current.set(event.pointerId, localPoint(event));
        startGesture();
    };

    useEffect(() => {
        const onMove = (event) => {
            if (!pointers.current.has(event.pointerId) || !gesture.current || !viewportRef.current) {
                return;
            }
            pointers.current.set(event.pointerId, localPoint(event));
            const points = Array.from(pointers.current.values());
            const g = gesture.current;
            if (g.type === "pan" && points.length === 1) {
                const dx = points[0].x - g.start.x;
                const dy = points[0].y - g.start.y;
                if (!moved.current && Math.hypot(dx, dy) < TAP_SLOP) {
                    return;
                }
                moved.current = true;
                apply({ scale: g.view.scale, x: g.view.x + dx, y: g.view.y + dy });
            } else if (g.type === "pinch" && points.length >= 2) {
                moved.current = true;
                const [a, b] = points;
                const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
                const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                const scale = clamp(g.view.scale * (distance / g.distance), fitScale, fitScale * MAX_ZOOM);
                const ratio = scale / g.view.scale;
                apply({
                    scale,
                    x: mid.x - (g.mid.x - g.view.x) * ratio,
                    y: mid.y - (g.mid.y - g.view.y) * ratio,
                });
            }
        };
        const onUp = (event) => {
            if (!pointers.current.has(event.pointerId)) {
                return;
            }
            pointers.current.delete(event.pointerId);
            startGesture();
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
        };
    }, [apply, fitScale]);

    // Desktop / trackpad: wheel zooms around the cursor (needs a non-passive listener).
    useEffect(() => {
        const element = viewportRef.current;
        if (!element) {
            return undefined;
        }
        const onWheel = (event) => {
            event.preventDefault();
            const rect = element.getBoundingClientRect();
            zoomAt(Math.exp(-event.deltaY * 0.0015), event.clientX - rect.left, event.clientY - rect.top);
        };
        element.addEventListener("wheel", onWheel, { passive: false });
        return () => element.removeEventListener("wheel", onWheel);
    }, [zoomAt]);

    const select = (spot) => {
        if (moved.current) {
            return;
        }
        onSelect(spot);
    };

    const zoomPercent = fitScale > 0 ? Math.round((view.scale / fitScale) * 100) : 100;

    return (
        <div className="fp-viewer">
            <div
                ref={viewportRef}
                className="fp-viewport"
                style={{ height: size.height || undefined }}
                onPointerDown={onPointerDown}
            >
                <div
                    className="fp-stage"
                    style={{
                        width: baseWidth,
                        height: baseHeight,
                        transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
                        backgroundImage: plan.background_image ? `url("${plan.background_image}")` : undefined,
                    }}
                >
                    {plan.spots.map((spot) => (
                        <div
                            key={spot.id}
                            className={`fp-area fp-shape-${spot.shape}${spot.assignable ? ` fp-state-${stateOf(spot)}` : " fp-decor"}`}
                            style={{
                                left: `${spot.x}%`,
                                top: `${spot.y}%`,
                                width: `${spot.width}%`,
                                height: `${spot.height}%`,
                                transform: spot.rotation ? `rotate(${spot.rotation}deg)` : undefined,
                                "--fp-spot-color": spot.color || "#64748B",
                            }}
                        />
                    ))}
                </div>

                <div className="fp-markers">
                    {plan.spots.filter((spot) => spot.assignable).map((spot) => {
                        const state = stateOf(spot);
                        const sessions = sessionsOf(spot);
                        const spotW = (spot.width / 100) * baseWidth * view.scale;
                        const spotH = (spot.height / 100) * baseHeight * view.scale;
                        const left = ((spot.x + spot.width / 2) / 100) * baseWidth * view.scale + view.x;
                        const top = ((spot.y + spot.height / 2) / 100) * baseHeight * view.scale + view.y;
                        const busy = sessions.length > 0;
                        const compact = Math.min(spotW, spotH) < COMPACT_BELOW;
                        const diameter = Math.round(clamp(Math.min(spotW, spotH) * 0.6, MARKER_MIN, MARKER_MAX));
                        // Free spots stay light (label only, or a small dot when the spot is tiny on screen);
                        // occupied ones get a readable avatar dot, centred ring and girl-count badge.
                        const mode = busy ? "busy" : compact ? "dot" : "label";
                        return (
                            <button
                                key={spot.id}
                                type="button"
                                className={`fp-marker fp-mode-${mode} fp-state-${state}`}
                                style={{
                                    left,
                                    top,
                                    width: Math.max(spotW, 32),
                                    height: Math.max(spotH, 32),
                                    "--fp-marker-size": `${diameter}px`,
                                }}
                                aria-label={spot.name}
                                onClick={() => select(spot)}
                            >
                                {busy && (
                                    <span className="fp-marker-dot">
                                        {renderAvatar(sessions[0], diameter - 6)}
                                        <span className="fp-marker-count">{sessions.length}</span>
                                    </span>
                                )}
                                {mode === "dot" && <span className="fp-marker-mini" />}
                                {mode !== "dot" && <span className="fp-marker-label">{spot.name}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="fp-viewer-tools">
                <span className="fp-viewer-hint">{labels.hint}</span>
                <div className="fp-zoom-group">
                    <button type="button" className="fp-zoom-btn" aria-label={labels.zoomOut} onClick={() => zoomCenter(1 / ZOOM_STEP)} disabled={view.scale <= fitScale + 0.001}>−</button>
                    <span className="fp-zoom-value">{zoomPercent}%</span>
                    <button type="button" className="fp-zoom-btn" aria-label={labels.zoomIn} onClick={() => zoomCenter(ZOOM_STEP)} disabled={view.scale >= fitScale * MAX_ZOOM - 0.001}>+</button>
                    <button type="button" className="fp-zoom-btn fp-zoom-fit" onClick={fit}>{labels.fit}</button>
                </div>
            </div>
        </div>
    );
};

FloorPlanViewer.propTypes = {
    plan: PropTypes.object.isRequired,
    stateOf: PropTypes.func.isRequired,
    sessionsOf: PropTypes.func.isRequired,
    renderAvatar: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
    labels: PropTypes.object.isRequired,
};

export default FloorPlanViewer;
