import { useNavigate } from "react-router-dom";
import "../../css/Global.css";

function HomeMenu() {
    const navigate = useNavigate();

    const items = [
        {
            key: "daily",
            label: "Daily Check-In",
            image: "/assets/image/home/calender.png",
            path: "/daily-checkin",
        },
        {
            key: "spin",
            label: "Spin Wheel",
            image: "/assets/image/home/spinwheel.png",
            path: "/spinwheel",
        },
        {
            key: "mall",
            label: "Mall",
            image: "/assets/image/home/mallbag.png",
            path: "/mall",
        },
        {
            key: "gift",
            label: "Send Gift",
            image: "/assets/image/home/gift.png",
            path: "/gift",
        },
        {
            key: "qr",
            label: "QR Code",
            image: "/assets/image/home/qrcode.png",
            path: "/qr",
        },
        {
            key: "wallet",
            label: "Wallet",
            image: "/assets/image/home/wallet_3d.png",
            path: "/wallet",
        },
    ];

    return (
        <div className="home-menu">
            {items.map((item) => (
                <button
                    key={item.key}
                    type="button"
                    className="home-menu-item"
                    onClick={() => navigate(item.path)}
                >
                    <div className="home-menu-icon">
                        <img src={item.image} alt={item.label} />
                    </div>
                    <span>{item.label}</span>
                </button>
            ))}
        </div>
    );
}

export default HomeMenu;