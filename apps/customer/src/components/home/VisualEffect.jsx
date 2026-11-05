import { useEffect, useRef, useState } from "react";
import { getDisplayApiUrl } from "../../config/api";
import "../../css/Gift.css";

export default function VisualEffect() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const lastPlaylistIdRef = useRef(null);
    const lastCountGroupRef = useRef(null);
    const countRef = useRef(0);

    useEffect(() => {
        let cancelled = false;
        let timeoutId;

        const processResult = (result) => {
            if (!result?.success) return;

            if (result.mode !== "interaction" || !result.playlist_id) {
                lastPlaylistIdRef.current = null;
                lastCountGroupRef.current = null;
                countRef.current = 0;

                setData(result);
                setError("");
                setLoading(false);
                return;
            }

            const group = result.count_group || {};

            const groupKey = JSON.stringify([
                group.sender_id ?? null,
                group.receiver_customer_id ?? null,
                group.receiver_staff_id ?? null,
                group.interaction_id ?? result.interaction?.id ?? null,
            ]);

            if (lastPlaylistIdRef.current !== result.playlist_id) {
                countRef.current =
                    lastCountGroupRef.current === groupKey
                        ? countRef.current + 1
                        : 1;

                lastPlaylistIdRef.current = result.playlist_id;
                lastCountGroupRef.current = groupKey;
            }

            setData({
                ...result,
                interaction: {
                    ...result.interaction,
                    quantity: countRef.current,
                },
            });

            setError("");
            setLoading(false);
        };

        // Electron: receive data from main.js
        if (window.electronAPI?.onVisualEffect) {
            const unsubscribe = window.electronAPI.onVisualEffect((result) => {
                if (cancelled) return;

                processResult(result);
            });

            return () => {
                cancelled = true;
                if (typeof unsubscribe === "function") unsubscribe();
            };
        }

        // Browser preview: fetch API directly
        async function loadEffect() {
            try {
                const barId =
                    new URLSearchParams(window.location.hash.split("?")[1] || "").get("bar_id") || "";
                const url = getDisplayApiUrl(barId);
                const response = await fetch(url, {
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${import.meta.env.VITE_BAR_TOKEN}`,
                    },
                    cache: "no-store",
                });

                const text = await response.text();

                if (!text.trim()) {
                    throw new Error(`Empty API response: ${response.status}`);
                }

                const result = JSON.parse(text);

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || `API error: ${response.status}`
                    );
                }

                if (!cancelled) processResult(result);
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Unable to load visual effect.");
                    setLoading(false);
                }
            } finally {
                if (!cancelled) {
                    timeoutId = setTimeout(loadEffect, 2000);
                }
            }
        }

        loadEffect();

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, []);

    if (loading) {
        return <div className="visual-effect-page">Loading...</div>;
    }

    if (error) {
        return (
            <div className="visual-effect-page">
                <div className="visual-effect-message">
                    Failed to load: {error}
                </div>
            </div>
        );
    }

    const isPlayingInteraction = data?.mode === "interaction";
    const interaction = isPlayingInteraction ? data?.interaction : null;
    const imageUrl = interaction?.showcase_image_url;
    const displays = data?.displays || [];
    const sender = data?.sender_info || null;
    const receiver = data?.receiver_info || null;

    const getAvatarUrl = (avatar) => {
        if (!avatar || typeof avatar !== "string") return null;
        if (/^https?:\/\//i.test(avatar)) return avatar;
        return null;
    };

    const renderUser = (user, role) => {
        const name = user?.name || user?.username || role;
        const avatarUrl = getAvatarUrl(user?.avatar);

        return (
            <div
                className={`visual-effect-user visual-effect-${role.toLowerCase()}`}
            >
                <div className="visual-effect-avatar">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={name}
                            className="visual-effect-avatar-image"
                        />
                    ) : (
                        "👤"
                    )}
                </div>

                <div className="visual-effect-username">{name}</div>
                <div className="visual-effect-role">{role}</div>
            </div>
        );
    };

    return (
        <div className="visual-effect-page">
            <div
                key={data?.playlist_id || "default"}
                className={`visual-effect-card ${
                    isPlayingInteraction ? "is-playing" : "is-idle"
                }`}
            >
                {renderUser(sender, "Sender")}

                <div className="visual-effect-gift">
                    {imageUrl && (
                        <div className="visual-effect-media">
                            <img
                                key={data?.playlist_id || imageUrl}
                                src={imageUrl}
                                alt={interaction?.name || "Visual effect"}
                                className="visual-effect-gift-image"
                            />
                        </div>
                    )}

                    <div className="visual-effect-gift-name">
                        {interaction?.name || "No active interaction"}
                    </div>

                    <div
                        key={`quantity-${data?.playlist_id}-${interaction?.quantity}`}
                        className="visual-effect-gift-quantity"
                    >
                        ×{interaction?.quantity || 1}
                    </div>
                </div>

                {renderUser(receiver, "Receiver")}
            </div>

            {displays.length === 0 && (
                <div className="visual-effect-status">
                    No display data available
                </div>
            )}
        </div>
    );
}
