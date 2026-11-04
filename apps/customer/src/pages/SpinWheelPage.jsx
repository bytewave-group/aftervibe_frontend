import { useState } from "react";

import Header from "../components/header/header";
import Background from "../components/common/background";
import NavigationBar from "../components/common/NavigationBar";

import "../css/Global.css";
import "../css/Main.css";

// Rewards array as specified in the prompt
const rewards = [
    {
        label: "5 POINTS",
        type: "points",
    },
    {
        label: "10 POINTS",
        type: "points",
    },
    {
        label: "15 POINTS",
        type: "points",
    },
    {
        label: "5 coins",
        type: "coins",
    },
    {
        label: "20 POINTS",
        type: "points",
    },
    {
        label: "10 coins",
        type: "coins",
    },
    {
        label: "30 POINTS",
        type: "points",
    },
    {
        label: "20 coins",
        type: "coins",
    },
];

const spinData = {
    chances: 1,
    nextSpin: "23:59:50",
    rewards: rewards,
};

function SpinWheelPage() {

    const [spinning, setSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);

    const handleSpin = () => {
        if (spinning || spinData.chances <= 0) return;
    
        setSpinning(true);
    
        // Random reward
        const winningIndex = Math.floor(Math.random() * rewards.length);
    
        // Each reward is 45 degrees apart
        const rewardAngle = winningIndex * 45;
    
        // Add several full rotations
        const extraRotation = 1440;
    
        // Stop the selected reward at the pointer (top)
        const targetRotation =
            extraRotation + (360 - rewardAngle);
    
        setRotation((prev) => prev + targetRotation);
    
        setTimeout(() => {
            setSpinning(false);
        }, 4000);
    };

    // Helper to render reward labels around the wheel
    const renderRewardLabels = () => {
        const radius = 160; 
        const center = 175; 
        return rewards.map((reward, idx) => {
            const angle = (idx * 45 - 90) * (Math.PI / 180); 
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            return (
                <div
                    key={idx}
                    className={`spin-wheel-reward reward-${idx} ${
                        reward.type === "coins"
                            ? "reward-coins"
                            : "reward-points"
                    }`}
                >
                    {reward.label}
                </div>
            );
        });
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
                                    ? "transform 4s cubic-bezier(0.15, 0.8, 0.25, 1)"
                                    : "none",
                            }}
                        >
                            {renderRewardLabels()}
                        </div>

                        <div className="spin-wheel-center">
                            <span>NEXT SPIN</span>
                            <strong>{spinData.nextSpin}</strong>
                        </div>

                        <div className="spin-wheel-pointer"></div>
                    </div>
                </section>

                {/* Chances */}
                <div className="spinwheel-chances gradient-label-red mb-3">
                    {spinData.chances} Chances Available
                </div>

                {/* Description */}
                <div className="spinwheel-info mb-3">
                    <div>You have one FREE SPIN a day,</div>
                    <div>there are no more Free Spins Today</div>
                </div>

                {/* Spin Button */}
                <div className="d-flex justify-content-center">
                    <button
                        className="cyan-border spinwheel-button w-100 mx-4"
                        onClick={handleSpin}
                        disabled={spinning}
                    >
                        {spinning ? "SPINNING..." : "SPIN"}
                    </button>
                </div>
            </div>

            <NavigationBar active="home" />
        </div>
    );
}

export default SpinWheelPage;