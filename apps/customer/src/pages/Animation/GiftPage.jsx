import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "../../config/api";
import AnimationSendButton from "../../components/animation/AnimationSendButton";
import GiftMenu from "../../components/gift/GiftMenu";
import StaffMenu from "../../components/interaction/StaffMenu";
import CustomerMenu from "../../components/interaction/CustomerMenu";
import Background from "../../components/common/Background";
import Header from "../../components/header/Header";
import NavigationBar from "../../components/common/NavigationBar";

import "../../css/Gift.css";

function GiftPage() {
    const navigate = useNavigate();

    const [displays, setDisplays] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [giftMenuOpen, setGiftMenuOpen] = useState(false);
    const [staffs, setStaffs] = useState([]);
    const [coins, setCoins] = useState(0);

    const [giftTarget, setGiftTarget] = useState("staff");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customers, setCustomers] = useState([]);
    
    const customer = JSON.parse(localStorage.getItem("customer"));

    useEffect(() => {
        const token = localStorage.getItem("customer_token");

        // Get Customer Coin Balance
        fetch(`${getApiUrl()}/customer/balance`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        })
            .then((response) => response.json())
            .then((data) => {
                console.log("GIFT COIN BALANCE =", data);

                if (data.success) {
                    setCoins(Number(data.balance));
                }
            })
            .catch((err) => {
                console.error("BALANCE ERROR =", err);
            });

        // Get Staff
        fetch(`${getApiUrl()}/customer/staff`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        })
            .then((response) => response.json())
            .then((data) => {
                console.log("STAFF LIST =", data);
                setStaffs(data.staffs || []);
            })
            .catch((err) => {
                console.error("STAFF ERROR =", err);
            });

        // Get Gift Displays
        fetch(`${getApiUrl()}/display/gift`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        })
            .then((response) => response.json())
            .then((data) => {
                console.log("GIFT DISPLAYS =", data);
                setDisplays(data.displays || []);
            })
            .catch((err) => {
                console.error("GIFT ERROR =", err);
            });

        // Get Customers
        fetch(`${getApiUrl()}/customer/customers`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        })
            .then((response) => response.json())
            .then((data) => {
                console.log("CUSTOMER LIST =", data);
                setCustomers(data.customers || []);
            })
            .catch((err) => {
                console.error("CUSTOMER ERROR =", err);
            });
    }, []);
    
    return (
        <div className="home-page">
            <Background />

            <div className="home-content">
                <Header showBack />

                {/* Title */}
                <div className="spinwheel-title mb-3">
                    GIFT PAGE
                </div>

                {/* Customer Info
                <div className="text-white mb-2 text-center">
                    {customer.username}
                </div> */}

                {/* Coin Balance */}
                <div className="gift-coin-balance">
                    <img
                        src="/assets/image/daily_checkin/coin.png"
                        alt="Coin"
                    />
                    <span>{coins.toLocaleString()}</span>
                    <small>COINS</small>
                </div>

                {/* Gift Target */}
                <div className="gift-target-switch mb-4">

                <button
                    type="button"
                    className={`gift-target-option ${
                        giftTarget === "staff" ? "active" : ""
                    }`}
                    onClick={() => {
                        setGiftTarget("staff");
                        setSelectedCustomer(null);
                        setSelectedStaff(null);
                        setGiftMenuOpen(false);
                    }}
                >
                    STAFF
                </button>

                <div className="gift-target-divider"></div>

                <button
                    type="button"
                    className={`gift-target-option ${
                        giftTarget === "customer" ? "active" : ""
                    }`}
                    onClick={() => {
                        setGiftTarget("customer");
                        setSelectedStaff(null);
                        setSelectedCustomer(null);
                        setGiftMenuOpen(false);
                    }}
                >
                    CUSTOMER
                </button>

                </div>

                {/* ================= STAFF ================= */}
                {giftTarget === "staff" ? (
                    <StaffMenu
                        staffs={staffs}
                        selectedStaff={selectedStaff}
                        onSelectStaff={(staff) => {
                            setSelectedStaff(staff);
                            setGiftMenuOpen(true);
                        }}
                        giftMenuOpen={giftMenuOpen}
                    />
                ) : (
                    <CustomerMenu
                        customers={customers}
                        selectedCustomer={selectedCustomer}
                        onSelectCustomer={(customer) => {
                            setSelectedCustomer(customer);
                            setGiftMenuOpen(true);
                        }}
                        giftMenuOpen={giftMenuOpen}
                    />
                )}

                {giftMenuOpen && (selectedStaff || selectedCustomer) && (
                    <GiftMenu
                        staff={selectedStaff}
                        customer={selectedCustomer}
                        displays={displays}
                        onClose={() => setGiftMenuOpen(false)}
                        onGiftSend={async (display, interaction, recipient) => {
                            const token = localStorage.getItem("customer_token");

                            const response = await fetch(`${getApiUrl()}/playlists/start`, {
                                method: "POST",
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    Accept: "application/json",
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    display_id: display.id,
                                    interaction_id: interaction.id,

                                    ...(giftTarget === "staff"
                                        ? {
                                            target: "staff",
                                            staff_id: recipient.id,
                                        }
                                        : {
                                            target: "customer",
                                            receiver_customer_id: recipient.id,
                                        }),
                                }),
                            });

                            const data = await response.json();

                            if (!response.ok || !data.success) {
                                throw new Error(
                                    data.message || "Failed to send gift."
                                );
                            }

                            console.log("GIFT SENT =", data);

                            // Update coin balance
                            if (data.balance !== undefined) {
                                setCoins(Number(data.balance));
                            }

                            return data;
                        }}
                
                   
                    />
                )}
            </div>

            <NavigationBar active="gift" />
        </div>
    );
}

export default GiftPage;