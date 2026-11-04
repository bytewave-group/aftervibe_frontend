import React, { useState, useEffect, useRef } from 'react';
import { Icon, f7 } from 'framework7-react';
import { Preferences } from "@capacitor/preferences";
import { useTranslation } from "../services/useTranslation";
import useAuthenticate from "../actions/Authenticate";
import useCommon from './action/Common';
import { loadUser, saveUser } from './action/preferences';

const Header = ({ title, onClockClick, orderListType, showHandOver }) => {
    const { t, i18n } = useTranslation();
    const { changeLanguage } = useAuthenticate();
    const [selectedLanguage, setSelectedLanguage] = useState("en");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { navigate } = useCommon();
    const languages = [
        { value: "en", label: t("English"), img: "/images/languageEn.png" },
        { value: "cn", label: t("中文"), img: "/images/languageCn.png" },
        { value: "viet", label: t("Vietnamese"), img: "/images/languageViet.png" },
        { value: "thai", label: t("Thailand"), img: "/images/languageThai.png" },
    ];

    useEffect(() => {
        const loadLanguage = async () => {
            // Check both preference keys for compatibility
            const { value: languageValue } = await Preferences.get({ key: "language" });
            const { value: selectedLanguageValue } = await Preferences.get({ key: "selected_language" });
            const savedLanguage = languageValue || selectedLanguageValue;

            if (savedLanguage) {
                setSelectedLanguage(savedLanguage);
                await i18n.changeLanguage(savedLanguage);
            } else {
                const currentLang = i18n.language || 'en';
                setSelectedLanguage(currentLang);
            }
        };
        loadLanguage();

        // Listen to i18n language changes
        const handleLanguageChange = (lng) => {
            setSelectedLanguage(lng);
        };

        i18n.on('languageChanged', handleLanguageChange);

        return () => {
            i18n.off('languageChanged', handleLanguageChange);
        };
    }, [i18n]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };

        if (dropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("touchstart", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [dropdownOpen]);

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    const selectLanguage = async (value) => {
        const form = {
            tenant_id: "dd07a947-a255-4018-a21e-8f710f20ed28",
            locale: value,
        };
        changeLanguage(form);
        // Save to both preference keys for compatibility
        await Preferences.set({
            key: "language",
            value: value,
        });
        await Preferences.set({
            key: "selected_language",
            value: value,
        });
        setSelectedLanguage(value);
        // Ensure i18n language is changed and wait for it
        await i18n.changeLanguage(value);

        try {
            const currentUser = await loadUser();
            if (currentUser) {
                // Handle both nested structure { token, user } and flat structure
                const userData = currentUser?.user || currentUser;
                if (userData) {
                    const updatedUser = { ...currentUser };
                    if (currentUser.user) {
                        updatedUser.user = { ...userData, locale: value };
                    } else {
                        updatedUser.locale = value;
                    }
                    await saveUser(updatedUser);
                }
            }
        } catch (error) {
            console.error("Error updating user locale:", error);
        }

        setDropdownOpen(false);
    };

    const handleBack = () => {
        // f7.views.main.router.back();
        navigate(-1);
    };

    const currentLanguage = languages.find((lang) => lang.value === selectedLanguage) || languages[0];

    return (
        <div className="header-wrapper">
            <div className="header-container">
                <div className="back-button" onClick={() => handleBack()}>
                    <Icon f7="chevron_left" className="font-x-large font-bold" />
                </div>
                <div className="header-title font-large">{title}</div>
                {orderListType && (
                    <div
                        className="header-order-list-icon"
                        onClick={() => navigate(`/order-list?type=${orderListType}`)}
                    >
                        <Icon f7="list_bullet" className="font-x-large" color="white" />
                    </div>
                )}
                {onClockClick && (
                    <div
                        className="header-clock-icon"
                        onClick={() => navigate("/mc-history")}
                    >
                        <Icon f7="clock" className="font-x-large" color="white" />
                    </div>
                )}
                {showHandOver && (
                    <div
                        className="header-hand-over-icon"
                        onClick={() => navigate("/hand-in")}
                        title={t("Hand Over List")}
                    >
                        <Icon f7="clock" className="font-x-large" color="white" />
                    </div>
                )}
                <div className={`header-language-selector ${dropdownOpen ? 'dropdown-open' : ''}`} ref={dropdownRef}>
                    <div className="header-language-icon" onClick={toggleDropdown}>
                        <img
                            src={currentLanguage?.img}
                            alt={currentLanguage?.label}
                            className="header-language-logo"
                        />
                        <Icon f7="chevron_down" className="header-language-chevron" />
                    </div>
                    {dropdownOpen && (
                        <div className="header-language-dropdown">
                            {languages.map((lang) => (
                                <div
                                    key={lang.value}
                                    className="header-language-option"
                                    onClick={() => selectLanguage(lang.value)}
                                >
                                    <img src={lang.img} alt={lang.label} className="header-language-logo" />
                                    <span>{lang.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Header;