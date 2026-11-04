import { useEffect, useRef, useState } from "react";

export default function VideoPlayer() {
    // Render debug
    console.log("VIDEO PLAYER RENDER");

    const [activeSlot, setActiveSlot] = useState(0);

    // Double buffer refs
    const videoRefs = [useRef(null), useRef(null)];

    // Visible slot
    const activeSlotRef = useRef(0);
    const playlistRef = useRef([]);
    const currentIndexRef = useRef(0);

    // Playback state refs
    const currentModeRef = useRef("default");
    const currentPlaylistIdRef = useRef(null);
    const playbackModeRef = useRef("sequential");
    const isMainRef = useRef(false);
    const durationRef = useRef(10);

    // Default playlist cache
    const defaultPlaylistRef = useRef([]);

    // Timers refs
    const cycleTimerRef = useRef(null);
    const interactionTimerRef = useRef(null);
    const preloadTimerRef = useRef(null);
    const startTimerRef = useRef(null);

    // More state refs
    const playbackStartAtRef = useRef(null);
    const queueFinishedSentRef = useRef(false);
    const loadingRef = useRef(false);
    const preloadedSlotRef = useRef(null);
    const preloadedStartAtRef = useRef(null);

    // Next playlist/queue
    const nextPlaylistRef = useRef(null);
    const nextPlaylistAnimationsRef = useRef([]);
    const queueRef = useRef([]);
    const currentDisplayRef = useRef(null);
    const preloadGenerationRef = useRef(0);
    const preloadedQueueRef = useRef(null);

    function clearTimers() {
        preloadGenerationRef.current++;
        clearTimeout(cycleTimerRef.current);
        clearTimeout(interactionTimerRef.current);
        clearTimeout(preloadTimerRef.current);
        clearTimeout(startTimerRef.current);
        cycleTimerRef.current = null;
        interactionTimerRef.current = null;
        preloadTimerRef.current = null;
        startTimerRef.current = null;
        loadingRef.current = false;
    }

    // Returns index of hidden slot
    function getInactiveSlot() {
        return activeSlotRef.current === 0 ? 1 : 0;
    }

    // Compute next video index
    function getNextIndex() {
        const playlist = playlistRef.current;
        const currentIndex = currentIndexRef.current;

        if (playlist.length <= 1) return 0;

        if (playbackModeRef.current === "random") {
            let nextIndex;
            do {
                nextIndex = Math.floor(Math.random() * playlist.length);
            } while (nextIndex === currentIndex);
            console.log("RANDOM NEXT VIDEO =", nextIndex);
            return nextIndex;
        }
        const nextIndex = (currentIndex + 1) % playlist.length;
        console.log(`SEQUENTIAL NEXT VIDEO = ${nextIndex}`);
        return nextIndex;
    }
    
    function getNextPlaylistAnimations(nextPlaylist, currentDisplay) {
        if (!nextPlaylist) return [];
        const screens =
            Array.isArray(nextPlaylist.screens)
                ? nextPlaylist.screens
                : Array.isArray(nextPlaylist.displays)
                  ? nextPlaylist.displays
                  : [];
        if (!screens.length) return [];

        const currentDisplayId = currentDisplay?.id ?? currentDisplay?.display_id ?? null;

        let nextDisplay = null;

        if (currentDisplayId !== null) {
            nextDisplay = screens.find(
                (screen) => String(screen?.id ?? screen?.display_id) === String(currentDisplayId)
            );
        }
        if (!nextDisplay) {
            console.error(
                "NEXT PLAYLIST DISPLAY NOT FOUND",
                {
                    currentDisplayId,
                    availableScreens: screens.map((screen) => ({
                        id: screen?.id,
                        display_id: screen?.display_id,
                    })),
                }
            );
            return [];
        }
        return Array.isArray(nextDisplay?.animations) ? nextDisplay.animations : [];
    }

    // Preload next video
    function preloadAndSwitch(playlist, index, options = {}) {
        const preloadGeneration = ++preloadGenerationRef.current;
        if (!Array.isArray(playlist) || !playlist.length) return;

        const animation = playlist[index];
        if (!animation || !animation.video_url) {
            console.error("INVALID ANIMATION:", animation);
            return;
        }

        const targetSlot = getInactiveSlot();
        const targetVideo = videoRefs[targetSlot].current;
        if (!targetVideo) return;

        const oldSlot = activeSlotRef.current;
        const oldVideo = videoRefs[oldSlot].current;

        loadingRef.current = true;
        const startAt = Number(options.startAt) || Date.now();

        console.log("========== PRELOAD NEXT VIDEO ==========");
        console.log("TARGET SLOT =", targetSlot);
        console.log("TARGET ANIMATION =", animation.name);
        console.log("TARGET START AT =", startAt);

        targetVideo.oncanplay = null;
        targetVideo.onerror = null;
        targetVideo.onended = null;
        targetVideo.style.opacity = "0";
        targetVideo.pause();
        targetVideo.currentTime = 0;
        targetVideo.src = animation.video_url;
        targetVideo.load();

        let readyHandled = false;

        const handleReady = () => {
            if (
                preloadGeneration !== preloadGenerationRef.current ||
                readyHandled
            )
                return;
                
            readyHandled = true;

            targetVideo.oncanplay = null;
            targetVideo.onerror = null;

            console.log("========== NEXT VIDEO READY ==========");
            console.log("READY ANIMATION =", animation.name);

            const waitTime = Math.max(0, startAt - Date.now());
            console.log("WAIT BEFORE PLAY =", waitTime, "ms");

            const preparePlayback = async () => {
                preloadedSlotRef.current = targetSlot;
                preloadedStartAtRef.current = startAt;
                loadingRef.current = false;

                if (options.preloadOnly) {
                    preloadedQueueRef.current = {
                        playlist,
                        index,
                        playlistId: options.playlistId,
                        duration: options.duration,
                        mode: options.mode,
                        slot: targetSlot,
                    };
                    console.log("========== QUEUE VIDEO PRELOADED ==========");
                    console.log("PRELOADED PLAYLIST ID =", options.playlistId);
                    console.log("PRELOADED SLOT =", targetSlot);
                    console.log("PRELOADED ANIMATION =", animation.name);
                    return;
                }

                const switchDelay = Math.max(0, startAt - Date.now());
                startTimerRef.current = setTimeout(async () => {
                    startTimerRef.current = null;
                    if (preloadGeneration !== preloadGenerationRef.current) return;
                    try {
                        targetVideo.currentTime = 0;
                        await targetVideo.play();

                        console.log(
                            "VISIBLE VIDEO PLAYING =",
                            animation.name
                        );

                        playlistRef.current = playlist;
                        currentIndexRef.current = index;
                        const previousPlaylistId = currentPlaylistIdRef.current;
                        const newPlaylistId =
                            options.playlistId ?? currentPlaylistIdRef.current;

                        if (
                            options.duration !== undefined &&
                            options.duration !== null
                        ) {
                            const newDuration = Number(options.duration);
                            if (
                                Number.isFinite(newDuration) &&
                                newDuration > 0
                            ) {
                                durationRef.current = newDuration;
                            }
                        }
                        if (options.mode) {
                            currentModeRef.current = options.mode;
                        }

                        currentPlaylistIdRef.current = newPlaylistId;

                        if (
                            currentModeRef.current !== "default" &&
                            previousPlaylistId !== newPlaylistId
                        ) {
                            queueRef.current = queueRef.current.filter(
                                (item) =>
                                    String(item.playlistId) !==
                                    String(newPlaylistId)
                            );
                        }

                        targetVideo.style.opacity = "1";
                        targetVideo.style.zIndex = "2";

                        if (oldVideo && oldVideo !== targetVideo) {
                            oldVideo.style.opacity = "0";
                            oldVideo.style.zIndex = "1";
                            oldVideo.pause();
                            oldVideo.onended = null;
                        }

                        activeSlotRef.current = targetSlot;
                        setActiveSlot(targetSlot);

                        playbackStartAtRef.current = startAt;
                        preloadedSlotRef.current = null;
                        preloadedStartAtRef.current = null;

                        scheduleNextPlayback(startAt);
                    } catch (error) {
                        loadingRef.current = false;
                        console.error(
                            "VISIBLE VIDEO PLAY ERROR =",
                            animation.name,
                            error
                        );
                        setTimeout(() => {
                            preloadAndSwitch(
                                playlist,
                                index,
                                options
                            );
                        }, 300);
                    }
                }, switchDelay);
            };
            preparePlayback();
        };

        const handleError = (error) => {
            if (readyHandled) return;
            readyHandled = true;
            targetVideo.oncanplay = null;
            targetVideo.onerror = null;
            loadingRef.current = false;
            console.error("VIDEO LOAD ERROR =", animation.name, error);
            setTimeout(() => {
                preloadAndSwitch(playlist, index, options);
            }, 500);
        };

        targetVideo.oncanplay = handleReady;
        targetVideo.onerror = handleError;
    }

    function switchPreloadedQueue(playlistId, duration, startAt) {
        const preloaded = preloadedQueueRef.current;
        if (!preloaded) return false;
        if (String(preloaded.playlistId) !== String(playlistId)) return false;

        const targetSlot = preloaded.slot;
        const targetVideo = videoRefs[targetSlot].current;
        if (!targetVideo) return false;
        const oldSlot = activeSlotRef.current;
        const oldVideo = videoRefs[oldSlot].current;

        console.log("========== SWITCH PRELOADED QUEUE ==========");
        console.log("PLAYLIST ID =", playlistId);
        console.log("TARGET SLOT =", targetSlot);
        console.log("TARGET VIDEO =", targetVideo.src);

        try {
            targetVideo.currentTime = 0;
            targetVideo.play().catch((error) => {
                console.error("PRELOADED VIDEO PLAY ERROR =", error);
            });

            playlistRef.current = preloaded.playlist;
            currentIndexRef.current = preloaded.index;
            currentPlaylistIdRef.current = playlistId;
            currentModeRef.current = "queue";
            const parsedDuration = Number(duration);
            if (Number.isFinite(parsedDuration) && parsedDuration > 0) {
                durationRef.current = parsedDuration;
            }
            targetVideo.style.opacity = "1";
            targetVideo.style.zIndex = "2";

            if (oldVideo && oldVideo !== targetVideo) {
                oldVideo.style.opacity = "0";
                oldVideo.style.zIndex = "1";
                oldVideo.pause();
                oldVideo.onended = null;
            }
            activeSlotRef.current = targetSlot;
            setActiveSlot(targetSlot);

            playbackStartAtRef.current =
                Number(startAt) || Date.now();

            preloadedSlotRef.current = null;
            preloadedStartAtRef.current = null;
            preloadedQueueRef.current = null;

            console.log("QUEUE SWITCHED TO =", playlistId);

            scheduleNextPlayback(playbackStartAtRef.current);
            return true;
        } catch (error) {
            console.error("SWITCH PRELOADED QUEUE ERROR =", error);
            return false;
        }
    }

    function scheduleNextPlayback(currentStartAt) {
        clearTimeout(cycleTimerRef.current);
        clearTimeout(interactionTimerRef.current);
        clearTimeout(preloadTimerRef.current);

        const mode = currentModeRef.current;
        const duration = Number(durationRef.current);
        if (!duration || duration <= 0) {
            console.error("INVALID PLAYBACK DURATION =", duration);
            return;
        }
        const nextStartAt = Number(currentStartAt) + duration * 1000;

        console.log("CURRENT START AT =", currentStartAt);
        console.log("NEXT START AT =", nextStartAt);

        if (mode !== "default") {
            const upcomingQueue = queueRef.current;

            if (Array.isArray(upcomingQueue) && upcomingQueue.length > 0) {
                const nextPlaylist = upcomingQueue[0];
                const nextAnimations = getNextPlaylistAnimations(
                    nextPlaylist,
                    currentDisplayRef.current
                );
                if (
                    Array.isArray(nextAnimations) &&
                    nextAnimations.length > 0
                ) {
                    const preloadLeadTime = Math.min(
                        2000,
                        Math.max(500, duration * 1000 - 100)
                    );
                    const preloadAt = Math.max(
                        Date.now(),
                        nextStartAt - preloadLeadTime
                    );
                    const preloadDelay = Math.max(0, preloadAt - Date.now());
                    console.log("QUEUE PRELOAD IN =", preloadDelay);

                    preloadTimerRef.current = setTimeout(() => {
                        preloadTimerRef.current = null;
                        console.log("========== PRELOAD QUEUE NEXT ==========");
                        console.log("NEXT PLAYLIST ID =", nextPlaylist.playlistId);
                        console.log("NEXT DURATION =", nextPlaylist.duration);
                        preloadAndSwitch(nextAnimations, 0, {
                            playlistId: nextPlaylist.playlistId,
                            duration: nextPlaylist.duration,
                            mode: "queue",
                            preloadOnly: true,
                            startAt: nextStartAt,
                        });
                    }, preloadDelay);
                }
            }

            const finishDelay = Math.max(0, nextStartAt - Date.now());
            interactionTimerRef.current = setTimeout(() => {
                interactionTimerRef.current = null;
                console.log("========== QUEUE DURATION FINISHED ==========");
                console.log("CURRENT PLAYLIST =", currentPlaylistIdRef.current);
                sendQueueFinished();
            }, finishDelay);

            return;
        }

        const preloadLeadTime = Math.min(
            2000,
            Math.max(500, duration * 1000 - 100)
        );
        const preloadAt = Math.max(Date.now(), nextStartAt - preloadLeadTime);
        const preloadDelay = Math.max(0, preloadAt - Date.now());
        console.log("NEXT VIDEO PRELOAD IN =", preloadDelay, "ms");

        preloadTimerRef.current = setTimeout(() => {
            preloadTimerRef.current = null;
            const nextIndex = getNextIndex();
            preloadAndSwitch(playlistRef.current, nextIndex, {
                startAt: nextStartAt,
            });
        }, preloadDelay);
    }

    function sendQueueFinished(playlistId = null) {
        const finishedPlaylistId =
            playlistId ?? currentPlaylistIdRef.current;
        if (!finishedPlaylistId || queueFinishedSentRef.current) {
            return;
        }
        queueFinishedSentRef.current = true;
        console.log("QUEUE FINISHED SENT =", finishedPlaylistId);
        if (
            window.electronAPI &&
            typeof window.electronAPI.sendMessage === "function"
        ) {
            window.electronAPI.sendMessage({
                type: "queue-finished",
                playlistId: finishedPlaylistId,
            });
        }
    }

    // Listen to layout messages from Electron
    useEffect(() => {
        console.log("VideoPlayer Mounted");
        if (!window.electronAPI) {
            console.log("Browser Mode");
            return;
        }

        window.electronAPI.onLayout((data) => {
            console.log("========== VIDEO PLAYER RECEIVE ==========");
            console.log(data);

            if (!data) return;
            const {
                displays,
                displayId,
                mode,
                playlistId,
                nextPlaylist,
                queue: receivedQueue,
                isMain: receivedIsMain,
                duration,
                startAt,
            } = data;

            console.log("PLAYLIST ID =", playlistId);

            const currentMode = mode || "default";

            console.log("NEXT PLAYLIST =", nextPlaylist);
            console.log("MODE =", currentMode);
            console.log("DISPLAYS =", displays);
            console.log("PLAYLIST ID =", playlistId);
            console.log("LAYOUT DURATION =", duration);
            console.log("LAYOUT START AT =", startAt);

            if (!Array.isArray(displays) || displays.length === 0) {
                console.log("No displays");
                return;
            }

            const display = displays[0];
            const resolvedDisplayId = Number(
                displayId ?? display.id ?? display.display_id
            );

            if (!Number.isFinite(resolvedDisplayId)) {
                console.error("INVALID DISPLAY ID", { displayId, display });
                return;
            }

            currentDisplayRef.current = { id: resolvedDisplayId };

            if (!display) {
                console.log("No display");
                return;
            }

            const animations = Array.isArray(display.animations) ? display.animations : [];
            if (!animations.length) {
                console.log("No Animation");
                return;
            }

            const playbackMode = display.playback_mode || "sequential";
            console.log("PLAYBACK MODE =", playbackMode);
            console.log(`Receive ${currentMode} Playlist:`, animations.length, animations);

            currentModeRef.current = currentMode;
            playbackModeRef.current = playbackMode;

            const isSameQueuePlaylist =
                currentMode === "queue" &&
                playlistId &&
                String(playlistId) === String(currentPlaylistIdRef.current);

                if (!isSameQueuePlaylist) {
                    if (currentMode === "queue") {
                        queueFinishedSentRef.current = false;
                    }
                }

                if (
                    currentMode === "queue" &&
                    Array.isArray(receivedQueue)
                ) {
                    queueRef.current = receivedQueue.map((item) => ({
                        ...item,
                    }));
                    console.log("========== FRONTEND QUEUE ==========");
                    console.log(
                        queueRef.current.map((item) => ({
                            playlistId: item.playlistId,
                            duration: item.duration,
                        }))
                    );
                } else if (currentMode === "default") {
                    queueRef.current = [];
                }

                // Save next queue playlist
                if (currentMode === "queue" && nextPlaylist) {
                    nextPlaylistRef.current = nextPlaylist;
                    nextPlaylistAnimationsRef.current = getNextPlaylistAnimations(
                        nextPlaylist,
                        display
                    );
                    console.log("========== SAVED NEXT QUEUE ==========");
                    console.log("NEXT PLAYLIST ID =", nextPlaylist.playlistId);
                    console.log("NEXT ANIMATIONS =", nextPlaylistAnimationsRef.current);
                } else if (currentMode === "queue" || currentMode === "default") {
                    nextPlaylistRef.current = null;
                    nextPlaylistAnimationsRef.current = [];
                }

                if (
                    currentMode === "queue" &&
                    playlistId &&
                    String(playlistId) !==
                        String(currentPlaylistIdRef.current)
                ) {

                    const switched =
                        switchPreloadedQueue(
                            playlistId,
                            duration,
                            startAt
                        );

                    if (switched) {

                        queueFinishedSentRef.current =
                            false;

                        console.log(
                            "USED PRELOADED QUEUE PLAYLIST =",
                            playlistId
                        );

                        return;
                    }
                }
                if (isSameQueuePlaylist) {
                    console.log("========== SAME QUEUE PLAYLIST ==========");
                    console.log("ALREADY PLAYING =", playlistId);

                    if (duration !== undefined && duration !== null) {
                        const newDuration = Number(duration);

                        if (Number.isFinite(newDuration) && newDuration > 0) {
                            durationRef.current = newDuration;
                            const correctedStartAt =
                                Number(startAt) || playbackStartAtRef.current || Date.now();
                            playbackStartAtRef.current = correctedStartAt;
                            console.log("UPDATED PLAYBACK DURATION =", durationRef.current);
                            console.log("CORRECTED PLAYBACK START AT =", playbackStartAtRef.current);
                            scheduleNextPlayback(playbackStartAtRef.current);
                        }
                    }
                    console.log("KEEP CURRENT VIDEO");
                    return;
                }

                isMainRef.current = !!receivedIsMain;
                const parsedDuration = Number(duration);
                if (Number.isFinite(parsedDuration) && parsedDuration > 0) {
                    durationRef.current = parsedDuration;
                }

                playbackStartAtRef.current = Number(startAt) || Date.now();
                console.log("IS MAIN =", isMainRef.current);
                console.log("PLAYBACK DURATION =", durationRef.current);
                console.log("PLAYLIST ID =", currentPlaylistIdRef.current);
                console.log("PLAYBACK START AT =", playbackStartAtRef.current);

                if (currentMode === "default") {
                    defaultPlaylistRef.current = animations;
                    console.log("========== SAVED DEFAULT ==========");
                    console.log(defaultPlaylistRef.current);
                }

                clearTimers();

                playlistRef.current = animations;
                currentIndexRef.current = 0;

                preloadAndSwitch(animations, 0, {
                    startAt: playbackStartAtRef.current,
                    playlistId: playlistId || null,
                    duration: duration,
                    mode: currentMode,
                });
            });
    }, []);

    useEffect(() => {
        return () => {
            clearTimers();
            videoRefs.forEach((ref) => {
                const video = ref.current;
                if (!video) return;
                video.pause();
                video.oncanplay = null;
                video.onended = null;
            });
        };
    }, []);

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background: "black",
            }}
        >
            <video
                ref={videoRefs[0]}
                muted
                playsInline
                preload="auto"
                loop
                controls={false}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    background: "black",
                    opacity: activeSlot === 0 ? 1 : 0,
                    zIndex: activeSlot === 0 ? 2 : 1,
                    transition: "none",
                }}
            />

            <video
                ref={videoRefs[1]}
                muted
                playsInline
                preload="auto"
                loop
                controls={false}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    background: "black",
                    opacity: activeSlot === 1 ? 1 : 0,
                    zIndex: activeSlot === 1 ? 2 : 1,
                    transition: "none",
                }}
            />
        </div>
    );
}
