import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import "../../css/Global.css";

function NavigationBar({ active = "home" }) {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const items = [
        { key: "home", label: t("Home"), path: "/home" },
        { key: "events", label: t("Events"), path: "/events" },
        { key: "gift", label: t("Gifts"), path: "/gift" },
        { key: "chat", label: t("Chat"), path: "/chat" },
        { key: "profile", label: t("Profile"), path: "/profile" },
    ];

    return (
        <nav className="navigation-bar vibe-nav">
            {items.map((item) => (
                <button
                    key={item.key}
                    type="button"
                    className={`navigation-item ${item.key === "gift" ? "gift-item" : ""} ${
                        active === item.key ? "active" : ""
                    }`}
                    onClick={() => navigate(item.path)}
                >
                    <span className="navigation-icon">
                        <NavIcon name={item.key} />
                    </span>
                    <span>{item.label}</span>
                </button>
            ))}
        </nav>
    );
}

function NavIcon({ name }) {
    if (name === "home") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 11.5 12 5l8 6.5V20H4Z" />
            </svg>
        );
    }

    if (name === "events") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="6" width="16" height="14" rx="2" />
                <path d="M8 4v4M16 4v4M4 11h16" />
            </svg>
        );
    }

    if (name === "gift") {
        return <img className="nav-heart" src="/images/heart.png" alt="" />;
    }

    if (name === "chat") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 7h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H10l-4 3v-3H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="3.2" />
            <path d="M5 19c1.4-3 3.8-4.5 7-4.5S17.6 16 19 19" />
        </svg>
    );
}

export default NavigationBar;
