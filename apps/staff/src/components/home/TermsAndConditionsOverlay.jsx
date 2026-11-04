import React from "react";
import { Button, Icon } from "framework7-react";
import { useTranslation } from "../../services/useTranslation";

const languages = [
  { value: "en", label: "English", img: "/images/languageEn.png" },
  { value: "cn", label: "中文", img: "/images/languageCn.png" },
  { value: "viet", label: "Vietnamese", img: "/images/languageViet.png" },
  { value: "thai", label: "Thailand", img: "/images/languageThai.png" },
];

const defaultLanguage = { value: "en", label: "English", img: "/images/languageEn.png" };

export default function TermsAndConditionsOverlay({
  showTnc,
  selectedLanguage,
  dropdownOpen,
  toggleDropdown,
  selectLanguage,
  tncContent,
  canAccept,
  tncError,
  onScroll,
  onAccept,
}) {
  const { t } = useTranslation();
  if (!showTnc) return null;

  return (
    <div className="tnc-overlay">
      <div className="tnc-content">
        <div className="tnc-header">
          <div className="language-logo">
            <div className="custom-dropdown">
              <div className="selected-language" onClick={toggleDropdown}>
                <img
                  src={
                    languages.find((lang) => lang.value === selectedLanguage)?.img || defaultLanguage.img
                  }
                  alt={
                    languages.find((lang) => lang.value === selectedLanguage)?.label ||
                    defaultLanguage.label
                  }
                  className="language-icon"
                />
                <span>
                  {languages.find((lang) => lang.value === selectedLanguage)?.label ||
                    defaultLanguage.label}
                </span>
                <Icon f7="chevron_down" className="font-medium" />
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
        </div>
        <h2>{t("terms_and_conditions")}</h2>
        <div className="tnc-text" onScroll={onScroll} style={{ maxHeight: "400px", overflowY: "auto" }}>
          {tncContent.map((item, index) => (
            <p key={index}>{item}</p>
          ))}
          <div style={{ height: "1px" }} />
        </div>
        {tncError && (
          <div className="tnc-error">
            <p>{tncError}</p>
          </div>
        )}
        <div className="tnc-buttons">
          <Button
            fill
            onClick={onAccept}
            className={`accept-button ${!canAccept ? "disabled" : ""}`}
          >
            {t("accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
