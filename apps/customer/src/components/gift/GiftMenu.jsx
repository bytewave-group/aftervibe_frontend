import { useState } from "react";
import { FaTimes } from "react-icons/fa";

export default function GiftMenu({
    staff,
    customer,
    displays,
    onGiftSelect,
    onGiftSend,
    onClose,
}) {
    const [selectedGiftId, setSelectedGiftId] = useState(null);
    const [showSent, setShowSent] = useState(false);
    const [sending, setSending] = useState(false);
    const [sentGift, setSentGift] = useState(null);

    const recipient = staff || customer;

    if (!recipient) {
        return null;
    }

    const handleGiftClick = (display, interaction) => {
        setSelectedGiftId(interaction.id);
        onGiftSelect?.(
            display,
            interaction,
            recipient
        );
    };

    const handleSend = async (display, interaction) => {
        if (sending) {
            return;
        }
    
        setSending(true);
    
        try {
            const result = await onGiftSend?.(
                display,
                interaction,
                recipient
            );
    
            setSentGift({
                recipientName: recipient.username,
                interactionName: interaction.name,
                amount: interaction.amount,
            });
            
            setShowSent(true);
    
            setTimeout(() => {
                setShowSent(false);
                setSentGift(null);
                setSending(false);
            }, 1800);
    
        } catch (error) {
            console.error("Send gift failed:", error);
            setSending(false);
        }
    };

    return (
        <div className="gift-menu-wrapper">
            <div className="gift-keyboard">

                {/* Header */}
                <div className="gift-keyboard-header">

                    <div>
                        <div className="gift-keyboard-title">
                            GIFT MENU
                        </div>
                        <div className="gift-keyboard-recipient">
                            To:{" "}
                            <span>{recipient.username}</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="gift-keyboard-close"
                    >
                        <FaTimes />
                    </button>

                </div>

                {/* Gift Grid */}
                <div className="gift-keyboard-grid">
                    {displays.map((display) => {
                        const interaction = display.interaction;

                        if (!interaction) {
                            return null;
                        }

                        const isSelected = selectedGiftId === interaction.id;

                        return (
                            <div
                                key={display.id}
                                className={`gift-item ${isSelected ? "selected" : ""}`}
                            >
                                <div
                                    className="gift-key"
                                    onClick={() =>
                                        !isSelected &&
                                        handleGiftClick(display, interaction)
                                    }
                                >
                                    {interaction.image?.url ? (
                                        <img
                                            src={interaction.image.url}
                                            alt={interaction.name}
                                            className="gift-key-image"
                                        />
                                    ) : (
                                        <div className="gift-key-placeholder">
                                            🎁
                                        </div>
                                    )}

                                    {!isSelected && (
                                        <div className="gift-key-name">
                                            {interaction.name}
                                        </div>
                                    )}

                                    <div className={`gift-key-price ${isSelected ? "mt-1" : ""}`}>
                                        {Number(
                                            interaction.amount
                                        ).toLocaleString(
                                            undefined,
                                            {
                                                minimumFractionDigits:
                                                    Number(
                                                        interaction.amount
                                                    ) % 1 === 0
                                                        ? 0
                                                        : 2,
                                                maximumFractionDigits: 2,
                                            }
                                        )}{" "}
                                        Coins
                                    </div>

                                    {isSelected && (
                                        <button
                                            type="button"
                                            className="gift-item-send"
                                            disabled={sending}
                                            onClick={(e) => {
                                                e.stopPropagation();

                                                handleSend(
                                                    display,
                                                    interaction
                                                );
                                            }}
                                        >
                                            {sending ? "SENDING..." : "SEND"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                  
                    })}
                </div>

            </div>

            {showSent && (
                <div className="gift-sent-overlay">
                    <div className="gift-sent-card">
                        <div className="gift-sent-icon">✓</div>

                        <div className="gift-sent-title">
                            Gift Sent
                        </div>

                        <div className="gift-sent-recipient">
                            To: {sentGift?.recipientName ?? "-"}
                        </div>

                        <div className="gift-sent-amount">
                            {Number(sentGift?.amount ?? 0).toLocaleString()} Coins
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
}