import { useEffect, useState } from "react";
import { Preferences } from "@capacitor/preferences";
import { preferencesEmitter } from "../components/action/preferences.jsx";
import { useTokenAndUser } from "../components/action/user-data.jsx";
import { normalizeAppPermissions } from "../utils/appPermissions";

const initialPendingCounts = {
  medical_certificate_pending_count: 0,
  penalty_pending_count: 0,
  order_payment_method_pending_count: 0,
  hand_over_account_pending_count: 0,
};

/**
 * Loads pending badge counts from Preferences / user snapshot and keeps them in sync via preferencesEmitter.
 */
export function usePendingCountsFromPreferences(setAppPermissions, setUserRole) {
  const { user } = useTokenAndUser();
  const [pendingCounts, setPendingCounts] = useState(initialPendingCounts);

  useEffect(() => {
    const loadPendingCounts = async () => {
      const { value } = await Preferences.get({ key: "user" });
      if (value) {
        try {
          const parsed = JSON.parse(value);
          const userData = parsed.user || parsed;
          setPendingCounts((prev) => ({
            ...prev,
            medical_certificate_pending_count: userData.medical_certificate_pending_count || 0,
            penalty_pending_count: userData.penalty_pending_count || 0,
            order_payment_method_pending_count: userData.order_payment_method_pending_count || 0,
            hand_over_account_pending_count: userData.hand_over_account_pending_count || 0,
          }));
          setAppPermissions(normalizeAppPermissions(userData?.app_permissions));
          const role = userData?.role;
          if (role) {
            setUserRole((currentRole) => (currentRole !== role ? role : currentRole));
          }
        } catch (e) {
          // Ignore parse errors
        }
      } else if (user) {
        const userData = user.user || user;
        setPendingCounts({
          medical_certificate_pending_count: userData.medical_certificate_pending_count || 0,
          penalty_pending_count: userData.penalty_pending_count || 0,
          order_payment_method_pending_count: userData.order_payment_method_pending_count || 0,
          hand_over_account_pending_count: userData.hand_over_account_pending_count || 0,
        });
      }
    };
    loadPendingCounts();

    const unsubscribe = preferencesEmitter.on("userUpdated", (updatedUserData) => {
      const userData = updatedUserData?.user || updatedUserData;
      if (userData) {
        setPendingCounts({
          medical_certificate_pending_count: userData.medical_certificate_pending_count || 0,
          penalty_pending_count: userData.penalty_pending_count || 0,
          order_payment_method_pending_count: userData.order_payment_method_pending_count || 0,
          hand_over_account_pending_count: userData.hand_over_account_pending_count || 0,
        });
        setAppPermissions(normalizeAppPermissions(userData?.app_permissions));
        const role = userData?.role;
        if (role) {
          setUserRole((currentRole) => (currentRole !== role ? role : currentRole));
        }
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, setAppPermissions, setUserRole]);

  return pendingCounts;
}
