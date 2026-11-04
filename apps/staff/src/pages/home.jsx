import React, { useState, useEffect, useRef, useCallback } from "react";
import { Page, f7, f7ready } from "framework7-react";
import { useTranslation } from "../services/useTranslation";
import { useTokenAndUser } from "../components/action/user-data";
import { deleteToken, deleteFcmToken, loadToken, loadUser, saveUser } from "../components/action/preferences.jsx";
import Tools from "../components/tools";
import useAuthenticate, { VERIFY_QR_TYPE } from "../actions/Authenticate";
import { Preferences } from "@capacitor/preferences";
import env from "../../environment.json";
import { getHomeRoleMenuConfig } from "../config/homeRoleMenuConfig";
import { usePendingCountsFromPreferences } from "../hooks/usePendingCountsFromPreferences";
import { useHomePushNotifications } from "../hooks/useHomePushNotifications";
import { useStaffHomeEffects } from "../hooks/useStaffHomeEffects";
import QrScanner from "../components/QrScanner";
import HomeTopBar from "../components/home/HomeTopBar";
import StaffLeaderboardSection from "../components/home/StaffLeaderboardSection";
import StaffAttendanceSection from "../components/home/StaffAttendanceSection";
import TermsAndConditionsOverlay from "../components/home/TermsAndConditionsOverlay";
import HomeRoomNumberDialog from "../components/home/HomeRoomNumberDialog";
import FloatingCallCounterButton from "../components/home/FloatingCallCounterButton";
import HomeMenuSections from "../components/home/HomeMenuSections";
import HomePrinterBanner from "../components/home/HomePrinterBanner";
import { usePrinterConnectionStatus } from "../hooks/usePrinterConnectionStatus";
import { normalizeAppPermissions } from "../utils/appPermissions";

const HomePage = () => {
  const { t, i18n } = useTranslation();
  const { user, checkTokenChange, setUser } = useTokenAndUser();
  const {
    checkIn,
    verify_qr,
    getProfile,
    companyRules,
    changeLanguage,
    getLeaderboard,
    progress_checkin_settlement,
    create_checkin_settlement,
    call_table_service,
  } = useAuthenticate();

  const [showToast, setShowToast] = useState(false);
  const [toastData, setToastData] = useState({});
  const isProcessingScanRef = useRef(false);

  const [userRole, setUserRole] = useState(null);
  const [appPermissions, setAppPermissions] = useState([]);

  const [salesLeaderboard, setSalesLeaderboard] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [showDaysSelection, setShowDaysSelection] = useState(true);
  const [daysSelected, setDaysSelected] = useState(null);
  const [attendance, setAttendance] = useState(3);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [showProductAction, setShowProductAction] = useState(false);
  const [isRefreshingProgress, setIsRefreshingProgress] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [showTnc, setShowTnc] = useState(false);
  const [canAccept, setCanAccept] = useState(false);
  const [tncError, setTncError] = useState("");
  const [tncContent, setTncContent] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showRoomNumberDialog, setShowRoomNumberDialog] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [showQrScanner, setShowQrScanner] = useState(false);

  useEffect(() => {
    if (user) {
      const role = user?.role || user?.user?.role;
      if (role) {
        setUserRole((currentRole) => (currentRole !== role ? role : currentRole));
      }

      const userData = user?.user || user;
      setAppPermissions(normalizeAppPermissions(userData?.app_permissions));
    }
  }, [user]);

  const safeAppPermissions = normalizeAppPermissions(appPermissions);
  const hasPermission = (permission) => safeAppPermissions.includes(permission);

  const pendingCounts = usePendingCountsFromPreferences(setAppPermissions, setUserRole);
  const { showBanner: showPrinterBanner, status: printerStatus, refresh: refreshPrinterStatus } =
    usePrinterConnectionStatus(userRole);

  const { unregisterPushNotifications } = useHomePushNotifications(userRole);

  useStaffHomeEffects({
    userRole,
    setSalesLeaderboard,
    setIsLoadingProfile,
    setProfileData,
    setShowDaysSelection,
    setIsLoadingProgress,
    setDaysSelected,
    setAttendance,
    setAttendanceCount,
    setShowProductAction,
  });

  const normalizeScannedQrString = (raw) => {
    if (raw == null) return "";
    return String(raw).replace(/\s+/g, "");
  };

  const tryParseActionPayload = (raw) => {
    const str = normalizeScannedQrString(raw);
    if (!str) return null;
    try {
      const parsed = JSON.parse(str);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (e) { }
    return null;
  };

  const handleQrCodeScanned = useCallback(
    async (qrCode) => {
      try {
        const qrValue = normalizeScannedQrString(typeof qrCode === "string" ? qrCode : String(qrCode));
        const payload = tryParseActionPayload(qrValue);
        const qrType = payload?.type;
        const embeddedQr = payload?.qr;
        const scannedQr = embeddedQr || qrValue;

        const verifyQrType = qrType === "checkout" ? VERIFY_QR_TYPE.CHECKOUT : VERIFY_QR_TYPE.CHECKIN;
        const verifyResponse = await verify_qr({
          qr: scannedQr,
          type: verifyQrType,
        });

        const verifyData = verifyResponse?.data || verifyResponse;
        const verifiedType = typeof verifyData?.type === "string" ? verifyData.type.toLowerCase() : "";
        const isCheckoutVerification = qrType === "checkout" || verifiedType === "checkout";

        const performedCheckoutVerification = verifyResponse.status && isCheckoutVerification;
        const performedCheckIn = verifyResponse.status && !isCheckoutVerification;

        const res = !verifyResponse.status
          ? verifyResponse
          : performedCheckoutVerification
            ? verifyResponse
            : await checkIn({
              qr: scannedQr,
            });

        if (res.status) {
          f7.toast.show({
            text:
              res.message ||
              (performedCheckoutVerification ? t("QR code verified") : t("Check-in successful")),
            position: "center",
            closeTimeout: 2000,
          });
        } else {
          f7.toast.show({
            text:
              res.message ||
              (performedCheckIn ? t("Check-in failed") : t("QR code verification failed")),
            position: "center",
            closeTimeout: 2000,
            cssClass: "error-toast",
          });
        }
      } catch (error) {
        console.error("Error processing QR code:", error);
        f7.toast.show({
          text: t("Error processing QR code"),
          position: "center",
          closeTimeout: 2000,
          cssClass: "error-toast",
        });
      } finally {
        isProcessingScanRef.current = false;
        f7.preloader.hide();
      }
    },
    [verify_qr, checkIn, t]
  );

  const handleLogoutClick = () => {
    setToastData({
      title: t("Logout"),
      message: t("Are you sure you want to logout?"),
      confirmText: t("Yes"),
      cancelText: t("No"),
      path: "",
      showCloseButton: false,
    });
    setShowToast(true);
  };

  const navigateToLoginAfterLogout = () => {
    const loginNavOptions = {
      reloadAll: true,
      clearPreviousHistory: true,
      animate: false,
    };
    const router = f7.views?.main?.router;
    if (router) {
      router.navigate("/login", loginNavOptions);
      return;
    }
    f7ready(() => {
      f7.views?.main?.router?.navigate("/login", loginNavOptions);
    });
  };

  const handleLogoutConfirm = async () => {
    setShowToast(false);
    try {
      await deleteToken();
      if (await loadToken()) {
        await deleteToken();
      }
      await deleteFcmToken();
      await Preferences.remove({ key: "tnc_seen" });
      setUser(null);
      if (checkTokenChange) {
        await checkTokenChange();
      }
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      void unregisterPushNotifications().catch((error) => {
        console.warn("Push unregister failed during logout:", error);
      });
      navigateToLoginAfterLogout();
    }
  };

  const handleLogoutCancel = () => {
    setShowToast(false);
  };

  const handleScroll = (e) => {
    const element = e.target;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) <= 1;
    setCanAccept(isAtBottom);
  };

  const handleAcceptTnc = async () => {
    if (canAccept) {
      try {
        const currentTime = new Date().getTime();
        await Preferences.set({
          key: "tnc_seen",
          value: JSON.stringify({
            seen: true,
            timestamp: currentTime,
          }),
        });
        setShowTnc(false);
        setTncError("");

        setTimeout(async () => {
          await Preferences.set({
            key: "tnc_seen",
            value: JSON.stringify({
              seen: false,
              timestamp: new Date().getTime(),
            }),
          });
          setShowTnc(true);
          setCanAccept(false);
        }, 3 * 60 * 60 * 1000);
      } catch (error) {
        console.error("Error saving TNC status:", error);
      }
    }
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleCallCounterClick = () => {
    setShowRoomNumberDialog(true);
    setRoomNumber("");
  };

  const handleRoomNumberConfirm = async () => {
    if (!roomNumber || roomNumber.trim() === "") {
      f7.toast.show({
        text: t("Please enter a room number"),
        position: "center",
        closeTimeout: 2000,
        cssClass: "error-toast",
      });
      return;
    }

    try {
      const result = await call_table_service({ table_code: parseInt(roomNumber.trim()) });
      if (result?.status) {
        f7.toast.show({
          text: result.message || t("Called Successfully"),
          position: "center",
          closeTimeout: 2000,
        });
        setShowRoomNumberDialog(false);
        setRoomNumber("");
      } else {
        f7.toast.show({
          text: result?.message || t("Failed to call table service"),
          position: "center",
          closeTimeout: 2000,
          cssClass: "error-toast",
        });
      }
    } catch (error) {
      f7.toast.show({
        text: t("Failed to call table service"),
        position: "center",
        closeTimeout: 2000,
        cssClass: "error-toast",
      });
    }
  };

  const handleRoomNumberCancel = () => {
    setShowRoomNumberDialog(false);
    setRoomNumber("");
  };

  const fetchCompanyRules = async (currentLanguage, role) => {
    try {
      const userRoleLower = role?.toLowerCase();
      if (userRoleLower !== "mummy" && userRoleLower !== "doctor" && userRoleLower !== "staff") {
        return;
      }

      f7.preloader.show();
      const response = await companyRules({
        private_key: env.private_key,
        type: userRoleLower,
      });

      if (response.data && response.data[currentLanguage]) {
        const rules = response.data[currentLanguage].description
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        setTncContent(rules);
        setCanAccept(false);
      } else {
        console.error("No rules found for selected language:", currentLanguage);
        setTncContent([]);
      }
    } catch (error) {
      console.error("Error fetching company rules:", error);
      setTncContent([]);
    } finally {
      f7.preloader.hide();
    }
  };

  const selectLanguage = async (value) => {
    try {
      const role = userRole?.toLowerCase();
      if (role !== "mummy" && role !== "doctor" && role !== "staff") return;

      const form = {
        private_key: env.private_key,
        type: role,
        locale: value,
      };

      changeLanguage(form);

      await Preferences.set({
        key: "selected_language",
        value,
      });
      await Preferences.set({
        key: "language",
        value,
      });

      await i18n.changeLanguage(value);
      setSelectedLanguage(value);
      setDropdownOpen(false);
      setCanAccept(false);

      await fetchCompanyRules(value, userRole);
    } catch (error) {
      console.error("Error changing language:", error);
    }
  };

  const fetchLeaderboard = async () => {
    const role = userRole?.toLowerCase();
    if (role !== "staff") return;

    try {
      const form = {
        private_key: env.private_key,
        type: "staff",
      };
      const response = await getLeaderboard(form);
      const data = response.data || [];
      setSalesLeaderboard(data.slice(0, 3));
    } catch (error) {
      console.error("Failed to fetch leaderboard data:", error);
      setSalesLeaderboard([]);
    }
  };

  const handlePullToRefresh = async (done) => {
    const role = userRole?.toLowerCase();
    if (role !== "staff") {
      done();
      return;
    }

    setIsRefreshing(true);
    try {
      await fetchLeaderboard();

      const profileResponse = await getProfile({
        private_key: env.private_key,
        type: "staff",
      });
      if (profileResponse && profileResponse.status && profileResponse.data) {
        setProfileData(profileResponse.data);
        if (profileResponse.data.checkin_settlement_status === 2) {
          setShowDaysSelection(true);
        } else if (profileResponse.data.checkin_settlement_status === 1) {
          setShowDaysSelection(false);
          setIsLoadingProgress(true);
          try {
            const progressForm = {
              private_key: env.private_key,
              type: "staff",
            };
            const progressResponse = await progress_checkin_settlement(progressForm);
            if (progressResponse.status) {
              setDaysSelected(progressResponse.data.total_days ?? null);
              setAttendance(progressResponse.data.achieve_days ?? 0);
              setAttendanceCount(progressResponse.data.achieve_days ?? 0);
            }
          } catch (error) {
            console.error("Error fetching progress data:", error);
          } finally {
            setIsLoadingProgress(false);
          }
        } else {
          setShowDaysSelection(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch data on refresh:", error);
      setSalesLeaderboard([]);
    } finally {
      setIsRefreshing(false);
      done();
    }
  };

  const handleDaysSelection = async (days) => {
    try {
      setDaysSelected(days);
    } catch (error) {
      console.error("Error saving days selection:", error);
    }
  };

  const handleUpdateDays = () => {
    setShowUpdateConfirm(true);
  };

  const handleUpdateConfirm = async () => {
    setShowUpdateConfirm(false);
    f7.preloader.show();
    try {
      const updateForm = {
        private_key: env.private_key,
        type: "staff",
        days: daysSelected,
      };

      const createResponse = await create_checkin_settlement(updateForm);

      if (createResponse.status) {
        if (profileData) {
          const updatedProfileData = {
            ...profileData,
            checkin_settlement_status: 1,
          };
          setProfileData(updatedProfileData);
          await saveUser(updatedProfileData);
        }
        setShowDaysSelection(false);

        try {
          setIsLoadingProgress(true);
          const progressForm = {
            private_key: env.private_key,
            type: "staff",
          };
          const progressResponse = await progress_checkin_settlement(progressForm);
          if (progressResponse.status) {
            setDaysSelected(progressResponse.data.total_days ?? null);
            setAttendance(progressResponse.data.achieve_days ?? 0);
            setAttendanceCount(progressResponse.data.achieve_days ?? 0);
          }
        } catch (error) {
          console.error("Error fetching progress data after settlement creation:", error);
        } finally {
          setIsLoadingProgress(false);
        }

        f7.toast
          .create({
            text: t("Update successful"),
            position: "center",
            closeTimeout: 2000,
          })
          .open();
      } else {
        f7.toast
          .create({
            text: t("Update failed"),
            position: "center",
            closeTimeout: 2000,
          })
          .open();
      }
    } catch (error) {
      console.error("Error updating days selection:", error);
      f7.toast
        .create({
          text: t("Update error"),
          position: "center",
          closeTimeout: 2000,
        })
        .open();
    } finally {
      f7.preloader.hide();
    }
  };

  const handleUpdateCancel = () => {
    setShowUpdateConfirm(false);
  };

  const refreshProgress = async () => {
    setIsRefreshingProgress(true);
    try {
      const profileResponse = await getProfile({
        private_key: env.private_key,
        type: "staff",
      });
      if (profileResponse && profileResponse.status && profileResponse.data) {
        setProfileData(profileResponse.data);
        if (profileResponse.data.checkin_settlement_status === 2) {
          setShowDaysSelection(true);
        } else if (profileResponse.data.checkin_settlement_status === 1) {
          setShowDaysSelection(false);
          setIsLoadingProgress(true);
          try {
            const progressForm = {
              private_key: env.private_key,
              type: "staff",
            };
            const progressResponse = await progress_checkin_settlement(progressForm);
            if (progressResponse.status) {
              setDaysSelected(progressResponse.data.total_days ?? null);
              setAttendance(progressResponse.data.achieve_days ?? 0);
              setAttendanceCount(progressResponse.data.achieve_days ?? 0);
              f7.toast
                .create({
                  text: t("Progress refreshed"),
                  position: "center",
                  closeTimeout: 2000,
                })
                .open();
            } else {
              f7.toast
                .create({
                  text: t("Failed to refresh progress"),
                  position: "center",
                  closeTimeout: 2000,
                })
                .open();
            }
          } catch (error) {
            console.error("Error refreshing progress:", error);
            f7.toast
              .create({
                text: t("Error refreshing progress"),
                position: "center",
                closeTimeout: 2000,
              })
              .open();
          } finally {
            setIsLoadingProgress(false);
          }
        } else {
          setShowDaysSelection(true);
        }
      } else {
        f7.toast
          .create({
            text: t("Failed to refresh progress"),
            position: "center",
            closeTimeout: 2000,
          })
          .open();
      }
    } catch (error) {
      console.error("Error refreshing progress:", error);
      f7.toast
        .create({
          text: t("Error refreshing progress"),
          position: "center",
          closeTimeout: 2000,
        })
        .open();
    } finally {
      setIsRefreshingProgress(false);
    }
  };

  const handleCameraClick = () => {
    setShowQrScanner(true);
  };

  useEffect(() => {
    const role = userRole?.toLowerCase();
    if (role !== "mummy" && role !== "doctor" && role !== "staff") return;

    const initializeLanguage = async () => {
      try {
        const { value: savedLanguage } = await Preferences.get({ key: "selected_language" });
        const userLocale = savedLanguage || "en";

        setSelectedLanguage(userLocale);
        await i18n.changeLanguage(userLocale);

        const { value: tncSeenValue } = await Preferences.get({ key: "tnc_seen" });

        if (tncSeenValue) {
          const tncData = JSON.parse(tncSeenValue);

          if (tncData.seen) {
            const currentTime = new Date().getTime();
            const elapsedTime = currentTime - tncData.timestamp;
            const remainingTime = Math.max(3 * 60 * 60 * 1000 - elapsedTime, 0);

            if (remainingTime > 0) {
              setShowTnc(false);

              setTimeout(async () => {
                await Preferences.set({
                  key: "tnc_seen",
                  value: JSON.stringify({
                    seen: false,
                    timestamp: new Date().getTime(),
                  }),
                });
                setShowTnc(true);
                setCanAccept(false);
                await fetchCompanyRules(userLocale, role);
              }, remainingTime);
            } else {
              setShowTnc(true);
              setCanAccept(false);
              await fetchCompanyRules(userLocale, role);
            }
          } else {
            setShowTnc(true);
            setCanAccept(false);
            await fetchCompanyRules(userLocale, role);
          }
        } else {
          setShowTnc(true);
          setCanAccept(false);
          await fetchCompanyRules(userLocale, role);
        }
      } catch (error) {
        console.error("Error initializing:", error);
        setSelectedLanguage("en");
        await i18n.changeLanguage("en");
        setShowTnc(true);
        setCanAccept(false);
        await fetchCompanyRules("en", role);
      }
    };

    initializeLanguage();
  }, [userRole, i18n]);

  const roleMenuConfig = getHomeRoleMenuConfig({
    handleCameraClick,
    showProductAction,
    showDaysSelection,
    isLoadingProfile,
    profileData,
  });

  const getMenuSections = () => {
    const role = userRole?.toLowerCase();
    const roleKey = role === "doctor" ? "mummy" : role;
    const sections = roleMenuConfig[roleKey] || roleMenuConfig.staff;
    return sections.filter(
      (section) => section && section.items && Array.isArray(section.items) && section.items.length > 0
    );
  };

  const menuSections = getMenuSections();
  const roleLower = userRole?.toLowerCase();
  const isStaff = roleLower === "staff";

  return (
    <Page
      name="home"
      className="home-page"
      ptr
      onPtrRefresh={handlePullToRefresh}
      onPageAfterIn={() => refreshPrinterStatus()}
    >
      <div className="ptr-preloader">
        <div className="preloader" />
        <div className="ptr-arrow" />
      </div>

      <HomeTopBar onLogout={handleLogoutClick} userRole={userRole} />

      <div className="content-panel">
        <div className="content">
          <HomePrinterBanner
            show={showPrinterBanner}
            status={printerStatus}
            onRefresh={refreshPrinterStatus}
          />
          {isStaff && (
            <>
              <StaffLeaderboardSection entries={salesLeaderboard} />
              <StaffAttendanceSection
                isLoadingProfile={isLoadingProfile}
                showDaysSelection={showDaysSelection}
                daysSelected={daysSelected}
                attendanceCount={attendanceCount}
                isLoadingProgress={isLoadingProgress}
                isRefreshingProgress={isRefreshingProgress}
                onSelectDays={handleDaysSelection}
                onUpdateDays={handleUpdateDays}
                onRefreshProgress={refreshProgress}
              />
            </>
          )}
          <div className="action-top-container">
            <HomeMenuSections
              menuSections={menuSections}
              userRole={userRole}
              pendingCounts={pendingCounts}
              hasPermission={hasPermission}
            />
          </div>
        </div>
      </div>

      <Tools
        type="toast"
        active={showToast}
        data={toastData}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />

      <Tools
        type="toast"
        active={showUpdateConfirm}
        data={{
          title: t("Confirm Update"),
          message: `${t("Are you sure you want to set")} ${daysSelected} ${t("working days")}?`,
          confirmText: t("Confirm"),
          cancelText: t("Cancel"),
          showCloseButton: false,
        }}
        onConfirm={handleUpdateConfirm}
        onCancel={handleUpdateCancel}
      />

      <QrScanner
        readerElementId="qr-reader"
        active={showQrScanner}
        onActiveChange={setShowQrScanner}
        onDecoded={handleQrCodeScanned}
        isProcessingScanRef={isProcessingScanRef}
      />

      {isStaff && <FloatingCallCounterButton onClick={handleCallCounterClick} />}

      <HomeRoomNumberDialog
        active={showRoomNumberDialog}
        roomNumber={roomNumber}
        onRoomNumberChange={setRoomNumber}
        onConfirm={handleRoomNumberConfirm}
        onCancel={handleRoomNumberCancel}
      />

      <TermsAndConditionsOverlay
        showTnc={showTnc}
        selectedLanguage={selectedLanguage}
        dropdownOpen={dropdownOpen}
        toggleDropdown={toggleDropdown}
        selectLanguage={selectLanguage}
        tncContent={tncContent}
        canAccept={canAccept}
        tncError={tncError}
        onScroll={handleScroll}
        onAccept={handleAcceptTnc}
      />
    </Page>
  );
};

export default HomePage;
