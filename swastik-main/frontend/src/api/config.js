export const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const getAuthHeader = () => {
  const token = localStorage.getItem("swastik_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
