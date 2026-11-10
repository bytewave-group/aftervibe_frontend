import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Background from "../components/common/background";
import NavigationBar from "../components/common/NavigationBar";
import BarAccessPopup from "../components/bar/BarAccessPopup";

import "../css/Global.css";
import "../css/Main.css";

import { BARS_URL, getApiUrl } from "../config/api";
import { applyTenantFromLocation, hasCustomerSession, loginRoute } from "../config/bar";

const SHORTCUTS = [
    { key: "checkin", label: "Check in", path: "/daily-checkin", image: "/images/checkin.png" },
    { key: "spin", label: "Spin", path: "/spinwheel", image: "/images/spinwheel.png" },
    { key: "mall", label: "Mall", path: "/mall", image: "/images/shop.png" },
    { key: "storage", label: "Storage", path: "/storage", image: "/images/storage.png" },
];

function formatCoins(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return "0.00";
    }

    return amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function HomePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const requireLogin = !hasCustomerSession();
    const [accessChecking, setAccessChecking] = useState(true);
    const [showAccessPopup, setShowAccessPopup] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [bannerIndex, setBannerIndex] = useState(0);
    const [home, setHome] = useState({
        balance: null,
        banners: [],
        spenders: [],
        artists: [],
    });

    const goToLogin = (event) => {
        event.preventDefault();
        event.stopPropagation();
        navigate(loginRoute(location.search));
    };

    useEffect(() => {
        const token = localStorage.getItem("customer_token");
        let cancelled = false;

        const loadHome = async () => {
            try {
                await applyTenantFromLocation(BARS_URL);
            } catch (error) {
                console.error("HOME TENANT ERROR =", error);
            }

            if (cancelled) {
                return;
            }

            try {
                const response = await fetch(`${getApiUrl()}/customer/home`, {
                    headers: {
                        Accept: "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                });
                const data = await response.json();

                if (!cancelled && response.ok && data.success) {
                    setHome({
                        balance: data.balance,
                        banners: data.banners || [],
                        spenders: data.spenders || [],
                        artists: data.artists || [],
                    });
                }
            } catch (error) {
                console.error("HOME ERROR =", error);
            }

            if (!token || cancelled) {
                return;
            }

            try {
                const unreadResponse = await fetch(`${getApiUrl()}/customer/notifications/unread-count`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                });
                const unreadData = await unreadResponse.json();

                if (!cancelled && unreadData.success) {
                    setUnreadCount(Number(unreadData.unread_count) || 0);
                }
            } catch (error) {
                console.error("UNREAD COUNT ERROR =", error);
            }
        };

        const checkBarAccess = async () => {
            if (!token) {
                setAccessChecking(false);
                return;
            }

            try {
                const response = await fetch(`${getApiUrl()}/bar/access-status`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                });
                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Unable to check bar access.");
                }

                setShowAccessPopup(!data.verified);
            } catch (error) {
                console.error("BAR ACCESS CHECK ERROR:", error);
                setShowAccessPopup(true);
            } finally {
                if (!cancelled) {
                    setAccessChecking(false);
                }
            }
        };

        loadHome().then(() => {
            if (!cancelled) {
                checkBarAccess();
            }
        });

        return () => {
            cancelled = true;
        };
    }, [location.search]);

    useEffect(() => {
        if (home.banners.length < 2) {
            return undefined;
        }

        const timer = setInterval(() => {
            setBannerIndex((current) => (current + 1) % home.banners.length);
        }, 4000);

        return () => clearInterval(timer);
    }, [home.banners.length]);

    const topSpender = home.spenders[0]?.name || t("No ranking yet");
    const topArtist = home.artists[0]?.name || t("No ranking yet");
    const banner = home.banners[bannerIndex];

    return (
        <div
            className="home-page home-vibe"
            onClickCapture={requireLogin ? goToLogin : undefined}
        >
            <Background />

            <div className="home-content">
                <header className="vibe-header">
                    <button type="button" className="vibe-balance" onClick={() => navigate("/wallet")}>
                        <CoinIcon />
                        <span>{formatCoins(home.balance)}</span>
                        <span className="vibe-plus">+</span>
                    </button>
                    <img className="vibe-logo" src="/images/voxx.png" alt="VOXX" />
                    <div className="vibe-header-actions">
                        <button type="button" className="vibe-icon-button" onClick={() => setShowAccessPopup(true)} aria-label={t("QR Code")}>
                            <QrIcon />
                        </button>
                        <button type="button" className="vibe-icon-button" onClick={() => navigate("/notifications")} aria-label={t("Notifications")}>
                            <BellIcon />
                            {unreadCount > 0 && (
                                <span className="header-notification-badge">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </button>
                    </div>
                </header>

                <section className="vibe-banner">
                    <div className="vibe-banner-frame">
                        {banner ? (
                            <img src={banner.image} alt={banner.name || t("Banner")} />
                        ) : (
                            <div className="vibe-banner-empty">{t("Banner")}</div>
                        )}
                    </div>
                    {home.banners.length > 1 && (
                        <div className="vibe-banner-dots">
                            {home.banners.map((item, index) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={index === bannerIndex ? "is-active" : ""}
                                    onClick={() => setBannerIndex(index)}
                                    aria-label={`${t("Banner")} ${index + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </section>

                <div className="vibe-ticker">
                    <div className="vibe-ticker-track">
                        {[0, 1].map((copy) => (
                            <div className="vibe-ticker-item" key={copy} aria-hidden={copy === 1}>
                                <span className="vibe-ticker-label">[{t("Tonight's board")}]</span>
                                <span>{t("Top spender", { name: topSpender })}</span>
                                <span className="vibe-ticker-gap">|</span>
                                <span>{t("Top artist", { name: topArtist })}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="vibe-shortcuts">
                    {SHORTCUTS.map((item) => (
                        <button key={item.key} type="button" className="vibe-shortcut" onClick={() => navigate(item.path)}>
                            <img className="vibe-shortcut-icon" src={item.image} alt="" />
                            <span>{t(item.label)}</span>
                        </button>
                    ))}
                </div>

                <RankBoard
                    title={t("Tonight's spenders")}
                    tone="spend"
                    rows={home.spenders}
                    emptyLabel={t("No ranking yet")}
                    valueKey="amount"
                    valueIcon="coin"
                />
                <RankBoard
                    title={t("Charm ranking")}
                    tone="charm"
                    rows={home.artists}
                    emptyLabel={t("No ranking yet")}
                    valueKey="gifts"
                    valueIcon="gift"
                />
            </div>

            <NavigationBar active="home" />

            {showAccessPopup && !accessChecking && (
                <BarAccessPopup
                    onSuccess={() => {
                        setShowAccessPopup(false);
                    }}
                />
            )}
        </div>
    );
}

function RankBoard({ title, tone, rows, emptyLabel, valueKey, valueIcon }) {
    return (
        <section className={`vibe-board vibe-board-${tone}`}>
            <h2>{title}</h2>
            {rows.length === 0 && <div className="vibe-board-empty">{emptyLabel}</div>}
            {rows.map((row) => (
                <div className={`vibe-rank${row.badge ? " has-badge" : ""}`} key={row.rank}>
                    <span className={`vibe-rank-no vibe-rank-no-${row.rank}`}>{row.rank}</span>
                    {row.image ? (
                        <img className="vibe-avatar" src={row.image} alt="" />
                    ) : (
                        <span className="vibe-avatar vibe-avatar-empty" />
                    )}
                    {row.badge && <img className="vibe-badge" src={row.badge} alt="" />}
                    <span className="vibe-rank-name">{row.name}</span>
                    <span className="vibe-rank-value">
                        {valueIcon === "coin" ? <DiamondIcon /> : <GiftIcon />}
                        {Number(row[valueKey] || 0).toLocaleString()}
                    </span>
                </div>
            ))}
        </section>
    );
}

function CoinIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v10M9.5 9.5c.6-.8 1.5-1.2 2.5-1.2 1.8 0 3 1 3 2.3S13.8 13 12 13s-3.2.8-3.2 2.4S10.2 17.7 12 17.7c1 0 1.9-.4 2.5-1.2" />
        </svg>
    );
}

function DiamondIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3 20 10 12 21 4 10Z" />
        </svg>
    );
}

function GiftIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 9h18v3H3z" />
            <path d="M5 12h14v8.2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V12z" />
            <path d="M11 9h2v12.2h-2z" />
            <path d="M12 9C9.6 9 8 7.6 8 6.2 8 4.6 9.4 3.6 11 4.8L12 6l1-1.2C14.6 3.6 16 4.6 16 6.2 16 7.6 14.4 9 12 9z" />
        </svg>
    );
}

function QrIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" />
        </svg>
    );
}

function BellIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15Z" />
            <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
    );
}

export default HomePage;
