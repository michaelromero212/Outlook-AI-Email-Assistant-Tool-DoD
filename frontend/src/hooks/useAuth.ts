import { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../lib/msalConfig";

export const useAuth = () => {
  const { instance, accounts } = useMsal();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const user = accounts[0] ?? null;

  const login = async () => {
    setLoading(true);
    try {
      const result = await instance.loginPopup(loginRequest);
      setAccessToken(result.accessToken);
    } catch (err) {
      console.error("Login failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    instance.logoutPopup({ postLogoutRedirectUri: "/" });
    setAccessToken(null);
  };

  useEffect(() => {
    if (accounts.length > 0) {
      instance
        .acquireTokenSilent({ ...loginRequest, account: accounts[0] })
        .then((res) => setAccessToken(res.accessToken))
        .catch(() => login());
    }
  }, [accounts]);

  return {
    user,
    accessToken,
    login,
    logout,
    loading,
    isAuthenticated: !!user && !!accessToken,
  };
};
