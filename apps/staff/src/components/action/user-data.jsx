import { useState, useEffect, useCallback } from "react";
import { loadToken, loadUser, Preferences, preferencesEmitter } from "./preferences";
import { useRecoilState } from "recoil";
// import AuthState from "../../atoms/AuthState";

export function useTokenAndUser() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenRemoved, setTokenRemoved] = useState(false);
  // const [authState, setAuthState] = useRecoilState(AuthState);

  // useEffect(() => {
  //   if (authState.user) {
  //     setUser(authState.user);
  //   }
  // }, [authState.user]);

  const checkTokenChange = useCallback(async () => {
    const currentToken = await loadToken();
    if (token && !currentToken) {
      setTokenRemoved(true);
      setUser(null);
    } else {
      setTokenRemoved(false);
    }
    if (!currentToken) {
      setUser(null);
    }
    setToken(currentToken);
  }, [token]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await checkTokenChange();
      const fetchedUser = await loadUser();
      // setAuthState((prev) => ({ ...prev, user: fetchedUser }));

      setUser(fetchedUser);
      setIsLoading(false);
    };

    fetchData();
    const intervalId = setInterval(checkTokenChange, 1000);
    const unsubscribeToken = preferencesEmitter.on("tokenUpdated", () => {
      void checkTokenChange();
    });
    return () => {
      clearInterval(intervalId);
      unsubscribeToken();
    };
  }, [checkTokenChange]);

  return { token, user, isLoading, checkTokenChange, setUser };
}
