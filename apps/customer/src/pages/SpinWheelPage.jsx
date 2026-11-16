import { useCallback, useEffect, useState } from "react";

import Header from "../components/header/Header";
import Background from "../components/common/Background";
import NavigationBar from "../components/common/NavigationBar";
import { apiErrorMessage, customerFetch } from "../config/customerApi";

import "../css/Global.css";
import "../css/Main.css";

const SLOT_ANGLE = 45;
const SPIN_DURATION_MS = 4000;

const PAY_LABELS = {
    coins: "COINS",
    points: "POINTS",
};

function formatCountdown(totalSeconds) {
    const seconds = Math.max(0, totalSeconds);
    const pad = (value) => String(value).padStart(2, "0");

    return [
        Math.floor(seconds / 3600),
        Math.floor((seconds % 3600) / 60),
        seconds % 60,
    ].map(pad).join(":");
}

function SpinWheelPage() {
    const [prizes, setPrizes] = useState([]);
    const [chances, setChances] = useState(0);
    const [dailyChances, setDailyChances] = useState(0);
    const [nextSpinSeconds, setNextSpinSeconds] = useState(0);
    const [cost, setCost] = useState({ coins: null, points: null });
    const [wallet, setWallet] = useState({ coins: 0, points: 0 });
    const [loading, setLoading] = useState(true);
    const [spinning, setSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [message, setMessage] = useState("");

    const loadStatus = useCallback(async () => {
        try {
            const { ok, data } = await customerFetch("/customer/spin-wheel");

            console.log("SPIN WHEEL STATUS =", data);

            if (ok) {
                setPrizes(data.prizes || []);
                setChances(data.chances);
                setDailyChances(data.daily_chances);
                setNextSpinSeconds(data.next_spin_seconds);
                setCost(data.cost || { coins: null, points: null });
                setWallet({ coins: Number(data.balance) || 0, points: Number(data.reward_points) || 0 });
            }
        } catch (error) {
            console.error("SPIN WHEEL STATUS ERROR =", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

    // Count down to the next free spin, then reload the chances
    useEffect(() => {
        if (nextSpinSeconds <= 0) return;

        const timer = setTimeout(() => {
            if (nextSpinSeconds === 1) {
                loadStatus();
            }

            setNextSpinSeconds((seconds) => seconds - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [nextSpinSeconds, loadStatus]);

    const paidOptions = ["coins", "points"].filter((type) => cost[type] != null);
    const canAfford = (type) => wallet[type] >= cost[type];

    const handleSpin = async (payWith = null) => {
        if (spinning || loading) return;

        setSpinning(true);
        setMessage("");

        try {
            const { ok, data } = await customerFetch("/customer/spin-wheel/spin", {
                method: "POST",
                body: payWith ? { pay_with: payWith } : undefined,
            });

            console.log("SPIN RESULT =", data);

            if (!ok) {
                setMessage(apiErrorMessage(data, "Spin failed. Please try again."));
                setSpinning(false);
                loadStatus();
                return;
            }

            setWallet({ coins: Number(data.balance) || 0, points: Number(data.reward_points) || 0 });

            // Slot 0 is at the top and slots go clockwise, so stop at -index * 45deg
            setRotation((prev) => {
                const current = ((prev % 360) + 360) % 360;
                const target = (360 - data.prize_index * SLOT_ANGLE) % 360;

                return prev + 1440 + ((target - current + 360) % 360);
            });

            setTimeout(() => {
                setSpinning(false);
                setChances(data.chances);
                setMessage(`YOU WON ${data.prize.label}!`);
                loadStatus();
            }, SPIN_DURATION_MS);
        } catch (error) {
            console.error("SPIN ERROR =", error);
            setMessage("Spin failed. Please try again.");
            setSpinning(false);
        }
    };

    const renderRewardLabels = () => {
        return prizes.map((prize, idx) => (
            <div
                key={idx}
                className={`spin-wheel-reward reward-${idx} ${
                    prize.type === "coins"
                        ? "reward-coins"
                        : "reward-points"
                }`}
            >
                {prize.label}
            </div>
        ));
    };

    const renderInfo = () => {
        if (loading) {
            return <div>Loading...</div>;
        }

        if (dailyChances <= 0 && paidOptions.length === 0) {
            return <div>The spin wheel is currently unavailable.</div>;
        }

        const paidText = paidOptions
            .map((type) => `${Number(cost[type]).toLocaleString()} ${PAY_LABELS[type]}`)
            .join(" or ");

        return (
            <>
                {dailyChances > 0 && (
                    <div>
                        You have {dailyChances} FREE {dailyChances === 1 ? "SPIN" : "SPINS"} a day,{" "}
                        {chances > 0
                            ? `${chances} ${chances === 1 ? "spin" : "spins"} left today`
                            : "there are no more Free Spins Today"}
                    </div>
                )}
                {paidOptions.length > 0 && (
                    <div>
                        {dailyChances > 0 ? "After that, spin" : "Spin"} for {paidText} each
                    </div>
                )}
                <div>
                    My coins: {wallet.coins.toLocaleString()} · My points: {wallet.points.toLocaleString()}
                </div>
            </>
        );
    };

    const renderButtons = () => {
        if (chances > 0 || (paidOptions.length === 0 && !loading)) {
            return (
                <button
                    className="cyan-border spinwheel-button w-100 mx-4"
                    onClick={() => handleSpin()}
                    disabled={spinning || loading || chances <= 0}
                >
                    {spinning ? "SPINNING..." : chances > 0 ? "FREE SPIN" : "NO SPINS LEFT"}
                </button>
            );
        }

        return paidOptions.map((type) => (
            <button
                key={type}
                className="cyan-border spinwheel-button w-100 mx-2"
                onClick={() => handleSpin(type)}
                disabled={spinning || loading || !canAfford(type)}
            >
                {spinning
                    ? "SPINNING..."
                    : canAfford(type)
                        ? `SPIN · ${Number(cost[type]).toLocaleString()} ${PAY_LABELS[type]}`
                        : `NOT ENOUGH ${PAY_LABELS[type]}`}
            </button>
        ));
    };

    return (
        <div className="home-page">
            <Background />

            <div className="home-content">
                <Header showBack />

                {/* Title */}
                <div className="spinwheel-title mb-5">
                    LUCKY SPIN WHEEL
                </div>

                {/* Wheel */}
                <section className="spinwheel-section">
                    <div className="spin-wheel-wrapper">
                        <div
                            className="spin-wheel"
                            style={{
                                transform: `rotate(${rotation}deg)`,
                                transition: spinning
                                    ? `transform ${SPIN_DURATION_MS / 1000}s cubic-bezier(0.15, 0.8, 0.25, 1)`
                                    : "none",
                            }}
                        >
                            {renderRewardLabels()}
                        </div>

                        <div className="spin-wheel-center">
                            <span>{dailyChances > 0 ? "NEXT FREE SPIN" : "SPIN"}</span>
                            <strong>
                                {dailyChances <= 0
                                    ? "PAID"
                                    : chances > 0 ? "NOW" : formatCountdown(nextSpinSeconds)}
                            </strong>
                        </div>

                        <div className="spin-wheel-pointer"></div>
                    </div>
                </section>

                {/* Chances */}
                <div className="spinwheel-chances gradient-label-red mb-3">
                    {chances} Free {chances === 1 ? "Chance" : "Chances"} Available
                </div>

                {/* Description */}
                <div className="spinwheel-info mb-3">
                    {message && <div>{message}</div>}
                    {renderInfo()}
                </div>

                {/* Spin Button(s) */}
                <div className="d-flex justify-content-center mx-2">
                    {renderButtons()}
                </div>
            </div>

            <NavigationBar active="home" />
        </div>
    );
}

export default SpinWheelPage;
