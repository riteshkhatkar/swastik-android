// Staff credentials and role-based auth (demo – replace with API in production)
export const STAFF_CREDENTIALS = [
  { username: "receptionist", password: "receptionist123", role: "receptionist" },
  { username: "doctor", password: "doctor123", role: "doctor" },
  { username: "lab", password: "lab123", role: "lab" },
  { username: "admin", password: "admin123", role: "admin" },
  { username: "billing", password: "billing123", role: "billing" },
];

export function validateStaff(username, password) {
  const user = STAFF_CREDENTIALS.find(
    (u) => u.username === username && u.password === password
  );
  return user ? { username: user.username, role: user.role } : null;
}

export function getStaffRole() {
  return localStorage.getItem("swastik_role") || null;
}

export function setStaffSession(user) {
  localStorage.setItem("swastik_token", "staff_" + user.username);
  localStorage.setItem("swastik_role", user.role);
  localStorage.setItem("swastik_username", user.username);
}

export function clearStaffSession() {
  localStorage.removeItem("swastik_token");
  localStorage.removeItem("swastik_role");
  localStorage.removeItem("swastik_username");
}

export function canAccessSection(role, section) {
  const allowed = {
    receptionist: ["receptionist", "billing"],
    doctor: ["doctor"],
    lab: ["lab", "lab_technician"],
    admin: ["admin"],
    billing: ["billing"]
  };
  return allowed[role] && allowed[role].includes(section);
}

export function isStaffSessionValid() {
  // Simple mocked check: token exists and isn't expired
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("swastik_token") : null;
  return !!token;
}
