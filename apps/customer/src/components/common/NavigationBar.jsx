import { useNavigate } from "react-router-dom";

import "../../css/Global.css";

function NavigationBar({ active = "home" }) {
    const navigate = useNavigate();

    const items = [
        {
            key: "home",
            label: "Home",
            image: "/assets/icons/home.png",
            path: "/home",
        },
        {
            key: "events",
            label: "Events",
            image: "/assets/icons/event.png",
            path: "/events",
        },
        {
            key: "wallet",
            label: "Wallet",
            image: "/assets/icons/wallet.png",
            path: "/wallet",
        },
        {
            key: "mall",
            label: "Mall",
            image: "/assets/icons/mall.png",
            path: "/mall",
        },
        {
            key: "profile",
            label: "Profile",
            image: "/assets/icons/profile.png",
            path: "/profile",
        },
    ];

    return (
        <nav className="navigation-bar cyan-border">
            {items.map((item) => (
                <button
                    key={item.key}
                    type="button"
                    className={`navigation-item navigation-icon d-flex align-items-center justify-content-center ${
                        active === item.key ? "active" : ""
                    } ${item.key === "wallet" ? "wallet-item" : ""}`}
                    onClick={() => navigate(item.path)}
                >
                    {item.key === "wallet" ? (
                        <div className="d-flex flex-column align-items-center mb-4">
                            <div className="navigation-icon">
                                <div className="wallet-circle pb-3">
                                    <img src={item.image} alt={item.label} />
                                </div>
                            </div>
                            <span>{item.label}</span>
                        </div>
                    ) : (
                        <>
                            <div className="navigation-icon">
                                <img src={item.image} alt={item.label} />
                            </div>
                            <span>{item.label}</span>
                        </>
                    )}
               
                </button>
            ))}
        </nav>
    );
}

export default NavigationBar;