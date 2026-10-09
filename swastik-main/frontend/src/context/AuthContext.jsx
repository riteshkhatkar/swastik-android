import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check for stored token on mount
    const token = localStorage.getItem("swastik_token");
    if (token) {
      setUser({ token });
    }
  }, []);

  const value = {
    user,
    setUser,
    login: (token) => {
      localStorage.setItem("swastik_token", token);
      setUser({ token });
    },
    logout: () => {
      localStorage.removeItem("swastik_token");
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
