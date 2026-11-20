import React from "react";
import { Block } from "framework7-react";

const MANUAL = "__manual";

/**
 * Room / table picker for the KTV order form. Uses the venue's floor plans (floor_plan_lists) when a layout
 * is configured, with "Other (type manually)" as a free-text fallback. Without a layout it is the plain
 * table-number input it replaces. `allowManual={false}` hides the free-text option (floor plan moves need a real spot).
 */
const KtvSpotPicker = ({
    t,
    layout,
    selectedSpot,
    onSelectSpot,
    manual,
    onManualChange,
    tableNumber,
    onTableNumberChange,
    inputId,
    allowManual = true,
}) => {
    const hasLayout = Boolean(layout && layout.has_layout);

    const textInput = (
        <input
            id={inputId}
            type="text"
            inputMode="numeric"
            placeholder={t("Enter Table Number")}
            value={tableNumber}
            onChange={onTableNumberChange}
            className="custom-hour-field"
        />
    );

    if (!hasLayout && !selectedSpot) {
        return (
            <Block className="custom-hour-input" style={{ padding: "0", marginTop: "0" }}>
                <label htmlFor={inputId} className="custom-hour-label">
                    {t("Table Number")}:
                </label>
                {textInput}
            </Block>
        );
    }

    const optionLabel = (spot) => (spot.occupied_count > 0 ? `${spot.name} (${spot.occupied_count} ${t("girls")})` : spot.name);
    const plans = (layout && layout.plans) || [];
    const others = (layout && layout.others) || [];
    const selectedKey = manual ? MANUAL : selectedSpot ? `${selectedSpot.type}:${selectedSpot.id}` : "";
    const knownKeys = new Set([
        ...plans.flatMap((plan) => plan.spots.filter((spot) => spot.assignable).map((spot) => spot.key)),
        ...others.map((other) => other.key),
    ]);

    const handleChange = (event) => {
        const value = event.target.value;
        if (value === MANUAL) {
            onManualChange(true);
            onSelectSpot(null);
            return;
        }
        onManualChange(false);
        if (!value) {
            onSelectSpot(null);
            return;
        }
        const [type, id] = value.split(":");
        const spot = plans.flatMap((plan) => plan.spots).find((item) => item.key === value)
            || others.find((item) => item.key === value);
        onSelectSpot({ type, id: Number(id), name: spot ? spot.name : (selectedSpot && selectedSpot.name) || value });
    };

    return (
        <Block className="custom-hour-input" style={{ padding: "0", marginTop: "0" }}>
            <label htmlFor={`${inputId}-spot`} className="custom-hour-label">
                {t("Room / Table")}:
            </label>
            <select id={`${inputId}-spot`} className="custom-hour-field" value={selectedKey} onChange={handleChange}>
                <option value="">{t("Select room / table")}</option>
                {selectedSpot && !knownKeys.has(selectedKey) && selectedKey !== MANUAL && (
                    <option value={selectedKey}>{selectedSpot.name}</option>
                )}
                {plans.map((plan) => {
                    const spots = plan.spots.filter((spot) => spot.assignable);
                    if (!spots.length) {
                        return null;
                    }
                    return (
                        <optgroup key={plan.id} label={plan.name}>
                            {spots.map((spot) => (
                                <option key={spot.key} value={spot.key}>{optionLabel(spot)}</option>
                            ))}
                        </optgroup>
                    );
                })}
                {others.length > 0 && (
                    <optgroup label={t("Other rooms / tables")}>
                        {others.map((other) => (
                            <option key={other.key} value={other.key}>{optionLabel(other)}</option>
                        ))}
                    </optgroup>
                )}
                {allowManual && <option value={MANUAL}>{t("Other (type manually)")}</option>}
            </select>
            {manual && textInput}
        </Block>
    );
};

export default KtvSpotPicker;
