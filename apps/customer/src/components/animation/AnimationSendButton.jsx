import { useState } from "react";
import { getApiUrl } from "../../config/api";

export default function AnimationSendButton({
    interaction,
    display,
    customer,
    staff
}) {
    const [loading, setLoading] = useState(false);

    const sendVibe = async () => {
        console.log("===== NEW SEND BUTTON =====");
        console.log("Staff:", staff);
        console.log("Interaction:", interaction);
        console.log("Display:", display);

        if (!staff) {
            alert("Please select a staff member first.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                `${getApiUrl()}/playlists/start`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem(
                            "customer_token"
                        )}`,
                    },
                    body: JSON.stringify({
                        display_id: display.id,
                        interaction_id: interaction.id,
                        staff_id: staff.id,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed.");
            }

            alert(
                `${interaction.name} sent to ${staff.name} successfully!`
            );

        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            className="send-button m-2"
            onClick={sendVibe}
            disabled={loading}
        >
            {/* Interaction Image */}
            {interaction.image?.url && (
                <img
                    src={interaction.image.url}
                    alt={interaction.name}
                    className="interaction-image"
                />
            )}

            {/* Name */}
            <div>{interaction.name}</div>

            {/* Coins */}
            <span
                style={{
                    background: "rgba(67, 35, 150, 0.75)",
                    border: "1px solid #9B6CFF",
                    borderRadius: "10px",
                    padding: "2px 9px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#E9DEFF",
                    boxShadow:
                        "0 0 6px #8B5CF6, 0 0 10px rgba(139, 92, 246, 0.6)",
                    textShadow:
                        "0 0 4px #BFA7FF, 0 0 7px #8B5CF6",
                }}
            >
                {Number(interaction.amount).toLocaleString(
                    undefined,
                    {
                        minimumFractionDigits:
                            Number(interaction.amount) % 1 === 0
                                ? 0
                                : 2,
                        maximumFractionDigits: 2,
                    }
                )}{" "}
                Coins
            </span>
        </button>
    );
}