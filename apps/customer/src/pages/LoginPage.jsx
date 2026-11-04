import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Header from "../components/header/header";
import Background from "../components/common/background";
import BarSelector from "../components/bar/BarSelector";

import "../css/Global.css";
import "../css/Main.css";

import { getApiUrl } from "../config/api";
import {
    getCurrentBar,
    getPendingJoinToken,
    setCustomerSession,
} from "../config/bar";

function LoginPage() {
    const { t } = useTranslation();

    const [bar, setBar] = useState(getCurrentBar);

    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const handleBarChange = (selectedBar) => {
        setBar(selectedBar);
        setError("");
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!bar) {
            setError(t("Please select a bar."));
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch(
                `${getApiUrl()}/customer/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        phone,
                        password,
                        bar_id: bar.id ? Number(bar.id) : null,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Invalid phone or password."
                );
            }

            setCustomerSession(data.token, data.customer);

            const pendingJoinToken = getPendingJoinToken();

            navigate(
                pendingJoinToken
                    ? `/join?${new URLSearchParams({ token: pendingJoinToken })}`
                    : "/home"
            );
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="home-page">
            <Background />

            <div className="home-content">
                <Header showEmpty />

                <div className="d-flex justify-content-center w-100">
                    <section className="login-section col-md-4 col-sm-7 col-10 my-4">
                        <form
                            className="login-form p-4 rounded shadow-sm"
                            onSubmit={handleLogin}
                        >
                            <h2
                                className="mb-4 text-center"
                                style={{ color: "#5016A9" }}
                            >
                                Login
                            </h2>

                            {error && (
                                <div className="alert alert-danger py-1 mb-3">
                                    {error}
                                </div>
                            )}

                            {/* Bar Selection */}
                            <BarSelector
                                bar={bar}
                                onBarChange={handleBarChange}
                            />

                            {/* Phone */}
                            <div className="mb-3">
                                <label
                                    className="form-label"
                                    htmlFor="phone"
                                >
                                    Phone
                                </label>

                                <input
                                    type="text"
                                    className="form-control"
                                    id="phone"
                                    value={phone}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, "");
                                        setPhone(value);
                                    }}
                                    placeholder="Enter your phone number"
                                    required
                                    autoFocus
                                />
                            </div>

                            {/* Password */}
                            <div className="mb-3">
                                <label
                                    className="form-label"
                                    htmlFor="password"
                                >
                                    Password
                                </label>

                                <input
                                    type="password"
                                    className="form-control"
                                    id="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn w-100"
                                style={{
                                    background:
                                        "linear-gradient(90deg, #5016A9, #8B5CF6)",
                                    color: "#fff",
                                    fontWeight: 700,
                                }}
                                disabled={loading || !bar}
                            >
                                {loading ? "Logging in..." : "Login"}
                            </button>
                        </form>
                        <div className="text-center text-white mt-3">
                            <span>Don't have an account? </span>
                            <button
                                type="button"
                                className="btn btn-link p-0"
                                onClick={() => navigate("/register")}
                            >
                                Register
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;