import React, { useState, useEffect } from "react";
import { f7, Page, Button } from "framework7-react";
import useAuthenticate from "../actions/Authenticate";
import env from "../../environment.json";
import { useTranslation } from "../services/useTranslation";

const FLOWER_STATUS_CONFIRMED = 2;
const FLOWER_STATUS_CANCELLED = 3;

const FlowerMovementConfirmationPage = ({ f7router, claimData: initialClaimData, ...props }) => {
    const { t } = useTranslation();
    const { pending_flower_movement_lists, update_flower_movement_status } = useAuthenticate();

    const routeProps = f7router?.route?.props || {};
    const routeQuery = f7router?.route?.query || {};
    const claimDataFromProps = props?.claimData || initialClaimData;
    const claimDataFromRoute = routeProps?.claimData || routeQuery?.claimData;
    const claimDataFromRouteParsed = claimDataFromRoute
        ? (typeof claimDataFromRoute === "string" ? JSON.parse(claimDataFromRoute) : claimDataFromRoute)
        : null;
    const finalClaimData = claimDataFromProps || claimDataFromRouteParsed;

    const [claims, setClaims] = useState(finalClaimData || []);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [totalClaims, setTotalClaims] = useState(finalClaimData?.length || 0);
    const [isLoading, setIsLoading] = useState(!finalClaimData || finalClaimData.length === 0);

    useEffect(() => {
        if (isProcessing) {
            f7.preloader.show();
        } else {
            f7.preloader.hide();
        }

        return () => {
            f7.preloader.hide();
        };
    }, [isProcessing]);

    useEffect(() => {
        const fetchClaims = async () => {
            if (finalClaimData && finalClaimData.length > 0) {
                setClaims(finalClaimData);
                setTotalClaims(finalClaimData.length);
                setIsLoading(false);

                if (currentIndex >= finalClaimData.length) {
                    setCurrentIndex(Math.max(0, finalClaimData.length - 1));
                }
            } else if (isLoading) {
                f7.preloader.show();
                try {
                    const response = await pending_flower_movement_lists({
                        private_key: env.private_key,
                    });
                    if (response.status && response.data && response.data.length > 0) {
                        setClaims(response.data);
                        setTotalClaims(response.data.length);
                        setIsLoading(false);
                    } else {
                        f7.views?.main?.router?.back?.();
                    }
                } catch (error) {
                    console.error("Error fetching pending flower movements:", error);
                    f7.views?.main?.router?.back?.();
                } finally {
                    f7.preloader.hide();
                }
            }
        };

        fetchClaims();
    }, [finalClaimData, isLoading]);

    useEffect(() => {
        const handleClaimUpdate = (event) => {
            const { claimData } = event.detail;
            if (claimData && Array.isArray(claimData) && claimData.length > 0) {
                setClaims(claimData);
                setTotalClaims(claimData.length);
                setIsLoading(false);

                setCurrentIndex((prevIndex) => {
                    if (prevIndex >= claimData.length) {
                        return Math.max(0, claimData.length - 1);
                    }
                    return prevIndex;
                });
            }
        };

        window.addEventListener("flowerMovementConfirmationUpdate", handleClaimUpdate);

        return () => {
            window.removeEventListener("flowerMovementConfirmationUpdate", handleClaimUpdate);
        };
    }, []);

    useEffect(() => {
        let swiperInstance = null;

        const initSwiper = () => {
            if (claims.length === 0) return;

            try {
                swiperInstance = f7.swiper.create(".flower-movement-confirmation-swiper", {
                    speed: 300,
                    spaceBetween: 0,
                    allowTouchMove: false,
                    autoHeight: true,
                    effect: "slide",
                    on: {
                        slideChange: function () {
                            setCurrentIndex(this.activeIndex);
                        },
                    },
                });
            } catch (error) {
                console.warn("Error creating flower movement confirmation swiper:", error);
            }
        };

        const timer = setTimeout(initSwiper, 100);

        return () => {
            clearTimeout(timer);
            if (swiperInstance && typeof swiperInstance.destroy === "function") {
                try {
                    swiperInstance.destroy();
                } catch (error) {
                    console.warn("Error destroying flower movement confirmation swiper:", error);
                }
            }
        };
    }, [claims.length]);

    useEffect(() => {
        try {
            const swiper = f7.swiper.get(".flower-movement-confirmation-swiper");
            if (swiper && typeof swiper.update === "function" && typeof swiper.slideTo === "function") {
                swiper.update();
                swiper.slideTo(currentIndex, 300);
            }
        } catch (error) {
            console.warn("Error updating flower movement confirmation swiper:", error);
        }
    }, [claims, currentIndex]);

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < claims.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    const formatAmount = (amount) => parseFloat(amount || 0).toFixed(2);

    const getMovementTypeLabel = (claim) => {
        const typeLabel = claim?.type_label;
        if (typeLabel) {
            if (typeLabel === "Claim" || typeLabel === "Sell") return t("Claim");
            if (typeLabel === "Buy") return t("Buy");
            if (typeLabel === "Return") return t("Return");
            return t(typeLabel);
        }

        const type = claim?.type;
        if (type === 2 || type === "Claim") return t("Claim");
        if (type === 1 || type === "Buy") return t("Buy");
        if (type === 3 || type === "Return") return t("Return");
        return t("Claim");
    };

    const getStatusLabel = (claim) => {
        if (claim?.status_label) return claim.status_label;
        if (claim?.status === 1) return t("pending");
        if (claim?.status === 2) return t("Confirmed");
        if (claim?.status === 3) return t("Cancelled");
        return t("pending");
    };

    const handleStatusUpdate = async (status) => {
        const claim = claims[currentIndex];
        if (!claim?.unique_key || isProcessing) return;

        setIsProcessing(true);
        try {
            const response = await update_flower_movement_status({
                private_key: env.private_key,
                unique_key: claim.unique_key,
                status,
            });

            if (response.status) {
                const isLastClaim = claims.length === 1;
                const successMessage = status === FLOWER_STATUS_CONFIRMED
                    ? (response.message || t("Claim confirmed"))
                    : (response.message || t("Claim cancelled"));

                f7.toast.show({
                    text: successMessage,
                    position: "center",
                    closeTimeout: isLastClaim ? 1500 : 2000,
                });

                if (isLastClaim) {
                    setTimeout(() => {
                        f7.views?.main?.router?.back?.();
                    }, 500);
                } else {
                    const updatedClaims = claims.filter((_, index) => index !== currentIndex);
                    setClaims(updatedClaims);
                    setTotalClaims(updatedClaims.length);

                    const nextIndex = currentIndex >= updatedClaims.length
                        ? Math.max(0, updatedClaims.length - 1)
                        : currentIndex;
                    setCurrentIndex(nextIndex);
                }
            } else {
                f7.toast.show({
                    text: response.message || t("Confirmation failed"),
                    position: "center",
                    closeTimeout: 2000,
                });
            }
        } catch (error) {
            console.error("Error updating flower movement status:", error);
            f7.toast.show({
                text: t("Confirmation failed"),
                position: "center",
                closeTimeout: 2000,
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const isPreviousDisabled = currentIndex === 0;
    const isNextDisabled = currentIndex === claims.length - 1;

    return (
        <Page className="order-confirmation-page flower-movement-confirmation-page">
            <div className="content-panel">
                <div className="content">
                    <div className="order-header-section">
                        <div className="order-header-badge">
                            <span className="badge-number">{totalClaims}</span>
                        </div>
                        <div className="order-header-text">
                            <h2 className="order-header-title">
                                {totalClaims === 1
                                    ? t("You have 1 claim to confirm")
                                    : t("You have {{count}} claims to confirm", { count: totalClaims })}
                            </h2>
                            <p className="order-header-subtitle">
                                {t("Please confirm the following claim details")}
                            </p>
                        </div>
                    </div>

                    <div className="flower-movement-confirmation-swiper swiper">
                        <div className="swiper-wrapper">
                            {claims.length > 0 ? (
                                claims.map((claim) => (
                                    <div className="swiper-slide" key={claim.id || claim.unique_key}>
                                        <div className="order-card">
                                            <div className="order-card-header">
                                                <div className="order-id-badge">
                                                    <i className="f7-icons">tag</i>
                                                    <span>#{claim.id}</span>
                                                </div>
                                                {totalClaims > 1 && (
                                                    <div className="order-navigation">
                                                        <button
                                                            className={`nav-button prev ${isPreviousDisabled ? "disabled" : ""}`}
                                                            onClick={handlePrevious}
                                                            disabled={isPreviousDisabled}
                                                        >
                                                            <i className="f7-icons">chevron_left</i>
                                                        </button>
                                                        <span className="order-counter">
                                                            {currentIndex + 1} / {totalClaims}
                                                        </span>
                                                        <button
                                                            className={`nav-button next ${isNextDisabled ? "disabled" : ""}`}
                                                            onClick={handleNext}
                                                            disabled={isNextDisabled}
                                                        >
                                                            <i className="f7-icons">chevron_right</i>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="claim-amount-hero">
                                                <span className="claim-amount-label">{t("amount")}</span>
                                                <span className="claim-amount-value">
                                                    RM {formatAmount(claim.amount)}
                                                </span>
                                            </div>

                                            <div className="order-details-grid claim-details-grid">
                                                <div className="detail-card">
                                                    <div className="detail-icon">
                                                        <i className="f7-icons">cube</i>
                                                    </div>
                                                    <div className="detail-content">
                                                        <div className="detail-label">{t("type")}</div>
                                                        <div className="detail-value">
                                                            {getMovementTypeLabel(claim)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {claim.user_name && (
                                                    <div className="detail-card">
                                                        <div className="detail-icon">
                                                            <i className="f7-icons">person</i>
                                                        </div>
                                                        <div className="detail-content">
                                                            <div className="detail-label">{t("User Name")}</div>
                                                            <div className="detail-value">{claim.user_name}</div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="detail-card">
                                                    <div className="detail-icon">
                                                        <i className="f7-icons">hourglass</i>
                                                    </div>
                                                    <div className="detail-content">
                                                        <div className="detail-label">{t("Status")}</div>
                                                        <div className="detail-value">{getStatusLabel(claim)}</div>
                                                    </div>
                                                </div>

                                                {claim.remark && (
                                                    <div className="detail-card">
                                                        <div className="detail-icon">
                                                            <i className="f7-icons">text_bubble</i>
                                                        </div>
                                                        <div className="detail-content">
                                                            <div className="detail-label">{t("Remarks")}</div>
                                                            <div className="detail-value">{claim.remark}</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="order-actions dual-actions">
                                                <Button
                                                    className="cancel-button"
                                                    outline
                                                    onClick={() => handleStatusUpdate(FLOWER_STATUS_CANCELLED)}
                                                    disabled={isProcessing}
                                                >
                                                    <i className="f7-icons">xmark_circle</i>
                                                    <span>{t("Cancel")}</span>
                                                </Button>
                                                <Button
                                                    className="confirm-button"
                                                    fill
                                                    onClick={() => handleStatusUpdate(FLOWER_STATUS_CONFIRMED)}
                                                    disabled={isProcessing}
                                                >
                                                    <i className="f7-icons">checkmark_circle</i>
                                                    <span>{t("Confirm")}</span>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="swiper-slide">
                                    <div className="order-card empty-state">
                                        <div className="empty-state-content">
                                            {isLoading ? (
                                                <>
                                                    <i className="f7-icons empty-icon">hourglass</i>
                                                    <h3>{t("loading")}</h3>
                                                    <p>{t("Fetching claim data")}</p>
                                                </>
                                            ) : (
                                                <>
                                                    <i className="f7-icons empty-icon">checkmark_circle</i>
                                                    <h3>{t("No claims to confirm")}</h3>
                                                    <p>{t("All claims confirmed")}</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Page>
    );
};

export default FlowerMovementConfirmationPage;
