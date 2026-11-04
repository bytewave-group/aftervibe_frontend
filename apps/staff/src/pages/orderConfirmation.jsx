import React, { useState, useEffect } from "react";
import { f7, Page, Button } from "framework7-react";
import useAuthenticate from "../actions/Authenticate";
import { useTokenAndUser } from "../components/action/user-data";
import env from "../../environment.json";
import { useTranslation } from "../services/useTranslation";

const OrderConfirmationPage = ({ f7router, orderData: initialOrderData, ...props }) => {
    const { t } = useTranslation();
    const { updateOrderConfirmation, orderConfirmation } = useAuthenticate();
    const { token } = useTokenAndUser();

    const routeProps = f7router?.route?.props || {};
    const routeQuery = f7router?.route?.query || {};
    const orderDataFromProps = props?.orderData || initialOrderData;
    const orderDataFromRoute = routeProps?.orderData || routeQuery?.orderData;
    const orderDataFromRouteParsed = orderDataFromRoute ? (typeof orderDataFromRoute === 'string' ? JSON.parse(orderDataFromRoute) : orderDataFromRoute) : null;
    const finalOrderData = orderDataFromProps || orderDataFromRouteParsed;

    const [orders, setOrders] = useState(finalOrderData || []);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [totalOrders, setTotalOrders] = useState(finalOrderData?.length || 0);
    const [isLoading, setIsLoading] = useState(!finalOrderData || finalOrderData.length === 0);

    // Loading effect
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

    // Fetch orders if not provided via props
    useEffect(() => {
        const fetchOrders = async () => {
            if (finalOrderData && finalOrderData.length > 0) {
                // Update orders when new data comes in via props
                setOrders(finalOrderData);
                setTotalOrders(finalOrderData.length);
                setIsLoading(false);

                // Reset current index if it's out of bounds
                if (currentIndex >= finalOrderData.length) {
                    setCurrentIndex(Math.max(0, finalOrderData.length - 1));
                }
            } else if (isLoading) {
                // Try to fetch orders from API if not provided
                f7.preloader.show();
                try {
                    const confirmationForm = {
                        private_key: env.private_key,
                        status: 1
                    };
                    const response = await orderConfirmation(confirmationForm);
                    if (response.status && response.data && response.data.length > 0) {
                        setOrders(response.data);
                        setTotalOrders(response.data.length);
                        setIsLoading(false);
                    } else {
                        f7.views?.main?.router?.back?.();
                    }
                } catch (error) {
                    console.error('Error fetching orders:', error);
                    f7.views?.main?.router?.back?.();
                } finally {
                    f7.preloader.hide();
                }
            } else {
                // No orders to confirm, navigate back to home
                // f7.views.main.router.navigate('/');
            }
        };

        fetchOrders();
    }, [finalOrderData, isLoading]);

    // Listen for order updates from app.jsx when already on this page
    useEffect(() => {
        const handleOrderUpdate = (event) => {
            const { orderData } = event.detail;
            if (orderData && Array.isArray(orderData) && orderData.length > 0) {
                setOrders(orderData);
                setTotalOrders(orderData.length);
                setIsLoading(false);

                // Reset current index if it's out of bounds
                setCurrentIndex(prevIndex => {
                    if (prevIndex >= orderData.length) {
                        return Math.max(0, orderData.length - 1);
                    }
                    return prevIndex;
                });
            }
        };

        window.addEventListener('orderConfirmationUpdate', handleOrderUpdate);

        return () => {
            window.removeEventListener('orderConfirmationUpdate', handleOrderUpdate);
        };
    }, []);

    useEffect(() => {
        let swiperInstance = null;

        const initSwiper = () => {
            if (orders.length === 0) return;

            try {
                swiperInstance = f7.swiper.create('.order-confirmation-swiper', {
                    speed: 300,
                    spaceBetween: 0,
                    allowTouchMove: false,
                    autoHeight: true,
                    effect: 'slide',
                    on: {
                        slideChange: function () {
                            setCurrentIndex(this.activeIndex);
                        }
                    }
                });
            } catch (error) {
                console.warn('Error creating swiper:', error);
            }
        };

        const timer = setTimeout(initSwiper, 100);

        return () => {
            clearTimeout(timer);
            if (swiperInstance && typeof swiperInstance.destroy === 'function') {
                try {
                    swiperInstance.destroy();
                } catch (error) {
                    console.warn('Error destroying swiper:', error);
                }
            }
        };
    }, [orders.length]);

    useEffect(() => {
        try {
            const swiper = f7.swiper.get('.order-confirmation-swiper');
            if (swiper && typeof swiper.update === 'function' && typeof swiper.slideTo === 'function') {
                swiper.update();
                swiper.slideTo(currentIndex, 300);
            }
        } catch (error) {
            console.warn('Error updating swiper:', error);
        }
    }, [orders, currentIndex]);

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < orders.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handleConfirm = async () => {
        if (!orders[currentIndex]) return;

        setIsProcessing(true);
        try {
            const order = orders[currentIndex];
            const updateForm = {
                private_key: env.private_key,
                id: order.id
            };

            const response = await updateOrderConfirmation(updateForm);
            if (response.status) {
                // Check if this is the last order before showing toast
                const isLastOrder = orders.length === 1;

                if (isLastOrder) {
                    // If it's the last order, show success message and navigate immediately
                    f7.toast.show({
                        text: response.message || t('Order confirmed'),
                        position: 'center',
                        closeTimeout: 1500,
                    });

                    setTimeout(() => {
                        f7.views?.main?.router?.back?.();
                    }, 500);
                } else {
                    // Show success message for non-last orders
                    f7.toast.show({
                        text: response.message || t('Order confirmed'),
                        position: 'center',
                        closeTimeout: 2000,
                    });

                    // Remove the confirmed order from the list
                    const updatedOrders = orders.filter((_, index) => index !== currentIndex);
                    setOrders(updatedOrders);
                    setTotalOrders(updatedOrders.length);

                    // Move to next order or previous if at the end
                    const nextIndex = currentIndex >= updatedOrders.length ?
                        Math.max(0, updatedOrders.length - 1) :
                        currentIndex;
                    setCurrentIndex(nextIndex);
                }
            } else {
                f7.toast.show({
                    text: response.message || t('Confirmation failed'),
                    position: 'center',
                    closeTimeout: 2000,
                });
            }
        } catch (error) {
            console.error('Error confirming order:', error);
            f7.toast.show({
                text: t('Confirmation failed'),
                position: 'center',
                closeTimeout: 2000,
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Calculate arrow states
    const isPreviousDisabled = currentIndex === 0;
    const isNextDisabled = currentIndex === orders.length - 1;

    const currentOrder = orders[currentIndex];

    return (
        <Page className="order-confirmation-page">
            <div className="content-panel">
                <div className="content">
                    <div className="order-header-section">
                        <div className="order-header-badge">
                            <span className="badge-number">{totalOrders}</span>
                        </div>
                        <div className="order-header-text">
                            <h2 className="order-header-title">
                                {t('You still have')} <span className="highlight-text">{totalOrders}</span> {t('orders to confirm')}
                            </h2>
                            <p className="order-header-subtitle">{t('Please confirm the following order details')}</p>
                        </div>
                    </div>

                    <div className="order-confirmation-swiper swiper">
                        <div className="swiper-wrapper">
                            {orders.length > 0 ? (
                                orders.map((order) => (
                                    <div className="swiper-slide" key={order.id}>
                                        <div className="order-card">
                                            <div className="order-card-header">
                                                <div className="order-id-badge">
                                                    <i className="f7-icons">tag</i>
                                                    <span>#{order?.id}</span>
                                                </div>
                                                <div className="order-navigation">
                                                    <button
                                                        className={`nav-button prev ${isPreviousDisabled ? 'disabled' : ''}`}
                                                        onClick={() => handlePrevious()}
                                                        disabled={isPreviousDisabled}
                                                    >
                                                        <i className="f7-icons">chevron_left</i>
                                                    </button>
                                                    <span className="order-counter">
                                                        {currentIndex + 1} / {totalOrders}
                                                    </span>
                                                    <button
                                                        className={`nav-button next ${isNextDisabled ? 'disabled' : ''}`}
                                                        onClick={() => handleNext()}
                                                        disabled={isNextDisabled}
                                                    >
                                                        <i className="f7-icons">chevron_right</i>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="order-details-grid">
                                                <div className="detail-card">
                                                    <div className="detail-icon">
                                                        <i className="f7-icons">calendar</i>
                                                    </div>
                                                    <div className="detail-content">
                                                        <div className="detail-label">{t('date')}</div>
                                                        <div className="detail-value">{order?.date || 'N/A'}</div>
                                                    </div>
                                                </div>

                                                <div className="detail-card">
                                                    <div className="detail-icon">
                                                        <i className="f7-icons">cube</i>
                                                    </div>
                                                    <div className="detail-content">
                                                        <div className="detail-label">{t('type')}</div>
                                                        <div className="detail-value">{order?.type || order?.item_details?.name || 'N/A'}</div>
                                                    </div>
                                                </div>

                                                <div className="detail-card highlight">
                                                    <div className="detail-icon">
                                                        <i className="f7-icons">money_dollar_circle</i>
                                                    </div>
                                                    <div className="detail-content">
                                                        <div className="detail-label">{t('amount')}</div>
                                                        <div className="detail-value amount">${order?.amount || '0.00'}</div>
                                                    </div>
                                                </div>

                                                <div className="detail-card">
                                                    <div className="detail-icon">
                                                        <i className="f7-icons">person</i>
                                                    </div>
                                                    <div className="detail-content">
                                                        <div className="detail-label">{t('Action by')}</div>
                                                        <div className="detail-value">{order?.action_by || 'N/A'}</div>
                                                    </div>
                                                </div>

                                                <div className="detail-card">
                                                    <div className="detail-icon">
                                                        <i className="f7-icons">clock</i>
                                                    </div>
                                                    <div className="detail-content">
                                                        <div className="detail-label">{t('Action at')}</div>
                                                        <div className="detail-value">{order?.action_at || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="order-actions">
                                                <Button className="confirm-button" fill onClick={handleConfirm} disabled={isProcessing}>
                                                    <i className="f7-icons">checkmark_circle</i>
                                                    <span>{t('Confirm order')}</span>
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
                                                    <h3>{t('loading')}</h3>
                                                    <p>{t('Fetching order data')}</p>
                                                </>
                                            ) : (
                                                <>
                                                    <i className="f7-icons empty-icon">checkmark_circle</i>
                                                    <h3>{t('No orders to confirm')}</h3>
                                                    <p>{t('All orders confirmed')}</p>
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

export default OrderConfirmationPage;
