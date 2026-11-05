import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearCustomerSession } from "../../config/bar";
import { customerFetch } from "../../config/customerApi";
import "../../css/Global.css";

function Header({ showBack = false, showEmpty = false, backTo = "/home" }) {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (showEmpty || !localStorage.getItem("customer_token")) return;

        let cancelled = false;

        customerFetch("/customer/notifications/unread-count")
            .then(({ ok, data }) => {
                if (ok && !cancelled) {
                    setUnreadCount(Number(data.unread_count) || 0);
                }
            })
            .catch((error) => console.error("UNREAD COUNT ERROR =", error));

        return () => {
            cancelled = true;
        };
    }, [showEmpty]);

    const handleLogout = () => {
        clearCustomerSession();
        navigate("/login");
    };

    return (
        <header className="header mt-3 mb-2 d-flex justify-content-between align-items-center">
            <div className="header-icon ms-3">
                {showEmpty ? (
                    <button
                        type="button"
                        className="header-back"
                        style={{ visibility: "hidden" }}
                    >
                        <i className="fa-solid fa-right-from-bracket"></i>
                    </button>
                ) : showBack ? (
                    <button
                        type="button"
                        className="header-back"
                        onClick={() => navigate(backTo)}
                    >
                        <i className="fa-solid fa-angle-left"></i>
                    </button>
                ) : (
                    <button
                        type="button"
                        className="header-back"
                        onClick={handleLogout}
                    >
                        <i className="fa-solid fa-right-from-bracket"></i>
                    </button>
                )}
            </div>

            {/* Logo */}
            <div className="d-flex justify-content-center align-items-center">
                <img
                    src="/assets/image/home/aftervibe_samplelogo.png"
                    alt="AFTER VIBE Logo"
                    className="header-logo"
                />
            </div>

            {/* Notification */}
            <div className="header-icon text-end me-2">
                <button
                    type="button"
                    className="header-notification"
                    style={showEmpty ? { visibility: "hidden" } : undefined}
                    onClick={() => navigate("/notifications")}
                >
                    <i className="fa-regular fa-bell"></i>
                    {unreadCount > 0 && (
                        <span className="header-notification-badge">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </button>
            </div>

        </header>
    );
}

export default Header;