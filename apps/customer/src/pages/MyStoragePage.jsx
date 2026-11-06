import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCode } from "react-qrcode-logo";

import Header from "../components/header/Header";
import Background from "../components/common/Background";
import NavigationBar from "../components/common/NavigationBar";
import { apiErrorMessage, customerFetch } from "../config/customerApi";

import "../css/Global.css";
import "../css/Main.css";

const HISTORY_LABELS = {
    RETRIEVE: "Redeemed",
    BURN: "Removed",
    EXPIRED: "Expired",
};

function parseDate(value) {
    if (!value) return null;

    const date = new Date(String(value).replace(" ", "T"));

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
    const date = parseDate(value);

    return date ? date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "";
}

function formatDateTime(value) {
    const date = parseDate(value);

    return date
        ? date.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
        : "";
}

function itemStatus(item) {
    if (item.is_expired) return { label: "EXPIRED", className: "expired" };
    if (Number(item.remaining_qty) <= 0) return { label: "FINISHED", className: "finished" };

    return { label: "ACTIVE", className: "active" };
}

function MyStoragePage() {
    const [items, setItems] = useState([]);
    const [memberCode, setMemberCode] = useState(null);
    const [enabled, setEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tab, setTab] = useState("active");
    const [expandedUuid, setExpandedUuid] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const { ok, data } = await customerFetch("/customer/storage");

            setEnabled(data?.enabled !== false);
            setMemberCode(data?.member_code || null);

            if (ok) {
                setItems(Array.isArray(data.items) ? data.items : []);
            } else {
                setItems([]);
                setError(apiErrorMessage(data, "Unable to load your storage."));
            }
        } catch (err) {
            console.error("STORAGE ERROR =", err);
            setError("Unable to load your storage.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const visibleItems = useMemo(
        () => items.filter((item) => (tab === "active" ? item.is_active : !item.is_active)),
        [items, tab],
    );

    return (
        <div className="home-page">
            <Background />

            <div className="home-content">
                <Header showBack />

                <div className="spinwheel-title mb-3">MY STORAGE</div>

                {memberCode && (
                    <section className="storage-qr-card purple-pink-border mx-4">
                        <div className="storage-qr-code">
                            <QRCode value={memberCode} size={180} quietZone={8} ecLevel="M" />
                        </div>
                        <div className="storage-qr-hint">Show this QR at the counter to store or redeem your bottles.</div>
                    </section>
                )}

                {enabled && (
                    <div className="storage-tabs mx-4">
                        <button
                            type="button"
                            className={`mall-category ${tab === "active" ? "active" : ""}`}
                            onClick={() => setTab("active")}
                        >
                            ACTIVE
                        </button>
                        <button
                            type="button"
                            className={`mall-category ${tab === "past" ? "active" : ""}`}
                            onClick={() => setTab("past")}
                        >
                            HISTORY
                        </button>
                    </div>
                )}

                <section className="storage-list mx-4">
                    {loading && <div className="mall-empty">Loading...</div>}

                    {!loading && !enabled && (
                        <div className="mall-empty">Bottle storage is not available at this bar.</div>
                    )}

                    {!loading && enabled && error && (
                        <div className="mall-empty">
                            {error}
                            <div className="d-flex justify-content-center mt-3">
                                <button type="button" className="mall-category" onClick={load}>RETRY</button>
                            </div>
                        </div>
                    )}

                    {!loading && enabled && !error && visibleItems.length === 0 && (
                        <div className="mall-empty">
                            {tab === "active" ? "You have no bottles in storage." : "No past storage yet."}
                        </div>
                    )}

                    {!loading && !error && visibleItems.map((item) => {
                        const status = itemStatus(item);
                        const expanded = expandedUuid === item.uuid;
                        const history = Array.isArray(item.history) ? item.history : [];

                        return (
                            <div key={item.uuid} className={`storage-item purple-pink-border ${status.className}`}>
                                <button
                                    type="button"
                                    className="storage-item-head"
                                    onClick={() => setExpandedUuid(expanded ? null : item.uuid)}
                                >
                                    <div className="storage-item-info">
                                        <div className="storage-item-name">{item.product_name || "Item"}</div>
                                        <div className="storage-item-meta">
                                            Stored {formatDate(item.stored_at)}
                                            {item.branch_name && ` · ${item.branch_name}`}
                                        </div>
                                        {item.last_redeem_at && (
                                            <div className="storage-item-meta">
                                                {item.is_expired ? "Expired" : "Use by"} {formatDate(item.last_redeem_at)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="storage-item-side">
                                        <div className="storage-item-qty">
                                            {Number(item.remaining_qty)}<span>/{Number(item.quantity)}</span>
                                        </div>
                                        <div className={`storage-item-status ${status.className}`}>{status.label}</div>
                                    </div>
                                </button>

                                {expanded && (
                                    <div className="storage-history">
                                        {history.length === 0 && (
                                            <div className="storage-item-meta">No redemptions yet.</div>
                                        )}

                                        {history.map((entry) => (
                                            <div key={entry.uuid} className="wallet-history-item">
                                                <div className="wallet-history-info">
                                                    <div className="wallet-history-title">
                                                        {HISTORY_LABELS[entry.type] || entry.type}
                                                    </div>
                                                    <div className="wallet-history-meta">{formatDateTime(entry.created_at)}</div>
                                                </div>
                                                <div className="wallet-history-amount debit">-{Number(entry.qty)}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </section>
            </div>

            <NavigationBar active="profile" />
        </div>
    );
}

export default MyStoragePage;
