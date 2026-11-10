import React from "react";
import { Icon } from "framework7-react";
import { useTranslation } from "../../services/useTranslation";
import useCommon from "../action/Common";

export default function HomeMenuSections({
  menuSections,
  userRole,
  pendingCounts,
  hasPermission,
}) {
  const { t } = useTranslation();
  const { navigate } = useCommon();
  const role = userRole?.toLowerCase();
  const isManager = role === "manager";
  const isMummy = role === "mummy";
  const isDoctor = role === "doctor";
  const isStaff = role === "staff";

  const renderMenuSection = (section) => {
    if (!section || !section.items || !Array.isArray(section.items)) return null;

    if (isManager || isMummy || isDoctor) {
      const hasAnyPermission = section.items.some((item) =>
        item.permission ? hasPermission(item.permission) : true
      );
      if (!hasAnyPermission) return null;
    }

    if (isStaff) {
      const visibleItems = section.items.filter((item) => {
        if (item.permission && !hasPermission(item.permission)) {
          return false;
        }
        if (item.condition) {
          return item.condition();
        }
        return true;
      });
      if (visibleItems.length === 0) return null;
    }

    let titleText = section.title;

    const titleMap = {
      Flower: "Flower",
      Actions: "Actions",
      Order: "Orders",
      Report: "Reports",
      Management: "Management",
      View: "View",
      "Create Order": "Create Order",
      Device: "Device",
    };
    const translationKey = titleMap[section.title];
    if (translationKey) {
      titleText = translationKey;
    } else {
      titleText = section.title;
    }

    const containerClass =
      isStaff && section.title === "View" ? "view-container" : "action-container";
    const itemClass = isStaff && section.title === "View" ? "view-item" : "action-item";
    const linkClass = isStaff && section.title === "View" ? "view-link" : "action-link";
    const iconClass =
      isStaff && section.title === "View" ? "view-icon font-x-large" : "action-icon font-large";
    const textClass =
      isStaff && section.title === "View"
        ? "view-text font-medium font-bold"
        : "action-text font-medium font-bold";

    return (
      <React.Fragment key={section.title}>
        <div
          className={
            isStaff && section.title === "View"
              ? "view-title font-x-large font-bold"
              : "action-title font-x-large font-bold"
          }
        >
          {t(titleText)}
        </div>
        <div className={containerClass}>
          {section.items.map((item, index) => {
            if ((isManager || isMummy || isDoctor) && item.permission && !hasPermission(item.permission))
              return null;

            if (isStaff) {
              if (item.permission && !hasPermission(item.permission)) return null;
              if (item.condition && !item.condition()) return null;
            }

            const badgeCount = item.badgeKey ? pendingCounts[item.badgeKey] : 0;
            const hasBadge = badgeCount > 0;

            const handleClick = item.onClick || (() => navigate(item.route));

            const displayText = t(item.text);

            const itemKey = item.route || item.permission || `${section.title}-${index}`;

            return (
              <div key={itemKey} className={itemClass} onClick={!item.onClick ? handleClick : undefined}>
                <div className={linkClass} onClick={item.onClick ? handleClick : undefined}>
                  <Icon className={iconClass} f7={item.icon} />
                  {hasBadge ? (
                    <div className="action-text-container">
                      <div className={textClass}>{displayText}</div>
                      <div className="action-text-badge text-center">
                        <span className="font-bold">{badgeCount}</span>
                      </div>
                    </div>
                  ) : (
                    <div className={textClass}>{displayText}</div>
                  )}
                  <Icon className="right-icon font-bold" f7="chevron_right" />
                </div>
              </div>
            );
          })}
        </div>
      </React.Fragment>
    );
  };

  return <>{menuSections.map(renderMenuSection)}</>;
}
