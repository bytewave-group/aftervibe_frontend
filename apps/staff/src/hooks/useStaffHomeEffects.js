import { useEffect, useRef } from "react";
import env from "../../environment.json";
import { loadUser, loadGlobalData } from "../components/action/preferences.jsx";
import useAuthenticate from "../actions/Authenticate";

export function useStaffHomeEffects({
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
}) {
  const { getLeaderboard, progress_checkin_settlement } = useAuthenticate();
  const hasFetchedLeaderboard = useRef(false);
  const hasFetchedProgress = useRef(false);
  const lastInitializedRole = useRef(null);
  const isInitializing = useRef(false);

  useEffect(() => {
    if (!userRole) return;
    const role = userRole?.toLowerCase();
    if (role !== "staff") {
      if (lastInitializedRole.current === "staff") {
        hasFetchedProgress.current = false;
        hasFetchedLeaderboard.current = false;
        isInitializing.current = false;
      }
      lastInitializedRole.current = role;
      return;
    }

    if (
      lastInitializedRole.current === "staff" &&
      hasFetchedProgress.current &&
      hasFetchedLeaderboard.current
    ) {
      return;
    }

    if (isInitializing.current) return;

    isInitializing.current = true;
    lastInitializedRole.current = "staff";
    hasFetchedProgress.current = true;
    hasFetchedLeaderboard.current = true;

    const fetchLeaderboardLocal = async () => {
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

    const loadProfileData = async () => {
      setIsLoadingProfile(true);
      try {
        await fetchLeaderboardLocal();

        const data = await loadUser();
        if (data) {
          const userData = data.user || data;
          setProfileData(userData);
          if (userData.checkin_settlement_status === 2) {
            setShowDaysSelection(true);
          } else if (userData.checkin_settlement_status === 1) {
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
          }
        }
      } catch (error) {
        console.error("Error loading profile_data from Preferences:", error);
      } finally {
        setIsLoadingProfile(false);
        isInitializing.current = false;
      }
    };

    loadProfileData();
  }, [userRole]); // eslint-disable-line react-hooks/exhaustive-deps -- omit unstable authenticate deps vs duplicate staff bootstrap

  useEffect(() => {
    const role = userRole?.toLowerCase();
    if (role !== "staff") return;

    const loadProductActionSetting = async () => {
      try {
        const value = await loadGlobalData();
        if (value) {
          const globalData = JSON.parse(value);
          if (globalData?.settings?.allow_staff_create_order_product === 1) {
            setShowProductAction(true);
          } else {
            setShowProductAction(false);
          }
        }
      } catch (error) {
        console.error("Error loading product action setting:", error);
        setShowProductAction(false);
      }
    };
    loadProductActionSetting();
  }, [userRole]);
}
