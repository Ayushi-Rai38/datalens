import { createContext, useEffect, useState } from "react";
import { authApi } from "../api/endpoints";
import { tokenStorage } from "../api/client";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      if (!tokenStorage.getAccessToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const resp = await authApi.me();
        setUser(resp.data);
      } catch {
        tokenStorage.clear();
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = async (email, password) => {
    const resp = await authApi.login(email, password);
    tokenStorage.setTokens(resp.data);
    const me = await authApi.me();
    setUser(me.data);
  };

  const register = async (email, password, fullName) => {
    await authApi.register(email, password, fullName);
    await login(email, password);
  };

  const logout = () => {
    tokenStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { useAuth } from "./useAuth";
