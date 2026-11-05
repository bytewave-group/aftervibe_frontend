import Header from "../components/header/header";
import Background from "../components/common/Background";
import NavigationBar from "../components/common/NavigationBar";

import "../css/Global.css";
import "../css/Main.css";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiErrorMessage, customerFetch } from "../config/customerApi";

const SOURCE_LABELS = {
    coin_package: "Coin purchase",
    daily_checkin: "Daily check-in",
    admin_adjustment: "Adjustment",
    gift: "Gift sent",
    spin_wheel: "Spin wheel",
};

const ORDER_POLL_MS = 3000;
const ORDER_POLL_LIMIT = 20;

function formatDateTime(value) {
    if (!value) return "";

    const date = new Date(String(value).replace(" ", "T"));

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function WalletPage() {
    const [searchParams, setSearchParams] = useSearchParams();

    const [coins, setCoins] = useState(0);
    const [points, setPoints] = useState(0);
    const [coinPackages, setCoinPackages] = useState([]);
    const [paymentAvailable, setPaymentAvailable] = useState(true);
    const [buyingId, setBuyingId] = useState(null);
    const [message, setMessage] = useState("");

    const [transactions, setTransactions] = useState([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loadingTransactions, setLoadingTransactions] = useState(false);

    const pollTimer = useRef(null);
    const returnedOrderNo = useRef(searchParams.get("coin_order"));

    const showMessage = useCallback((text, duration = 2500) => {
        setMessage(text);

        if (duration) {
            setTimeout(() => setMessage(""), duration);
        }
    }, []);

    const fetchBalance = useCallback(async () => {
        const [balance, me] = await Promise.all([
            customerFetch("/customer/balance"),
            customerFetch("/customer/me"),
        ]);

        if (balance.ok) {
            setCoins(Number(balance.data.balance));
        }

        if (me.ok) {
            setPoints(Number(me.data.customer?.reward_points ?? 0));
        }
    }, []);

    const fetchTransactions = useCallback(async (pageToLoad = 1) => {
        setLoadingTransactions(true);

        try {
            const { ok, data } = await customerFetch(`/customer/balance/transactions?page=${pageToLoad}`);

            if (ok) {
                const paginator = data.transactions || {};

                setTransactions((items) => (pageToLoad === 1
                    ? paginator.data || []
                    : [...items, ...(paginator.data || [])]));
                setPage(paginator.current_page || pageToLoad);
                setLastPage(paginator.last_page || 1);
            }
        } catch (error) {
            console.error("WALLET TRANSACTIONS ERROR =", error);
        } finally {
            setLoadingTransactions(false);
        }
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const [packages, orders] = await Promise.all([
                    customerFetch("/customer/coin-packages"),
                    customerFetch("/customer/coin-orders"),
                ]);

                if (packages.ok) {
                    setCoinPackages(packages.data.packages || []);
                }

                if (orders.ok) {
                    setPaymentAvailable(orders.data.payment_available !== false);
                }
            } catch (error) {
                console.error("WALLET LOAD ERROR =", error);
            }
        };

        load();
        fetchBalance();
        fetchTransactions(1);
    }, [fetchBalance, fetchTransactions]);

    // Back from the payment page: the gateway confirms the order asynchronously, so poll it
    useEffect(() => {
        const orderNo = returnedOrderNo.current;

        if (!orderNo) return;

        returnedOrderNo.current = null;
        setSearchParams({}, { replace: true });

        let attempts = 0;

        const check = async () => {
            attempts++;

            try {
                const { ok, data } = await customerFetch(`/customer/coin-orders/${encodeURIComponent(orderNo)}`);

                if (!ok) {
                    showMessage(apiErrorMessage(data, "Unable to check your payment."));
                    return;
                }

                const order = data.order;

                if (order.status === "paid") {
                    setCoins(Number(data.balance));
                    showMessage(`${Number(order.coins).toLocaleString()} coins added successfully.`);
                    fetchTransactions(1);
                    return;
                }

                if (order.status === "pending" && attempts < ORDER_POLL_LIMIT) {
                    showMessage("Confirming your payment...", 0);
                    pollTimer.current = setTimeout(check, ORDER_POLL_MS);
                    return;
                }

                showMessage(order.status === "pending"
                    ? "Payment is still processing. Coins will be added once it is confirmed."
                    : "Payment was not completed. No coins were added.", 4000);
            } catch (error) {
                console.error("COIN ORDER CHECK ERROR =", error);
            }
        };

        check();
    }, [setSearchParams, showMessage, fetchTransactions]);

    useEffect(() => () => clearTimeout(pollTimer.current), []);

    const buyCoins = async (pkg) => {
        if (buyingId) return;

        setBuyingId(pkg.id);

        try {
            const returnUrl = `${window.location.origin}${window.location.pathname}#/wallet`;

            const { ok, data } = await customerFetch("/customer/coin-orders", {
                method: "POST",
                body: { package_id: pkg.id, return_url: returnUrl },
            });

            if (!ok || !data.order?.payment_url) {
                showMessage(apiErrorMessage(data, "Unable to start the payment."));
                return;
            }

            window.location.assign(data.order.payment_url);
        } catch (error) {
            console.error("BUY COINS ERROR =", error);
            showMessage("Unable to start the payment.");
        } finally {
            setBuyingId(null);
        }
    };

    return (
        <div className="home-page">
            <Background />

            <div className="home-content">

                {message && (
                    <div className="wallet-success-message">
                        {message}
                    </div>
                )}

                <Header showBack />

                <div className="mb-4">

                    <section className="daily-balance mt-3 m-4">

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

                        <div className="daily-balance-card">
                            <span>REWARD POINTS</span>
                            <strong>
                                {points.toLocaleString()} PTS
                            </strong>
                            <img
                                src="/assets/image/home/wallet_3d.png"
                                alt="Reward points"
                            />
                        </div>

                    </section>

                    {/* Buy Coins */}
                    <section className="buy-coins-section mx-4">

                        <div className="buy-coins-header">
                            <h2>BUY COINS</h2>
                            <p>
                                {paymentAvailable
                                    ? "Choose a coin package to continue"
                                    : "Online top-up is coming soon"}
                            </p>
                        </div>

                        <div className="coin-packages">

                            {coinPackages.map((pkg) => (
                                <button
                                    key={pkg.id}
                                    className="coin-package"
                                    onClick={() => buyCoins(pkg)}
                                    disabled={!paymentAvailable || buyingId !== null}
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
                                        {buyingId === pkg.id ? "OPENING..." : "COINS"}
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

                    {/* Coin History */}
                    <section className="wallet-history mx-4">
                        <div className="buy-coins-header">
                            <h2>COIN HISTORY</h2>
                        </div>

                        {transactions.length === 0 && !loadingTransactions && (
                            <div className="mall-empty">No coin activity yet.</div>
                        )}

                        {transactions.map((transaction) => {
                            const isCredit = transaction.type === "credit";

                            return (
                                <div
                                    key={transaction.id}
                                    className={`wallet-history-item ${transaction.status}`}
                                >
                                    <div className="wallet-history-info">
                                        <div className="wallet-history-title">
                                            {SOURCE_LABELS[transaction.source] || transaction.description || transaction.source}
                                        </div>
                                        <div className="wallet-history-meta">
                                            {formatDateTime(transaction.created_at)}
                                            {transaction.status !== "completed" && ` · ${transaction.status.toUpperCase()}`}
                                        </div>
                                    </div>

                                    <div className={`wallet-history-amount ${isCredit ? "credit" : "debit"}`}>
                                        {isCredit ? "+" : "-"}{Number(transaction.amount).toLocaleString()}
                                    </div>
                                </div>
                            );
                        })}

                        {page < lastPage && (
                            <div className="d-flex justify-content-center mt-2">
                                <button
                                    className="mall-category"
                                    disabled={loadingTransactions}
                                    onClick={() => fetchTransactions(page + 1)}
                                >
                                    {loadingTransactions ? "LOADING..." : "LOAD MORE"}
                                </button>
                            </div>
                        )}
                    </section>

                </div>
            </div>

            <NavigationBar active="wallet" />
        </div>
    );
}

export default WalletPage;
