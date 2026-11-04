
function getNextIndex(playlist, currentIndex, playbackMode) {
    if (!Array.isArray(playlist) || playlist.length <= 1) {
        return 0;
    }

    if (playbackMode === "random") {
        let nextIndex = currentIndex;

        do {
            nextIndex = Math.floor(Math.random() * playlist.length);
        } while (nextIndex === currentIndex);

        return nextIndex;
    }

    return (currentIndex + 1) % playlist.length;
}

function resolveDuration(value, fallback) {
    const duration = Number(value);

    if (Number.isFinite(duration) && duration > 0) {
        return duration;
    }

    return fallback;
}

function createPlayer({ findClip, client, onQueueFinished }) {
    const defaults = new Map();
    const pausedDefaults = new Map();
    const queueConnectTimers = new Map();
    const queue = {
        playlistId: null,
        timer: null,
        startAt: null,
        duration: null,
        finishedSent: false,
        connected: new Set(),
    };

    async function connectNow(displayId, animationName) {
        if (!animationName) {
            console.error("INVALID ANIMATION");
            return;
        }

        try {
            const clip = await findClip(displayId, animationName);

            if (!clip) {
                console.error(
                    `RESOLUME CLIP NOT MAPPED DISPLAY ${displayId} NAME ${animationName}`
                );
                return;
            }

            if (clip.ambiguous) {
                console.error(
                    `RESOLUME CLIP AMBIGUOUS DISPLAY ${displayId} NAME ${animationName} LAYERS ${clip.layers.join(" ")}`
                );
                return;
            }

            console.log(
                "RESOLUME CONNECT =",
                displayId,
                animationName,
                clip.layer,
                clip.clip
            );

            await client.connectClip(clip.layer, clip.clip);
        } catch (error) {
            console.error("RESOLUME CONNECT FAILED =", error.message);
        }
    }

    function defaultNames(playlist, startIndex) {
        const names = [];
        const count = Array.isArray(playlist) ? playlist.length : 0;

        for (let offset = 0; offset < count; offset += 1) {
            const name = playlist[(startIndex + offset) % count]?.name;

            if (name && !names.includes(name)) {
                names.push(name);
            }
        }

        return names;
    }

    async function connectDefault(displayId, playlist, index) {
        const names = defaultNames(playlist, index);
        const preferred = names[0];

        if (!preferred) {
            console.error("INVALID ANIMATION");
            return;
        }

        try {
            for (const name of names) {
                const clip = await findClip(displayId, name);

                if (!clip || clip.ambiguous) {
                    continue;
                }

                if (name !== preferred) {
                    console.log(
                        "RESOLUME DEFAULT FALLBACK =",
                        displayId,
                        preferred,
                        name
                    );
                }

                console.log(
                    "RESOLUME CONNECT =",
                    displayId,
                    name,
                    clip.layer,
                    clip.clip
                );

                await client.connectClip(clip.layer, clip.clip);
                return;
            }
        } catch (error) {
            console.error("RESOLUME CONNECT FAILED =", error.message);
            return;
        }

        console.error(
            `RESOLUME CLIP NOT MAPPED DISPLAY ${displayId} NAME ${preferred}`
        );
    }

    function clearQueueConnects() {
        queueConnectTimers.forEach((timer) => {
            clearTimeout(timer);
        });
        queueConnectTimers.clear();
    }

    function stopDefault(displayId, remember) {
        const state = defaults.get(displayId);

        if (!state) {
            return;
        }

        clearTimeout(state.timer);
        clearTimeout(state.connectTimer);
        defaults.delete(displayId);

        if (remember) {
            pausedDefaults.set(displayId, state);
        }
    }

    function resumeDefaults() {
        pausedDefaults.forEach((state, displayId) => {
            state.index = getNextIndex(
                state.playlist,
                state.index,
                state.playbackMode
            );
            state.generation += 1;
            state.timer = null;
            state.connectTimer = null;
            defaults.set(displayId, state);
            console.log("RESUME DEFAULT DISPLAY =", displayId, state.index);
            armClip(displayId, state, Date.now());
        });
        pausedDefaults.clear();
    }

    function finishQueue(playlistId) {
        if (queue.finishedSent) {
            return;
        }

        if (String(queue.playlistId) !== String(playlistId)) {
            return;
        }

        queue.finishedSent = true;
        queue.playlistId = null;
        queue.connected.clear();
        clearQueueConnects();
        resumeDefaults();

        console.log("========== QUEUE DURATION FINISHED ==========");
        console.log("CURRENT PLAYLIST =", playlistId);

        if (typeof onQueueFinished === "function") {
            onQueueFinished(playlistId);
        }
    }

    function scheduleFinish() {
        clearTimeout(queue.timer);

        const playlistId = queue.playlistId;
        const startAt = queue.startAt;
        const duration = queue.duration;

        if (!duration || playlistId == null) {
            return;
        }

        const delay = Math.max(0, startAt + duration * 1000 - Date.now());

        console.log("CURRENT START AT =", startAt);
        console.log("NEXT START AT =", startAt + duration * 1000);

        queue.timer = setTimeout(() => {
            queue.timer = null;
            finishQueue(playlistId);
        }, delay);
    }

    function scheduleQueueConnect(displayId, animationName, startAt, playlistId) {
        const existing = queueConnectTimers.get(displayId);

        if (existing) {
            clearTimeout(existing);
        }

        const delay = Math.max(0, startAt - Date.now());
        const timer = setTimeout(() => {
            queueConnectTimers.delete(displayId);

            if (queue.finishedSent) {
                return;
            }

            if (String(queue.playlistId) !== String(playlistId)) {
                return;
            }

            connectNow(displayId, animationName);
        }, delay);

        queueConnectTimers.set(displayId, timer);
    }

    function scheduleDefaultNext(displayId, currentStartAt, generation) {
        const state = defaults.get(displayId);

        if (!state || state.generation !== generation) {
            return;
        }

        const nextStartAt = currentStartAt + state.duration * 1000;
        const delay = Math.max(0, nextStartAt - Date.now());

        state.timer = setTimeout(() => {
            const current = defaults.get(displayId);

            if (!current || current.generation !== generation) {
                return;
            }

            current.timer = null;
            current.index = getNextIndex(
                current.playlist,
                current.index,
                current.playbackMode
            );

            console.log(
                current.playbackMode === "random"
                    ? "RANDOM NEXT VIDEO ="
                    : "SEQUENTIAL NEXT VIDEO =",
                current.index
            );

            armClip(displayId, current, nextStartAt);
        }, delay);
    }

    function armClip(displayId, state, startAt) {
        const generation = state.generation;
        const playlist = state.playlist;
        const index = state.index;
        const delay = Math.max(0, startAt - Date.now());

        state.connectTimer = setTimeout(() => {
            const current = defaults.get(displayId);

            if (!current || current.generation !== generation) {
                return;
            }

            current.connectTimer = null;
            connectDefault(displayId, playlist, index);
            scheduleDefaultNext(displayId, startAt, generation);
        }, delay);
    }

    function handleQueue(displayId, payload) {
        const playlistId = payload.playlistId ?? null;
        const startAt = Number(payload.startAt) || Date.now();
        const animations = payload.displays?.[0]?.animations ?? [];
        const animation = animations[0];
        const same = queue.playlistId != null
            && !queue.finishedSent
            && String(queue.playlistId) === String(playlistId);

        if (!same) {
            stopDefault(displayId, true);
            clearTimeout(queue.timer);
            clearQueueConnects();
            queue.playlistId = playlistId;
            queue.finishedSent = false;
            queue.connected = new Set();
            queue.startAt = startAt;
            queue.duration = resolveDuration(payload.duration, 10);
            scheduleFinish();
        } else {
            const nextDuration = resolveDuration(payload.duration, null);
            const nextStartAt = Number(payload.startAt) || queue.startAt;

            if (
                nextDuration
                && (nextDuration !== queue.duration || nextStartAt !== queue.startAt)
            ) {
                queue.duration = nextDuration;
                queue.startAt = nextStartAt;
                console.log("UPDATED PLAYBACK DURATION =", queue.duration);
                console.log("CORRECTED PLAYBACK START AT =", queue.startAt);
                scheduleFinish();
            }
        }

        if (queue.connected.has(displayId)) {
            console.log("========== SAME QUEUE PLAYLIST ==========");
            console.log("ALREADY PLAYING =", playlistId);
            return;
        }

        queue.connected.add(displayId);
        stopDefault(displayId, true);

        if (!animation?.name) {
            console.log("No Animation");
            return;
        }

        console.log(
            "========== RESOLUME QUEUE ==========",
            displayId,
            animation.name
        );

        scheduleQueueConnect(displayId, animation.name, startAt, playlistId);
    }

    function handleDefault(displayId, payload) {
        if (queue.playlistId != null && !queue.finishedSent) {
            console.log(
                `SKIP DEFAULT UPDATE - CURRENT MODE = queue`
            );
            return;
        }

        const display = payload.displays?.[0];
        const animations = Array.isArray(display?.animations)
            ? display.animations
            : [];

        if (!animations.length) {
            console.log("No Animation");
            return;
        }

        const previous = defaults.get(displayId);

        if (previous) {
            clearTimeout(previous.timer);
            clearTimeout(previous.connectTimer);
        }

        const state = {
            playlist: animations,
            index: 0,
            duration: resolveDuration(
                payload.duration,
                previous?.duration || 10
            ),
            playbackMode: display.playback_mode || "sequential",
            generation: (previous?.generation || 0) + 1,
            timer: null,
            connectTimer: null,
        };

        defaults.set(displayId, state);

        const startAt = Number(payload.startAt) || Date.now();

        console.log("PLAYBACK MODE =", state.playbackMode);
        console.log("PLAYBACK DURATION =", state.duration);
        console.log("PLAYBACK START AT =", startAt);

        armClip(displayId, state, startAt);
    }

    function play(displayId, payload) {
        const id = Number(displayId);

        if (!payload) {
            return;
        }

        const mode = payload.mode || "default";

        if (mode === "queue") {
            handleQueue(id, payload);
            return;
        }

        handleDefault(id, payload);
    }

    function stopDisplay(displayId) {
        const id = Number(displayId);
        stopDefault(id);
        pausedDefaults.delete(id);

        const timer = queueConnectTimers.get(id);

        if (timer) {
            clearTimeout(timer);
            queueConnectTimers.delete(id);
        }

        queue.connected.delete(id);
    }

    return {
        play,
        stopDisplay,
    };
}

module.exports = {
    createPlayer,
    getNextIndex,
    resolveDuration,
};
