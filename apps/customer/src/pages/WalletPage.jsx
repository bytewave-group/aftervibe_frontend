import Header from "../components/header/header";
import Background from "../components/common/Background";
import NavigationBar from "../components/common/NavigationBar";

import "../css/Global.css";
import "../css/Main.css";

import { useEffect, useState } from "react";
import { getApiUrl } from "../config/api";

function WalletPage() {
    const [coins, setCoins] = useState(0);
    const [balance] = useState(100.00);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const [coinPackages, setCoinPackages] = useState([]);

    // Get current customer coin balance
    const fetchBalance = async () => {
        try {
            const token = localStorage.getItem("customer_token");

            const response = await fetch(
                `${getApiUrl()}/customer/balance`,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json",
                    },
                }
            );

            const data = await response.json();

            console.log("WALLET BALANCE:", data);

            if (response.ok && data.success) {
                setCoins(Number(data.balance));
            }
        } catch (error) {
            console.error("Wallet balance error:", error);
        }
    };

    // Get coin packages from backend
    const fetchCoinPackages = async () => {
        try {
            const token = localStorage.getItem("customer_token");

            const response = await fetch(
                `${getApiUrl()}/customer/coin-packages`,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json",
                    },
                }
            );

            const data = await response.json();

            console.log("COIN PACKAGES:", data);

            if (response.ok && data.success) {
                setCoinPackages(data.packages || []);
            }
        } catch (error) {
            console.error("Coin packages error:", error);
        }
    };

    useEffect(() => {
        fetchBalance();
        fetchCoinPackages();
    }, []);

    // Buy Coins
    const buyCoins = async (packageId, amount) => {
        setLoading(true);
        setMessage("");

        try {
            const token = localStorage.getItem("customer_token");

            const response = await fetch(
                `${getApiUrl()}/customer/balance/topup`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json",
                    },
                    body: JSON.stringify({
                        amount: amount, 
                        package_id: packageId,
                    }),
                }
            );

            const data = await response.json();

            console.log("BUY COINS:", data);

            if (!response.ok) {
                throw new Error(data.message || "Purchase failed.");
            }

            setMessage(
                `${data.package?.coins ?? amount} coins added successfully.`
            );
            
            setCoins(Number(data.balance));
            
            setTimeout(() => {
                setMessage("");
            }, 2000);

        } catch (error) {
            console.error(error);
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="home-page">
            <Background />

            <div className="home-content">

                {message && (
                    <div className="wallet-success-message">
                        ✓ {message}
                    </div>
                )}

                <Header showBack />

                <div className="mb-4">

                    {/* Original Wallet Cards */}
                    <section className="daily-balance mt-3 m-4">

                        <div className="daily-balance-card">
                            <span>MAIN WALLET</span>
                            <strong>
                                RM {balance.toFixed(2)}
                            </strong>
                            <img
                                src="/assets/image/home/wallet_3d.png"
                                alt="Wallet"
                            />
                        </div>

                        <div className="daily-balance-card">
                            <span>MY COINS</span>
                            <strong>
                                {coins.toLocaleString()} COINS
                            </strong>
                            <img
                                src="/assets/image/home/wallet_3d.png"
                                alt="Coins"
                            />
                        </div>

                    </section>

                    {/* Buy Coins */}
                    <section className="buy-coins-section mx-4">

                        <div className="buy-coins-header">
                            <h2>BUY COINS</h2>
                            <p>
                                Choose a coin package to continue
                            </p>
                        </div>

                        <div className="coin-packages">

                            {coinPackages.map((pkg) => (
                                <button
                                    key={pkg.id}
                                    className="coin-package"
                                    onClick={() => buyCoins(pkg.id, pkg.coins)}
                                    disabled={loading}
                                >
                                    <div className="coin-icon">
                                        <img
                                            src="/assets/image/daily_checkin/coin.png"
                                            alt="Coin"
                                        />
                                    </div>

                                    <div className="coin-amount">
                                        {Number(pkg.coins).toLocaleString()}
                                    </div>

                                    <div className="coin-label">
                                        COINS
                                    </div>

                                    <div className="d-flex justify-content-center mt-3">
                                        <div className="coin-price ">
                                            RM {Number(pkg.price).toLocaleString()}
                                        </div>
                                    </div>
                                </button>
                            ))}

                        </div>

                    </section>

                </div>
            </div>

            <NavigationBar active="home" />
        </div>
    );
}

export default WalletPage;