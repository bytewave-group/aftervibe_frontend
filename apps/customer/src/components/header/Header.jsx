import { useNavigate } from "react-router-dom";
import { clearCustomerSession } from "../../config/bar";
import "../../css/Global.css";

function Header({ showBack = false, showEmpty = false, backTo = "/home" }) {
    const navigate = useNavigate();

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
                >
                    <i className="fa-regular fa-bell"></i>
                </button>
            </div>

        </header>
    );
}

export default Header;