import Header from "../components/header/header";
import Background from "../components/common/background";
import NavigationBar from "../components/common/NavigationBar";

import "../css/Global.css";
import "../css/Main.css";

import { useEffect, useState } from "react";
import { getApiUrl } from "../config/api";

function DailyCheckinPage() {
    const [checkedIn, setCheckedIn] = useState(false);
    const [currentDay, setCurrentDay] = useState(1);
    const [loading, setLoading] = useState(true);
    const [coins, setCoins] = useState(0);

    useEffect(() => {
        checkinStatus();
    }, []);

    const checkinStatus = async () => {
        try {
            const token = localStorage.getItem("customer_token");
    
            // Check-in status
            const checkinResponse = await fetch(
                `${getApiUrl()}/customer/checkin/status`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }
            );
    
            const checkinData = await checkinResponse.json();
    
            console.log("CHECK-IN STATUS =", checkinData);
    
            if (checkinData.success) {
                setCheckedIn(checkinData.checked_in);
                setCurrentDay(checkinData.current_day);
            }
    
            // Customer balance / coins
            const balanceResponse = await fetch(
                `${getApiUrl()}/customer/balance`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }
            );
    
            const balanceData = await balanceResponse.json();
    
            console.log("CUSTOMER BALANCE =", balanceData);
    
            if (balanceData.success) {
                setCoins(balanceData.balance);
            }
    
        } catch (error) {
            console.error("CHECK-IN STATUS ERROR =", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckin = async () => {
        console.log("CHECK-IN BUTTON CLICKED");

        if (checkedIn) return;

        try {
            const token = localStorage.getItem("customer_token");
            const response = await fetch(
                `${getApiUrl()}/customer/checkin`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }
            );

            const data = await response.json();

            console.log("CHECK-IN RESPONSE =", data);

            if (data.success) {
                setCheckedIn(true);
                setCurrentDay(data.current_day);
            
                if (data.balance !== undefined) {
                    setCoins(data.balance);
                }
            }

        } catch (error) {

            console.error("CHECK-IN ERROR =", error);

        }
    };

    const days = [
        {
            day: "DAY 1",
            points: "5 COINS",
            image: "/assets/image/daily_checkin/coin.png",
            type: "coin",
            color: "yellow",
        },
        {
            day: "DAY 2",
            points: "5 COINS",
            image: "/assets/image/daily_checkin/coin.png",
            type: "coin",
            color: "yellow",
        },
        {
            day: "DAY 3",
            points: "5 COINS",
            image: "/assets/image/daily_checkin/coin.png",
            type: "coin",
            color: "yellow",
        },
        {
            day: "DAY 4",
            points: "10 COINS",
            image: "/assets/image/daily_checkin/crown.png",
            type: "crown",
            color: "red",
        },
        {
            day: "DAY 5",
            points: "10 COINS",
            image: "/assets/image/daily_checkin/coin.png",
            type: "coin",
            color: "yellow",
        },
        {
            day: "DAY 6",
            points: "15 COINS",
            image: "/assets/image/daily_checkin/coin.png",
            type: "coin",
            color: "yellow",
        },
        {
            day: "DAY 7",
            points: "20 COINS",
            image: "/assets/image/daily_checkin/crown.png",
            type: "crown",
            color: "red",
        },
    ];

    const displayDays = days.map((item, index) => {
        const dayNumber = index + 1;
    
        let status = "normal";
    
        if (checkedIn) {
            if (dayNumber <= currentDay) {
                status = "done";
            } else if (dayNumber === currentDay + 1 && currentDay < 7) {
                status = "active";
            }
        } else {
            if (dayNumber < currentDay) {
                status = "done";
            } else if (dayNumber === currentDay) {
                status = "active";
            }
        }
    
        return {
            ...item,
            status,
        };
    });

    return (
        <div className="home-page">
            <Background />

            <div className="home-content">
                <Header showBack />

                <div className="d-flex justify-content-center w-100 mt-4">
                    <section className="home-banner daily-banner mx-4">
                        <div className="daily-banner-iconbg">
                            <div className="daily-banner-icon">
                                <img
                                    src="/assets/image/daily_checkin/crown.png"
                                    alt="Daily Check-In"
                                />
                            </div>
                        </div>
                        <div className="daily-banner-info">
                            <h2>DAILY CHECK IN</h2>
                            <p>
                                The more consecutive days you insist on signing in,
                                the more rewarding you will be.
                            </p>
                        </div>
                    </section>
                </div>

                <div className="mb-4">
                    <section className="daily-balance mx-4 my-3">
                        <div className="daily-balance-card">
                            <span>MAIN WALLET</span>
                            <strong>RM 100.00</strong>
                            <img
                            src="/assets/image/home/wallet_3d.png"
                            alt="Wallet"
                            />
                        </div>
                        <div className="daily-balance-card">
                            <span>MY COINS</span>
                            <strong>{coins} COINS</strong>
                            <img
                                src="/assets/image/home/wallet_3d.png"
                                alt="Coins"
                            />
                        </div>
                        
                    </section>
                </div>

                <section className="purple-pink-border daily-days m-4">
                    {displayDays.map((item) => (
                        <div
                            key={item.day}
                            className={`daily-day ${item.status}`} 
                        >
                            <div className="daily-day-content">
                                <img
                                    src={item.image}
                                    alt={item.day}
                                    className={`daily-day-image ${item.type}`}
                                />
                                <div className={`daily-day-label gradient-label-${item.color}`}>
                                    {item.day}
                                </div>
                                <div className="daily-day-points pt-1">
                                    {item.points}
                                </div>
                            </div>

                            {item.status === "done" && (
                                <div className="done-text">
                                    DONE
                                </div>
                            )}
                        </div>
                    ))}
              
                </section>

                <div className="d-flex justify-content-center">
                    <button
                        className="daily-checkin-button cyan-border mx-4"
                        disabled={loading || checkedIn}
                        onClick={handleCheckin}
                    >
                        {loading
                            ? "LOADING..."
                            : checkedIn
                                ? "CHECKED IN"
                                : "CHECK IN"
                        }
                    </button>
                </div>
            </div>

            <NavigationBar active="home" />
        </div>
    );
}

export default DailyCheckinPage;