import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getDevice } from 'framework7/lite-bundle';
import { RecoilRoot } from "recoil";
import {
  f7,
  f7ready,
  App,
  View,
  Button,
  Icon,
} from 'framework7-react';
import '../services/i18n';
import capacitorApp from '../js/capacitor-app';
import routes from '../js/routes';
import store from '../js/store';
import useAuthenticate from "../actions/Authenticate";
import { useTokenAndUser } from "../components/action/user-data";
import env from "../../environment.json";
import { Preferences } from "@capacitor/preferences";
import {
  deleteToken,
  saveUser,
  loadToken
} from "../components/action/preferences.jsx";
import useCommon from '../components/action/Common';
import { useTranslation } from '../services/useTranslation';
import { initPrinterAutoReconnect, warmUpPrinterConnection } from '../utils/printerConnection';
import { usePrinterWarmUp } from '../hooks/usePrinterWarmUp';
import { useTenantName } from '../hooks/useTenantName';
import { persistGlobalData, setCachedTenantName } from '../utils/tenantName';
import {
  shouldFetchPendingFlowerMovement,
} from '../config/pendingFlowerMovementConfig';

const AppContent = () => {
  const device = getDevice();
  const { navigate } = useCommon();
  const { t } = useTranslation();
  const { global, getProfile, orderConfirmation, pending_flower_movement_lists, service_timeout_lists, update_service_timeout } = useAuthenticate();
  const { token, user, checkTokenChange } = useTokenAndUser();
  usePrinterWarmUp(token, user);
  const [globalData, setGlobalData] = useState({});
  const tenantName = useTenantName(globalData);
  const [dialogShown, setDialogShown] = useState(false);
  const [flowerMovementDialogShown, setFlowerMovementDialogShown] = useState(false);
  const [serviceTimeoutData, setServiceTimeoutData] = useState([]);
  const [showServiceTimeoutOverlay, setShowServiceTimeoutOverlay] = useState(true);
  const [currentServiceTimeoutIndex, setCurrentServiceTimeoutIndex] = useState(0);
  const [isProcessingServiceTimeout, setIsProcessingServiceTimeout] = useState(false);
  const dialogShownRef = useRef(false);
  const flowerMovementDialogShownRef = useRef(false);
  const globalFetchRef = useRef({ successToken: null, inFlight: false });
  const globalApiRef = useRef(global);
  globalApiRef.current = global;
  const tokenRef = useRef(token);
  const userRef = useRef(user);
  tokenRef.current = token;
  userRef.current = user;

  useEffect(() => {
    dialogShownRef.current = dialogShown;
  }, [dialogShown]);

  useEffect(() => {
    flowerMovementDialogShownRef.current = flowerMovementDialogShown;
  }, [flowerMovementDialogShown]);

  useEffect(() => {
    if (tenantName) {
      document.title = tenantName;
    }
  }, [tenantName]);

  // Framework7 Parameters
  const f7params = useMemo(() => ({
    name: tenantName,
    theme: 'auto',

    store: store,
    routes: routes,

    view: {
      browserHistory: true,
      browserHistorySeparator: '',
    },

    input: {
      scrollIntoViewOnFocus: device.capacitor,
      scrollIntoViewCentered: device.capacitor,
    },
    statusbar: {
      iosOverlaysWebView: true,
      androidOverlaysWebView: false,
    },
  }), [tenantName, device.capacitor]);

  useEffect(() => {
    let isCalling = false;
    let timeoutId = null;

    const cancelPendingGetProfile = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      isCalling = false;
    };

    const isAuthenticated = () => Boolean(tokenRef.current && userRef.current);

    let confirmationsLoadingCount = 0;

    const beginConfirmationsLoading = () => {
      if (confirmationsLoadingCount === 0) {
        f7.preloader.show();
      }
      confirmationsLoadingCount += 1;
    };

    const endConfirmationsLoading = () => {
      confirmationsLoadingCount = Math.max(0, confirmationsLoadingCount - 1);
      if (confirmationsLoadingCount === 0) {
        f7.preloader.hide();
      }
    };

    const fetchPendingFlowerMovementAfterProfile = async (showLoading = false) => {
      const currentUser = userRef.current;
      const currentUserRole = currentUser?.role || currentUser?.user?.role;
      if (
        !isAuthenticated()
        || !shouldFetchPendingFlowerMovement(currentUserRole)
        || flowerMovementDialogShownRef.current
      ) {
        return;
      }

      if (showLoading) {
        beginConfirmationsLoading();
      }

      try {
        const response = await pending_flower_movement_lists({
          private_key: env.private_key,
        });

        if (response.data && response.data.length > 0) {
          const mainRouter = f7.views?.main?.router;
          if (!mainRouter) {
            return;
          }
          const currentPath = mainRouter.currentRoute?.path || '';
          if (!currentPath.includes('/flower-movement-confirmation')) {
            flowerMovementDialogShownRef.current = true;
            setFlowerMovementDialogShown(true);
            mainRouter.navigate('/flower-movement-confirmation', {
              props: {
                claimData: response.data
              }
            });
          } else {
            window.dispatchEvent(new CustomEvent('flowerMovementConfirmationUpdate', {
              detail: { claimData: response.data }
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching pending flower movement lists:", error);
      } finally {
        if (showLoading) {
          endConfirmationsLoading();
        }
      }
    };

    const fetchOrderConfirmationAfterProfile = async (showLoading = false) => {
      const currentUser = userRef.current;
      const currentUserRole = currentUser?.role || currentUser?.user?.role;
      if (!isAuthenticated() || currentUserRole?.toLowerCase() !== "staff" || dialogShownRef.current) {
        return;
      }

      if (showLoading) {
        beginConfirmationsLoading();
      }

      try {
        const confirmationForm = {
          private_key: env.private_key,
          status: 1
        };

        const response = await orderConfirmation(confirmationForm);
        if (response.data && response.data.length > 0) {
          const mainRouter = f7.views?.main?.router;
          if (!mainRouter) {
            return;
          }
          const currentPath = mainRouter.currentRoute?.path || '';
          if (!currentPath.includes('/order-confirmation')) {
            dialogShownRef.current = true;
            setDialogShown(true);
            mainRouter.navigate('/order-confirmation', {
              props: {
                orderData: response.data
              }
            });
          } else {
            window.dispatchEvent(new CustomEvent('orderConfirmationUpdate', {
              detail: { orderData: response.data }
            }));
          }
        } else {
          await fetchPendingFlowerMovementAfterProfile(false);
        }
      } catch (error) {
        console.error("Error fetching order confirmation:", error);
      } finally {
        if (showLoading) {
          endConfirmationsLoading();
        }
      }
    };

    // Debounced function to prevent multiple simultaneous calls
    const debouncedGetProfile = async () => {
      if (!isAuthenticated()) {
        return;
      }

      const storedToken = await loadToken();
      if (!storedToken) {
        cancelPendingGetProfile();
        return;
      }

      if (isCalling) return;

      isCalling = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        if (!isAuthenticated()) {
          isCalling = false;
          return;
        }

        const tokenAfterDebounce = await loadToken();
        if (!tokenAfterDebounce) {
          isCalling = false;
          return;
        }

        try {
          const currentUser = userRef.current;
          const userRole = currentUser?.role || currentUser?.user?.role;

          if (userRole) {
            const response = await getProfile({
              private_key: env.private_key,
              // type: userRole,
              // fcm_token: null,
            });

            if (response.status) {
              // Save user data in Preferences
              await saveUser(response.data);

              if (userRole?.toLowerCase() === "staff") {
                await fetchOrderConfirmationAfterProfile();
              }

              if (shouldFetchPendingFlowerMovement(userRole) && userRole?.toLowerCase() === "mummy") {
                await fetchPendingFlowerMovementAfterProfile();
              }

              if (userRole?.toLowerCase() === "manager" && !showServiceTimeoutOverlay) {
                try {
                  const serviceTimeoutResponse = await service_timeout_lists({
                    private_key: env.private_key,
                  });

                  if (serviceTimeoutResponse.status && serviceTimeoutResponse.data && serviceTimeoutResponse.data.length > 0) {
                    setServiceTimeoutData(serviceTimeoutResponse.data);
                    setShowServiceTimeoutOverlay(true);
                  }
                } catch (error) {
                  console.error("Error fetching service timeout lists:", error);
                }
              }
            } else {
              // Login expired - delete token and navigate to login page
              // Clear any pending calls first
              isCalling = false;
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }

              await deleteToken();

              // Verify token is deleted
              const verifyToken = await loadToken();
              if (verifyToken) {
                // If token still exists, try deleting again
                await deleteToken();
              }

              if (checkTokenChange) {
                await checkTokenChange();
              }

              requestAnimationFrame(() => {
                setTimeout(() => {
                  window.location.href = "/";
                }, 100);
              });
            }
          }
        } catch (error) {
          console.error("Error refreshing user profile:", error);
        }
        isCalling = false;
      }, 100); // 100ms debounce
    };

    // Handle authentication/profile refresh when the page becomes visible
    const handleVisibilityChange = async () => {
      if (!document.hidden && isAuthenticated() && (await loadToken())) {
        debouncedGetProfile();
        void warmUpPrinterConnection();
      }
    };

    const handleHomeConfirmationsRefresh = async () => {
      try {
        if (!isAuthenticated()) {
          return;
        }

        const currentUser = userRef.current;
        const currentUserRole = currentUser?.role || currentUser?.user?.role;
        const role = currentUserRole?.toLowerCase();

        dialogShownRef.current = false;
        setDialogShown(false);
        flowerMovementDialogShownRef.current = false;
        setFlowerMovementDialogShown(false);

        if (role === "staff") {
          await fetchOrderConfirmationAfterProfile(true);
          return;
        }

        if (role === "mummy" && shouldFetchPendingFlowerMovement(currentUserRole)) {
          await fetchPendingFlowerMovementAfterProfile(true);
        }
      } finally {
        window.dispatchEvent(new CustomEvent("homeConfirmationsRefreshComplete"));
      }
    };

    // Handle authentication/profile refresh on route changes
    const handleRouteChange = async () => {
      if (!isAuthenticated() || !(await loadToken())) {
        return;
      }

      const currentUser = userRef.current;
      const currentUserRole = currentUser?.role || currentUser?.user?.role;
      const currentPath = f7.views?.main?.router?.currentRoute?.path;
      if (
        currentUserRole?.toLowerCase() === "staff" &&
        currentPath != null &&
        !currentPath.includes('/order-confirmation')
      ) {
        dialogShownRef.current = false;
        setDialogShown(false);
      }
      if (
        shouldFetchPendingFlowerMovement(currentUserRole) &&
        currentPath != null &&
        !currentPath.includes('/flower-movement-confirmation')
      ) {
        flowerMovementDialogShownRef.current = false;
        setFlowerMovementDialogShown(false);
      }
      debouncedGetProfile();
    };

    if (!token || !user) {
      cancelPendingGetProfile();
      return cancelPendingGetProfile;
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("homeConfirmationsRefresh", handleHomeConfirmationsRefresh);
    f7.on('routeChange', handleRouteChange);
    debouncedGetProfile();

    return () => {
      cancelPendingGetProfile();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("homeConfirmationsRefresh", handleHomeConfirmationsRefresh);
      f7.off('routeChange', handleRouteChange);
    };
  }, [token, user]);

  useEffect(() => {
    if (!token || !user) {
      setShowServiceTimeoutOverlay(false);
      setServiceTimeoutData([]);
      setCurrentServiceTimeoutIndex(0);
    }
  }, [token, user]);

  useEffect(() => {
    // Reset index when service timeout data changes
    if (serviceTimeoutData.length > 0) {
      if (currentServiceTimeoutIndex >= serviceTimeoutData.length) {
        setCurrentServiceTimeoutIndex(Math.max(0, serviceTimeoutData.length - 1));
      }
    } else {
      setCurrentServiceTimeoutIndex(0);
    }
  }, [serviceTimeoutData.length]);

  useEffect(() => {
    if (!token) {
      globalFetchRef.current.successToken = null;
      return;
    }

    if (globalFetchRef.current.successToken === token || globalFetchRef.current.inFlight) {
      return;
    }

    let cancelled = false;

    const fetchGlobalData = async () => {
      globalFetchRef.current.inFlight = true;
      try {
        const storedToken = await loadToken();
        if (!storedToken || cancelled) return;

        const response = await globalApiRef.current({ private_key: env.private_key });
        if (cancelled) return;

        if (!response?.status || !response?.data) {
          return;
        }

        setGlobalData(response.data);
        setCachedTenantName(response.data?.tenant_name);
        await persistGlobalData(response.data);
        globalFetchRef.current.successToken = token;
      } catch (error) {
        console.error('Error fetching global data:', error);
      } finally {
        if (!cancelled) {
          globalFetchRef.current.inFlight = false;
        }
      }
    };

    void fetchGlobalData();

    return () => {
      cancelled = true;
      globalFetchRef.current.inFlight = false;
    };
  }, [token]);

  f7ready(() => {
    initPrinterAutoReconnect();
    // Init capacitor APIs (see capacitor-app.js)
    if (f7.device.capacitor) {
      capacitorApp.init(f7);
    }
    // Call F7 APIs here
  });

  useEffect(() => {
    const PUBLIC_ROUTE_PATHS = ['/', '/login'];

    const redirectIfUnauthenticated = async () => {
      const storedToken = await loadToken();
      if (storedToken) return;

      const currentPath =
        f7.views?.main?.router?.currentRoute?.path ||
        window.location.pathname ||
        '/';

      if (!PUBLIC_ROUTE_PATHS.includes(currentPath)) {
        window.location.replace('/');
      }
    };

    const onAuthCheck = () => {
      void redirectIfUnauthenticated();
    };

    const setupAuthGuard = () => {
      void redirectIfUnauthenticated();
      f7.on('routeChange', onAuthCheck);
      window.addEventListener('pageshow', onAuthCheck);
      window.addEventListener('popstate', onAuthCheck);
    };

    let cleanedUp = false;
    const teardownAuthGuard = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      f7.off('routeChange', onAuthCheck);
      window.removeEventListener('pageshow', onAuthCheck);
      window.removeEventListener('popstate', onAuthCheck);
    };

    if (f7.views?.main) {
      setupAuthGuard();
    } else {
      f7ready(setupAuthGuard);
    }

    return teardownAuthGuard;
  }, []);

  useEffect(() => {
    let swiperInstance = null;

    const initSwiper = () => {
      if (!showServiceTimeoutOverlay || serviceTimeoutData.length === 0) return;

      try {
        swiperInstance = f7.swiper.create('.service-timeout-swiper', {
          speed: 300,
          spaceBetween: 0,
          allowTouchMove: false,
          effect: 'slide',
          on: {
            slideChange: function () {
              setCurrentServiceTimeoutIndex(this.activeIndex);
            }
          }
        });
      } catch (error) {
        console.warn('Error creating service timeout swiper:', error);
      }
    };

    const timer = setTimeout(initSwiper, 100);

    return () => {
      clearTimeout(timer);
      if (swiperInstance && typeof swiperInstance.destroy === 'function') {
        try {
          swiperInstance.destroy();
        } catch (error) {
          console.warn('Error destroying service timeout swiper:', error);
        }
      }
    };
  }, [showServiceTimeoutOverlay, serviceTimeoutData.length]);

  useEffect(() => {
    if (!showServiceTimeoutOverlay || serviceTimeoutData.length === 0) return;

    try {
      const swiper = f7.swiper.get('.service-timeout-swiper');
      if (swiper && typeof swiper.update === 'function' && typeof swiper.slideTo === 'function') {
        swiper.update();
        swiper.slideTo(currentServiceTimeoutIndex, 300);
      }
    } catch (error) {
      console.warn('Error updating service timeout swiper:', error);
    }
  }, [serviceTimeoutData, currentServiceTimeoutIndex, showServiceTimeoutOverlay]);

  const handleServiceTimeoutPrevious = () => {
    if (currentServiceTimeoutIndex > 0) {
      setCurrentServiceTimeoutIndex(prev => prev - 1);
    }
  };

  const handleServiceTimeoutNext = () => {
    if (currentServiceTimeoutIndex < serviceTimeoutData.length - 1) {
      setCurrentServiceTimeoutIndex(prev => prev + 1);
    }
  };

  const handleServiceTimeoutComplete = async () => {
    if (!serviceTimeoutData[currentServiceTimeoutIndex] || isProcessingServiceTimeout) return;

    setIsProcessingServiceTimeout(true);
    f7.preloader.show();

    try {
      const currentService = serviceTimeoutData[currentServiceTimeoutIndex];
      const serviceId = currentService.id;

      const response = await update_service_timeout({
        private_key: env.private_key,
        order_id: serviceId,
      });

      if (!response.status) {
        throw new Error(response.message || t('Failed to update service timeout'));
      }

      const isLastItem = serviceTimeoutData.length === 1;

      if (isLastItem) {
        f7.toast.show({
          text: response.message || t('Service timeout updated successfully'),
          position: 'center',
          closeTimeout: 1500,
        });

        setTimeout(() => {
          setShowServiceTimeoutOverlay(false);
          setServiceTimeoutData([]);
          setCurrentServiceTimeoutIndex(0);
        }, 500);
      } else {
        f7.toast.show({
          text: response.message || t('Service timeout updated successfully'),
          position: 'center',
          closeTimeout: 1500,
        });

        const updatedData = serviceTimeoutData.filter((_, index) => index !== currentServiceTimeoutIndex);
        setServiceTimeoutData(updatedData);

        const nextIndex = currentServiceTimeoutIndex >= updatedData.length ?
          Math.max(0, updatedData.length - 1) :
          currentServiceTimeoutIndex;
        setCurrentServiceTimeoutIndex(nextIndex);
      }
    } catch (error) {
      console.error('Error completing service timeout:', error);
      f7.toast.show({
        text: error?.message || t('Failed to update service timeout'),
        position: 'center',
        closeTimeout: 2000,
      });
    } finally {
      f7.preloader.hide();
      setIsProcessingServiceTimeout(false);
    }
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    // Handle format like "2026-01-20 13:21"
    if (dateTimeString.includes(' ')) {
      const [datePart, timePart] = dateTimeString.split(' ');
      const [year, month, day] = datePart.split('-');
      const [hour, minute] = timePart.split(':');
      const date = new Date(year, month - 1, day, hour, minute);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    return new Date(dateTimeString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getServiceTypeName = (type, targetType) => {
    if (type === 1 || targetType?.includes('KtvPackage')) {
      return t('KTV Package');
    } else if (type === 3 || targetType?.includes('BuyoutPackage')) {
      return t('Buyout Package');
    }
    return t('Service');
  };

  const currentService = serviceTimeoutData[currentServiceTimeoutIndex];
  const isPreviousDisabled = currentServiceTimeoutIndex === 0;
  const isNextDisabled = currentServiceTimeoutIndex === serviceTimeoutData.length - 1;

  return (
    <>
      {showServiceTimeoutOverlay && serviceTimeoutData.length > 0 && (
        <div className="service-timeout-overlay">
          <div className="service-timeout-content">
            <div className="service-timeout-header">
              <Icon f7="clock_fill" className="service-timeout-icon" />
              <div className="service-timeout-header-text">
                <h2 className="service-timeout-title">{t('Service Timeout')}</h2>
                <p className="service-timeout-subtitle">
                  {serviceTimeoutData.length === 1
                    ? t('{{count}} service has reached end time', { count: serviceTimeoutData.length })
                    : t('{{count}} services have reached end time', { count: serviceTimeoutData.length })
                  }
                </p>
              </div>
            </div>

            <div className="service-timeout-body">
              <div className="service-timeout-swiper swiper">
                <div className="swiper-wrapper">
                  {serviceTimeoutData.map((service) => (
                    <div className="swiper-slide" key={service.id}>
                      <div className="service-timeout-card">
                        <div className="service-timeout-card-header">
                          <div className="service-timeout-id-badge">
                            <Icon f7="tag" />
                            <span>#{service.id}</span>
                          </div>
                          <div className="service-timeout-navigation">
                            <button
                              className={`nav-button prev ${isPreviousDisabled ? 'disabled' : ''}`}
                              onClick={handleServiceTimeoutPrevious}
                              disabled={isPreviousDisabled}
                            >
                              <Icon f7="chevron_left" />
                            </button>
                            <span className="service-timeout-counter">
                              {currentServiceTimeoutIndex + 1} / {serviceTimeoutData.length}
                            </span>
                            <button
                              className={`nav-button next ${isNextDisabled ? 'disabled' : ''}`}
                              onClick={handleServiceTimeoutNext}
                              disabled={isNextDisabled}
                            >
                              <Icon f7="chevron_right" />
                            </button>
                          </div>
                        </div>

                        <div className="service-timeout-details-grid">
                          <div className="service-timeout-detail-card">
                            <div className="service-timeout-detail-icon">
                              <Icon f7="calendar" />
                            </div>
                            <div className="service-timeout-detail-content">
                              <div className="service-timeout-detail-label">{t('date')}</div>
                              <div className="service-timeout-detail-value">{service.date || 'N/A'}</div>
                            </div>
                          </div>

                          <div className="service-timeout-detail-card">
                            <div className="service-timeout-detail-icon">
                              <Icon f7="cube" />
                            </div>
                            <div className="service-timeout-detail-content">
                              <div className="service-timeout-detail-label">{t('type')}</div>
                              <div className="service-timeout-detail-value">
                                {getServiceTypeName(service.type, service.target_type)}
                              </div>
                            </div>
                          </div>

                          <div className="service-timeout-detail-card highlight">
                            <div className="service-timeout-detail-icon">
                              <Icon f7="money_dollar_circle" />
                            </div>
                            <div className="service-timeout-detail-content">
                              <div className="service-timeout-detail-label">{t('amount')}</div>
                              <div className="service-timeout-detail-value amount">
                                ${service.amount || '0.00'}
                              </div>
                            </div>
                          </div>

                          {service.table && (
                            <div className="service-timeout-detail-card">
                              <div className="service-timeout-detail-icon">
                                <Icon f7="square_grid_2x2" />
                              </div>
                              <div className="service-timeout-detail-content">
                                <div className="service-timeout-detail-label">{t('Table')}</div>
                                <div className="service-timeout-detail-value">{service.table}</div>
                              </div>
                            </div>
                          )}

                          <div className="service-timeout-detail-card">
                            <div className="service-timeout-detail-icon">
                              <Icon f7="clock" />
                            </div>
                            <div className="service-timeout-detail-content">
                              <div className="service-timeout-detail-label">{t('End Time')}</div>
                              <div className="service-timeout-detail-value">
                                {formatDateTime(service.end_time)}
                              </div>
                            </div>
                          </div>

                          <div className="service-timeout-detail-card">
                            <div className="service-timeout-detail-icon">
                              <Icon f7="person" />
                            </div>
                            <div className="service-timeout-detail-content">
                              <div className="service-timeout-detail-label">{t('Action by')}</div>
                              <div className="service-timeout-detail-value">{service.action_by || 'N/A'}</div>
                            </div>
                          </div>

                          <div className="service-timeout-detail-card">
                            <div className="service-timeout-detail-icon">
                              <Icon f7="clock_fill" />
                            </div>
                            <div className="service-timeout-detail-content">
                              <div className="service-timeout-detail-label">{t('Action at')}</div>
                              <div className="service-timeout-detail-value">
                                {formatDateTime(service.action_at)}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="service-timeout-actions">
                          <Button
                            fill
                            className="service-timeout-complete-button"
                            onClick={handleServiceTimeoutComplete}
                            disabled={isProcessingServiceTimeout}
                          >
                            <Icon f7="checkmark_circle" />
                            <span>{t('OK')}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*if the path not change, cant use <BrowserRouter>. react-router-dom all remove*/}
      <App {...f7params}>
        {/* Use the real browser path so deep links like /login don't stack a
            second (hidden) page under browserHistory — that shows as blank on phone. */}
        <View
          main
          className="safe-areas"
          url={typeof window !== 'undefined' ? (window.location.pathname || '/') : '/'}
        />
      </App>
    </>
  );
};

const MyApp = () => {
  return (
    <RecoilRoot>
      <AppContent />
    </RecoilRoot>
  );
}

export default MyApp;