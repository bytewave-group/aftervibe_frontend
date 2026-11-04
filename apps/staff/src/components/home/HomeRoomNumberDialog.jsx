import React from "react";
import { Input } from "framework7-react";
import Tools from "../tools";
import { useTranslation } from "../../services/useTranslation";

export default function HomeRoomNumberDialog({
  active,
  roomNumber,
  onRoomNumberChange,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation();
  return (
    <Tools
      type="custom"
      active={active}
      data={{
        title: t("Enter Room Number"),
        confirmText: t("Submit"),
        cancelText: t("Cancel"),
      }}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <div className="room-number-input-container">
        <div className="form-input-container">
          <Input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={roomNumber}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || /^\d+$/.test(value)) {
                onRoomNumberChange(value);
              }
            }}
            placeholder={t("Enter Room Number")}
            className="form-input"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                onConfirm();
              }
            }}
          />
        </div>
      </div>
    </Tools>
  );
}
