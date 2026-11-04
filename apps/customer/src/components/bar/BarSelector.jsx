import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BARS_URL } from "../../config/api";
import { normalizeBarUrl, setCurrentBar } from "../../config/bar";

const CURRENT_BAR_OPTION = "current";

function BarSelector({ bar, onBarChange, textClassName = "" }) {
    const { t } = useTranslation();

    const [bars, setBars] = useState([]);
    const [barsLoading, setBarsLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        const fetchBars = async () => {
            setBarsLoading(true);
            setError("");

            try {
                const response = await fetch(BARS_URL, {
                    headers: {
                        Accept: "application/json",
                    },
                });
                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error("Unable to load bars.");
                }

                if (!cancelled) {
                    setBars(data.bars ?? []);
                }
            } catch (error) {
                console.error("BAR FETCH ERROR:", error);
                if (!cancelled) {
                    setError(t("Unable to load bars."));
                }
            } finally {
                if (!cancelled) {
                    setBarsLoading(false);
                }
            }
        };

        fetchBars();

        return () => {
            cancelled = true;
        };
    }, [t]);

    const listedBar = bar
        ? bars.find(
            (item) =>
                (bar.id != null && String(item.id) === String(bar.id)) ||
                normalizeBarUrl(item.url || item.domain) === bar.url
        )
        : null;

    const selectedValue = listedBar
        ? String(listedBar.id)
        : bar
            ? CURRENT_BAR_OPTION
            : "";

    const selectBar = (selectedBar) => {
        const savedBar = setCurrentBar({
            id: selectedBar.id,
            name: selectedBar.name,
            url: selectedBar.url || selectedBar.domain,
        });

        if (!savedBar) {
            setError(t("Please enter a valid bar URL."));
            return;
        }

        setError("");
        onBarChange(savedBar);
    };

    const handleBarChange = (e) => {
        const selectedBar = bars.find(
            (item) => String(item.id) === e.target.value
        );

        if (selectedBar) {
            selectBar(selectedBar);
        }
    };

    return (
        <div className="mb-3">
            {error && (
                <div className="alert alert-danger py-1 mb-3">
                    {error}
                </div>
            )}

            <label className={`form-label ${textClassName}`} htmlFor="bar">
                {t("Select Bar")}
            </label>
            <select
                id="bar"
                className="form-select"
                value={selectedValue}
                onChange={handleBarChange}
                disabled={barsLoading}
            >
                {!bar && (
                    <option value="">
                        {barsLoading
                            ? t("Loading bars...")
                            : t("Select your bar")}
                    </option>
                )}
                {bar && !listedBar && (
                    <option value={CURRENT_BAR_OPTION}>
                        {bar.name || bar.url}
                    </option>
                )}
                {bars.map((item) => (
                    <option key={item.id} value={item.id}>
                        {item.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default BarSelector;
