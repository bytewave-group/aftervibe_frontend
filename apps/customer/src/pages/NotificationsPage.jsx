import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../components/header/Header";
import Background from "../components/common/Background";
import NavigationBar from "../components/common/NavigationBar";
import { customerFetch } from "../config/customerApi";

import "../css/Global.css";
import "../css/Main.css";

const TYPE_ICONS = {
    announcement: "fa-solid fa-bullhorn",
    gift_received: "fa-solid fa-gift",
    coins_credited: "fa-solid fa-coins",
    reward_redeemed: "fa-solid fa-ticket",
};

const TYPE_LINKS = {
    gift_received: "/mall",
    coins_credited: "/wallet",
    reward_redeemed: "/mall",
};

function timeAgo(value) {
    const date = new Date(String(value).replace(" ", "T"));

    if (Number.isNaN(date.getTime())) return "";

    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    if (minutes < 10080) return `${Math.floor(minutes / 1440)}d ago`;

    return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function NotificationsPage() {
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (pageToLoad = 1) => {
        setLoading(true);

        try {
            const { ok, data } = await customerFetch(`/customer/notifications?page=${pageToLoad}`);

            if (ok) {
                const paginator = data.notifications || {};

                setNotifications((items) => (pageToLoad === 1
                    ? paginator.data || []
                    : [...items, ...(paginator.data || [])]));
                setPage(paginator.current_page || pageToLoad);
                setLastPage(paginator.last_page || 1);
                setUnreadCount(Number(data.unread_count) || 0);
            }
        } catch (error) {
            console.error("NOTIFICATIONS ERROR =", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load(1);
    }, [load]);

    const markAllRead = async () => {
        const { ok } = await customerFetch("/customer/notifications/read-all", { method: "POST" });

        if (ok) {
            const now = new Date().toISOString();
            setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at || now })));
            setUnreadCount(0);
        }
    };

    const openNotification = async (notification) => {
        if (!notification.read_at) {
            const { ok, data } = await customerFetch(`/customer/notifications/${notification.id}/read`, { method: "POST" });

            if (ok) {
                setNotifications((items) => items.map((item) => (
                    item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
                )));
                setUnreadCount(Number(data.unread_count) || 0);
            }
        }

        if (TYPE_LINKS[notification.type]) {
            navigate(TYPE_LINKS[notification.type]);
        }
    };

    return (
        <div className="home-page">
            <Background />

            <div className="home-content">
                <Header showBack />

                <div className="spinwheel-title mb-3">NOTIFICATIONS</div>

                <div className="notifications-toolbar mx-4">
                    <span>{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</span>
                    {unreadCount > 0 && (
                        <button type="button" onClick={markAllRead}>Mark all as read</button>
                    )}
                </div>

                <section className="notifications-list mx-4">
                    {!loading && notifications.length === 0 && (
                        <div className="mall-empty">No notifications yet.</div>
                    )}

                    {notifications.map((notification) => (
                        <button
                            key={notification.id}
                            type="button"
                            className={`notification-item purple-pink-border ${notification.read_at ? "read" : "unread"}`}
                            onClick={() => openNotification(notification)}
                        >
                            <div className="notification-icon">
                                <i className={TYPE_ICONS[notification.type] || "fa-regular fa-bell"}></i>
                            </div>

                            <div className="notification-info">
                                <div className="notification-title">{notification.title}</div>
                                {notification.body && (
                                    <div className="notification-body">{notification.body}</div>
                                )}
                                <div className="notification-time">{timeAgo(notification.created_at)}</div>
                            </div>

                            {!notification.read_at && <span className="notification-dot"></span>}
                        </button>
                    ))}

                    {loading && <div className="mall-empty">Loading...</div>}

                    {!loading && page < lastPage && (
                        <div className="d-flex justify-content-center mt-2">
                            <button className="mall-category" onClick={() => load(page + 1)}>
                                LOAD MORE
                            </button>
                        </div>
                    )}
                </section>
            </div>

            <NavigationBar active="profile" />
        </div>
    );
}

export default NotificationsPage;
