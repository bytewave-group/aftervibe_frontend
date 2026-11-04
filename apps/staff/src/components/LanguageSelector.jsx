import React, { useState, useEffect, useRef } from "react";
import { Preferences } from "@capacitor/preferences";
import { useTranslation } from "../services/useTranslation";
import useAuthenticate from "../actions/Authenticate";

const LanguageSelector = () => {
    const { t, i18n } = useTranslation();
    const { changeLanguage } = useAuthenticate();
    const [selectedLanguage, setSelectedLanguage] = useState("en");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

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
                // Sync with i18n's current language
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

    // Close dropdown when clicking outside
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
        setDropdownOpen(false);
    };

    const currentLanguage = languages.find((lang) => lang.value === selectedLanguage) || languages[0];

    return (
        <div className="language-logo" ref={dropdownRef}>
            <div className="custom-dropdown">
                <div className="selected-language" onClick={() => toggleDropdown()}>
                    <img
                        src={currentLanguage.img}
                        className="language-icon"
                    />
                    {/* <span>{currentLanguage.label}</span> */}
                    <i className="f7-icons font-medium">chevron_down</i>
                </div>
                {dropdownOpen && (
                    <div className="dropdown-options">
                        {languages.map((lang) => (
                            <div
                                key={lang.value}
                                className="dropdown-option"
                                onClick={() => selectLanguage(lang.value)}
                            >
                                <img src={lang.img} alt={lang.label} className="language-icon" />
                                <span>{lang.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LanguageSelector;

