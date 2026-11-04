import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BarSelector from "../components/bar/BarSelector";
import { getApiUrl } from "../config/api";
import { getCurrentBar } from "../config/bar";
import "../css/Main.css";

function RegisterPage() {
    const { t } = useTranslation();
    const [bar, setBar] = useState(getCurrentBar);
    const [phone, setPhone] = useState("");
    const [username, setUsername] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();

        if (!bar) {
            setError(t("Please select a bar."));
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch(
                `${getApiUrl()}/customer/register`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        phone,
                        username,
                        name,
                        password,
                        password_confirmation: passwordConfirmation,
                        bar_id: bar.id ? Number(bar.id) : null,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Registration failed."
                );
            }

            console.log("REGISTER SUCCESS:", data);

            // Registration successful
            // User needs to login manually
            navigate("/login");

        } catch (error) {
            console.error("REGISTER ERROR:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="home-page d-flex flex-column justify-content-center align-items-center"
            style={{ minHeight: "100vh" }}
        >
            <div className="home-logo mb-4"></div>

            <div className="col-md-4 col-sm-7 col-10">
                <form
                    className="login-form p-4 rounded shadow-sm"
                    onSubmit={handleRegister}
                >
                    <h2
                        className="mb-4 text-center"
                        style={{ color: "#5016A9" }}
                    >
                        Register
                    </h2>

                    {error && (
                        <div className="alert alert-danger py-1 mb-3">
                            {error}
                        </div>
                    )}

                    <BarSelector
                        bar={bar}
                        onBarChange={(selectedBar) => {
                            setBar(selectedBar);
                            setError("");
                        }}
                    />

                    <div className="mb-3">
                        <label className="form-label">
                            Phone
                        </label>

                        <input
                            type="text"
                            className="form-control"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="Enter your phone number"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label">
                            Username
                        </label>
                        <input
                            type="text"
                            className="form-control"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="Enter a username"
                            required
                        />
                    </div>

                    {/* <div className="mb-3">
                        <label className="form-label">
                            Name
                        </label>

                        <input
                            type="text"
                            className="form-control"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Enter your name"
                            required
                        />
                    </div> */}

                    <div className="mb-3">
                        <label className="form-label">
                            Password
                        </label>

                        <input
                            type="password"
                            className="form-control"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label">
                            Confirm Password
                        </label>

                        <input
                            type="password"
                            className="form-control"
                            value={passwordConfirmation}
                            onChange={e =>
                                setPasswordConfirmation(e.target.value)
                            }
                            placeholder="Confirm your password"
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
                            fontWeight: 700
                        }}
                        disabled={loading || !bar}
                    >
                        {loading
                            ? "Registering..."
                            : "Register"}
                    </button>
                </form>
                <div className="text-center mt-3" style={{ color: "#aaa" }}>
                    <span>Already have an account? </span>
                    <button
                        type="button"
                        className="btn btn-link p-0"
                        style={{
                            color: "#FF5AAC",
                            fontWeight: 600,
                            textDecoration: "none",
                        }}
                        onClick={() => navigate("/login")}
                    >
                        Login
                    </button>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;