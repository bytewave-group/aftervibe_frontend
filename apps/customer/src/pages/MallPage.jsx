import { useCallback, useEffect, useMemo, useState } from "react";

import Header from "../components/header/header";
import Background from "../components/common/background";
import NavigationBar from "../components/common/NavigationBar";
import { apiErrorMessage, customerFetch } from "../config/customerApi";

import "../css/Global.css";
import "../css/Main.css";

const TYPE_LABELS = {
    free_drink: "DRINK",
    free_food: "FOOD",
    discount: "DISCOUNT",
    voucher: "VOUCHER",
};

const STATUS_LABELS = {
    unused: "READY TO USE",
    used: "USED",
    expired: "EXPIRED",
    cancelled: "CANCELLED",
};

function formatDate(value) {
    if (!value) return null;

    const date = new Date(value.replace(" ", "T"));

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function MallPage() {
    const [tab, setTab] = useState("mall");
    const [category, setCategory] = useState("all");
    const [packages, setPackages] = useState([]);
    const [enabled, setEnabled] = useState(true);
    const [redemptions, setRedemptions] = useState([]);
    const [points, setPoints] = useState(0);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [message, setMessage] = useState("");

    const showMessage = (text) => {
        setMessage(text);
        setTimeout(() => setMessage(""), 2500);
    };

    const loadPoints = useCallback(async () => {
        const { ok, data } = await customerFetch("/customer/me");

        if (ok) {
            setPoints(Number(data.customer?.reward_points ?? 0));
        }
    }, []);

    const loadRedemptions = useCallback(async () => {
        const { ok, data } = await customerFetch("/customer/reward-redemptions");

        if (ok) {
            setRedemptions(data.redemptions || []);
        }
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const { ok, data } = await customerFetch("/customer/rewards");

                if (ok) {
                    setEnabled(data.enabled !== false);
                    setPackages(data.packages || []);
                }

                await Promise.all([loadPoints(), loadRedemptions()]);
            } catch (error) {
                console.error("MALL LOAD ERROR =", error);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [loadPoints, loadRedemptions]);

    const categories = useMemo(
        () => [...new Set(packages.map((pkg) => pkg.type).filter(Boolean))],
        [packages]
    );

    const visiblePackages = category === "all"
        ? packages
        : packages.filter((pkg) => pkg.type === category);

    const handleRedeem = async (pkg) => {
        if (busyId) return;

        if (!window.confirm(`Redeem ${pkg.name} for ${Number(pkg.points_required).toLocaleString()} pts?`)) {
            return;
        }

        setBusyId(`redeem-${pkg.id}`);

        try {
            const { ok, data } = await customerFetch(`/customer/rewards/${pkg.id}/redeem`, { method: "POST" });

            if (!ok) {
                showMessage(apiErrorMessage(data, "Redeem failed."));
                return;
            }

            setPoints(Number(data.reward_points));
            setPackages((items) => items
                .map((item) => (item.id === pkg.id && item.stock != null ? { ...item, stock: item.stock - 1 } : item))
                .filter((item) => item.stock == null || item.stock > 0));
            await loadRedemptions();
            showMessage(`${pkg.name} redeemed. Find it in MY REWARDS.`);
        } catch (error) {
            console.error("REDEEM ERROR =", error);
            showMessage("Redeem failed.");
        } finally {
            setBusyId(null);
        }
    };

    const handleUse = async (redemption) => {
        if (busyId) return;

        if (!window.confirm("Use this reward now? Show this screen to the staff. It cannot be undone.")) {
            return;
        }

        setBusyId(`use-${redemption.id}`);

        try {
            const { ok, data } = await customerFetch(`/customer/reward-redemptions/${redemption.id}/use`, { method: "POST" });

            if (!ok) {
                showMessage(apiErrorMessage(data, "Unable to use this reward."));
                await loadRedemptions();
                return;
            }

            await loadRedemptions();
            showMessage("Reward used.");
        } catch (error) {
            console.error("USE REWARD ERROR =", error);
            showMessage("Unable to use this reward.");
        } finally {
            setBusyId(null);
        }
    };

    const renderPackages = () => {
        if (loading) {
            return <div className="mall-empty">Loading...</div>;
        }

        if (!enabled) {
            return <div className="mall-empty">Reward redemption is currently unavailable.</div>;
        }

        if (visiblePackages.length === 0) {
            return <div className="mall-empty">No rewards available right now.</div>;
        }

        return (
            <section className="mall-products mx-4">
                {visiblePackages.map((pkg) => {
                    const notEnough = points < Number(pkg.points_required);

                    return (
                        <div className="mall-product" key={pkg.id}>
                            <div className="mall-product-image-wrapper mb-2">
                                <div className="mall-product-glow"></div>
                                <img
                                    src={pkg.media?.file_path || "/assets/image/home/gift.png"}
                                    alt={pkg.name}
                                    className="mall-product-image"
                                />
                            </div>

                            <div className="gradient-label-red w-75">
                                <div className="mall-product-name text-nowrap py-2">
                                    {pkg.name}
                                </div>

                                <div className="mall-product-points">
                                    {Number(pkg.points_required).toLocaleString()} pts
                                </div>
                            </div>

                            {pkg.stock != null && (
                                <div className="mall-product-stock">{pkg.stock} left</div>
                            )}

                            <button
                                className="mall-redeem-button w-75"
                                disabled={notEnough || busyId !== null}
                                onClick={() => handleRedeem(pkg)}
                            >
                                {busyId === `redeem-${pkg.id}`
                                    ? "REDEEMING..."
                                    : notEnough ? "NOT ENOUGH POINTS" : "REDEEM THIS"}
                            </button>
                        </div>
                    );
                })}
            </section>
        );
    };

    const renderRedemptions = () => {
        if (loading) {
            return <div className="mall-empty">Loading...</div>;
        }

        if (redemptions.length === 0) {
            return <div className="mall-empty">You have not redeemed any rewards yet.</div>;
        }

        return (
            <section className="mall-redemptions mx-4">
                {redemptions.map((redemption) => {
                    const pkg = redemption.reward_package;
                    const expiresAt = formatDate(redemption.expires_at);

                    return (
                        <div
                            key={redemption.id}
                            className={`mall-redemption purple-pink-border ${redemption.status}`}
                        >
                            <img
                                src={pkg?.media?.file_path || "/assets/image/home/gift.png"}
                                alt={pkg?.name || "Reward"}
                                className="mall-redemption-image"
                            />

                            <div className="mall-redemption-info">
                                <div className="mall-redemption-name">{pkg?.name || "Reward"}</div>
                                <div className="mall-redemption-meta">
                                    {Number(redemption.points_used).toLocaleString()} pts · Redeemed {formatDate(redemption.redeemed_at)}
                                </div>
                                {redemption.status === "used" && redemption.used_at && (
                                    <div className="mall-redemption-meta">Used {formatDate(redemption.used_at)}</div>
                                )}
                                {redemption.status === "unused" && expiresAt && (
                                    <div className="mall-redemption-meta">Valid until {expiresAt}</div>
                                )}
                                <div className={`mall-redemption-status ${redemption.status}`}>
                                    {STATUS_LABELS[redemption.status] || redemption.status}
                                </div>
                            </div>

                            {redemption.status === "unused" && (
                                <button
                                    className="mall-redeem-button mall-use-button"
                                    disabled={busyId !== null}
                                    onClick={() => handleUse(redemption)}
                                >
                                    {busyId === `use-${redemption.id}` ? "..." : "USE"}
                                </button>
                            )}
                        </div>
                    );
                })}
            </section>
        );
    };

    return (
        <div className="home-page">
            <Background />

            <div className="home-content">
                {message && (
                    <div className="wallet-success-message">{message}</div>
                )}

                <Header showBack />

                {/* Title */}
                <div className="spinwheel-title mall-title mb-4">
                    MALL
                </div>

                {/* My Points */}
                <section className="mall-points mx-4">
                    <div className="mall-points-info">
                        <div className="infotitle">MY POINTS</div>
                        <div className="info">{points.toLocaleString()} pts</div>
                    </div>

                    <img
                        src="/assets/image/daily_checkin/coin.png"
                        alt="Points"
                    />
                </section>

                {/* Mall / My Rewards */}
                <div className="mall-categories d-flex justify-content-center mx-4">
                    <button
                        className={`mall-category ${tab === "mall" ? "active" : ""}`}
                        onClick={() => setTab("mall")}
                    >
                        REWARDS
                    </button>

                    <button
                        className={`mall-category ${tab === "mine" ? "active" : ""}`}
                        onClick={() => setTab("mine")}
                    >
                        MY REWARDS
                    </button>
                </div>

                {tab === "mall" && categories.length > 1 && (
                    <div className="mall-categories mall-categories-wrap d-flex justify-content-center mx-4">
                        <button
                            className={`mall-category ${category === "all" ? "active" : ""}`}
                            onClick={() => setCategory("all")}
                        >
                            ALL
                        </button>

                        {categories.map((type) => (
                            <button
                                key={type}
                                className={`mall-category ${category === type ? "active" : ""}`}
                                onClick={() => setCategory(type)}
                            >
                                {TYPE_LABELS[type] || type.toUpperCase()}
                            </button>
                        ))}
                    </div>
                )}

                {tab === "mall" ? renderPackages() : renderRedemptions()}
            </div>

            <NavigationBar active="mall" />
        </div>
    );
}

export default MallPage;
