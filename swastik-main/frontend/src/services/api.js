const API_BASE = import.meta.env.VITE_API_URL || "/api";

const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem("swastik_token");
  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };
  const res = await fetch(`${API_BASE}${endpoint}`, config);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export default {
  get: (url) => request(url, { method: "GET" }),
  post: (url, data) => request(url, { method: "POST", body: JSON.stringify(data) }),
  put: (url, data) => request(url, { method: "PUT", body: JSON.stringify(data) }),
  delete: (url) => request(url, { method: "DELETE" }),
  async getDashboardCounts() {
    return request("/api/patients/stats/counts");
  },

  async generateToken(data) {
    return request("/api/tokens/generate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getTokensByDoctor(doctorId) {
    return request(`/api/tokens/doctor/${doctorId}`);
  },

  async updateTokenStatus(tokenId, status) {
    return request(`/api/tokens/update/${tokenId}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  async getTokensToday() {
    return request("/api/tokens/today");
  }
};
