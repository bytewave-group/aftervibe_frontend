import { useEffect, useState } from "react";

import Header from "../components/header/header";
import Background from "../components/common/background";
import NavigationBar from "../components/common/NavigationBar";
import HomeMenu from "../components/home/HomeMenu";
import HomeEvents from "../components/home/HomeEvents";
import BarAccessPopup from "../components/bar/BarAccessPopup";

import "../css/Global.css";
import "../css/Main.css";

import { getApiUrl } from "../config/api";

function HomePage() {
    const [accessChecking, setAccessChecking] = useState(true);
    const [showAccessPopup, setShowAccessPopup] = useState(false);

    useEffect(() => {
        const checkBarAccess = async () => {
            const token = localStorage.getItem("customer_token");

            if (!token) {
                setAccessChecking(false);
                return;
            }

            try {
                const response = await fetch(
                    `${getApiUrl()}/bar/access-status`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: "application/json",
                        },
                    }
                );

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(
                        data.message || "Unable to check bar access."
                    );
                }

                if (data.verified) {
                    setShowAccessPopup(false);
                } else {
                    console.log("BAR ACCESS: NOT VERIFIED");
                    setShowAccessPopup(true);
                }
            } catch (error) {
                console.error("BAR ACCESS CHECK ERROR:", error);
                setShowAccessPopup(true);
            } finally {
                setAccessChecking(false);
            }
        };

        checkBarAccess();
    }, []);

    console.log("POPUP STATE:", {
        showAccessPopup,
        accessChecking,
    });

    return (
        <div className="home-page">
            <Background />

            <div className="home-content">
                <Header />

                {/* Banner */}
                <div className="d-flex justify-content-center w-100">
                    <section className="home-banner">
                        <img
                            src="/assets/image/home/banner.png"
                            alt="After Vibe Banner"
                        />
                    </section>
                </div>

                <div className="mb-4">
                    <HomeMenu />
                </div>

                <HomeEvents />
            </div>

            <NavigationBar active="home" />

            {/* Bar Access Popup */}
            {showAccessPopup && !accessChecking && (
            <BarAccessPopup
                onSuccess={() => {
                    setShowAccessPopup(false);
                }}
            />
        )}
        </div>
    );
}

export default HomePage;