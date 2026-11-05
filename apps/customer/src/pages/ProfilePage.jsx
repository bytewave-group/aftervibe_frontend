import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../components/header/header";
import Background from "../components/common/Background";
import NavigationBar from "../components/common/NavigationBar";
import { clearCustomerSession } from "../config/bar";
import { apiErrorMessage, customerFetch } from "../config/customerApi";

import "../css/Global.css";
import "../css/Main.css";

function ProfilePage() {
    const navigate = useNavigate();
    const fileInput = useRef(null);

    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    const [editing, setEditing] = useState(false);
    const [username, setUsername] = useState("");
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [changingPassword, setChangingPassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [error, setError] = useState("");

    const showMessage = (text) => {
        setMessage(text);
        setTimeout(() => setMessage(""), 2500);
    };

    const applyCustomer = (data) => {
        setCustomer(data);
        setUsername(data.username || "");
        setName(data.name || "");
        localStorage.setItem("customer", JSON.stringify({
            id: data.id,
            username: data.username,
            name: data.name,
            bar_id: data.bar_id,
        }));
    };

    useEffect(() => {
        const load = async () => {
            try {
                const { ok, data } = await customerFetch("/customer/me");

                if (ok) {
                    applyCustomer(data.customer);
                }
            } catch (err) {
                console.error("PROFILE LOAD ERROR =", err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const saveProfile = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");

        try {
            const { ok, data } = await customerFetch("/customer/profile", {
                method: "POST",
                body: { username, name },
            });

            if (!ok) {
                setError(apiErrorMessage(data, "Unable to update your profile."));
                return;
            }

            applyCustomer(data.customer);
            setEditing(false);
            showMessage("Profile updated.");
        } catch (err) {
            console.error("PROFILE UPDATE ERROR =", err);
            setError("Unable to update your profile.");
        } finally {
            setSaving(false);
        }
    };

    const uploadAvatar = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        setUploading(true);

        try {
            const form = new FormData();
            form.append("profile_image", file);

            const { ok, data } = await customerFetch("/customer/profile/avatar", {
                method: "POST",
                body: form,
            });

            if (!ok) {
                showMessage(apiErrorMessage(data, "Unable to upload the picture."));
                return;
            }

            applyCustomer(data.customer);
            showMessage("Profile picture updated.");
        } catch (err) {
            console.error("AVATAR UPLOAD ERROR =", err);
            showMessage("Unable to upload the picture.");
        } finally {
            setUploading(false);
        }
    };

    const savePassword = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");

        try {
            const { ok, data } = await customerFetch("/customer/profile/password", {
                method: "POST",
                body: {
                    current_password: currentPassword,
                    password,
                    password_confirmation: passwordConfirmation,
                },
            });

            if (!ok) {
                setError(apiErrorMessage(data, "Unable to change your password."));
                return;
            }

            setCurrentPassword("");
            setPassword("");
            setPasswordConfirmation("");
            setChangingPassword(false);
            showMessage("Password updated.");
        } catch (err) {
            console.error("PASSWORD UPDATE ERROR =", err);
            setError("Unable to change your password.");
        } finally {
            setSaving(false);
        }
    };

    const logout = async () => {
        try {
            await customerFetch("/customer/logout", { method: "POST" });
        } catch (err) {
            console.error("LOGOUT ERROR =", err);
        }

        clearCustomerSession();
        navigate("/login");
    };

    const closeForms = () => {
        setEditing(false);
        setChangingPassword(false);
        setError("");
        setUsername(customer?.username || "");
        setName(customer?.name || "");
    };

    const memberSince = customer?.created_at
        ? new Date(customer.created_at.replace(" ", "T")).toLocaleDateString(undefined, { month: "short", year: "numeric" })
        : null;

    return (
        <div className="home-page">
            <Background />

            <div className="home-content">
                {message && (
                    <div className="wallet-success-message">{message}</div>
                )}

                <Header showBack />

                <div className="spinwheel-title mb-4">PROFILE</div>

                {loading ? (
                    <div className="mall-empty">Loading...</div>
                ) : !customer ? (
                    <div className="mall-empty">Unable to load your profile.</div>
                ) : (
                    <div className="profile-content mx-4">
                        <section className="profile-card purple-pink-border">
                            <button
                                type="button"
                                className="profile-avatar"
                                onClick={() => fileInput.current?.click()}
                                disabled={uploading}
                            >
                                {customer.profile_image ? (
                                    <img src={customer.profile_image} alt={customer.name} />
                                ) : (
                                    <i className="fa-solid fa-user"></i>
                                )}
                                <span className="profile-avatar-edit">
                                    {uploading ? "..." : <i className="fa-solid fa-camera"></i>}
                                </span>
                            </button>

                            <input
                                ref={fileInput}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={uploadAvatar}
                            />

                            <div className="profile-name">{customer.name || customer.username}</div>
                            <div className="profile-meta">@{customer.username}</div>
                            <div className="profile-meta">{customer.phone}</div>

                            <div className="profile-badges">
                                {customer.membership && (
                                    <span className="profile-badge">{customer.membership}</span>
                                )}
                                {memberSince && (
                                    <span className="profile-badge">Member since {memberSince}</span>
                                )}
                            </div>
                        </section>

                        <section className="daily-balance my-3">
                            <div className="daily-balance-card" onClick={() => navigate("/wallet")}>
                                <span>MY COINS</span>
                                <strong>{Number(customer.balance).toLocaleString()} COINS</strong>
                                <img src="/assets/image/home/wallet_3d.png" alt="Coins" />
                            </div>
                            <div className="daily-balance-card" onClick={() => navigate("/mall")}>
                                <span>REWARD POINTS</span>
                                <strong>{Number(customer.reward_points).toLocaleString()} PTS</strong>
                                <img src="/assets/image/home/wallet_3d.png" alt="Reward points" />
                            </div>
                        </section>

                        {error && (
                            <div className="alert alert-danger py-1 mb-3">{error}</div>
                        )}

                        {editing ? (
                            <form className="profile-form login-form p-4 rounded" onSubmit={saveProfile}>
                                <div className="mb-3">
                                    <label className="form-label" htmlFor="profile_username">Username</label>
                                    <input
                                        id="profile_username"
                                        className="form-control"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label" htmlFor="profile_name">Name</label>
                                    <input
                                        id="profile_name"
                                        className="form-control"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>

                                <div className="d-flex gap-2">
                                    <button type="button" className="btn btn-secondary w-50" onClick={closeForms}>Cancel</button>
                                    <button type="submit" className="btn profile-primary-button w-50" disabled={saving}>
                                        {saving ? "Saving..." : "Save"}
                                    </button>
                                </div>
                            </form>
                        ) : changingPassword ? (
                            <form className="profile-form login-form p-4 rounded" onSubmit={savePassword}>
                                <div className="mb-3">
                                    <label className="form-label" htmlFor="current_password">Current password</label>
                                    <input
                                        id="current_password"
                                        type="password"
                                        className="form-control"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label" htmlFor="new_password">New password</label>
                                    <input
                                        id="new_password"
                                        type="password"
                                        className="form-control"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        minLength={6}
                                        required
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label" htmlFor="new_password_confirmation">Confirm new password</label>
                                    <input
                                        id="new_password_confirmation"
                                        type="password"
                                        className="form-control"
                                        value={passwordConfirmation}
                                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                                        minLength={6}
                                        required
                                    />
                                </div>

                                <div className="d-flex gap-2">
                                    <button type="button" className="btn btn-secondary w-50" onClick={closeForms}>Cancel</button>
                                    <button type="submit" className="btn profile-primary-button w-50" disabled={saving}>
                                        {saving ? "Saving..." : "Save"}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <section className="profile-actions">
                                <button type="button" className="profile-action purple-pink-border" onClick={() => setEditing(true)}>
                                    <i className="fa-solid fa-pen"></i> Edit profile
                                </button>
                                <button type="button" className="profile-action purple-pink-border" onClick={() => setChangingPassword(true)}>
                                    <i className="fa-solid fa-lock"></i> Change password
                                </button>
                                <button type="button" className="profile-action purple-pink-border" onClick={() => navigate("/notifications")}>
                                    <i className="fa-regular fa-bell"></i> Notifications
                                </button>
                                <button type="button" className="profile-action profile-logout" onClick={logout}>
                                    <i className="fa-solid fa-right-from-bracket"></i> Logout
                                </button>
                            </section>
                        )}
                    </div>
                )}
            </div>

            <NavigationBar active="profile" />
        </div>
    );
}

export default ProfilePage;
