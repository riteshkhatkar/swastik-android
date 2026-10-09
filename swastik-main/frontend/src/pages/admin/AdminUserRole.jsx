import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api/service";
import "./AdminPages.css";

const STAFF_ROLES = ["admin", "doctor", "lab_technician", "receptionist", "billing"];
const ALL_ROLES = ["admin", "doctor", "lab_technician", "receptionist", "billing", "patient"];

const ROLE_BADGE = (role) => {
  if (role === "doctor") return "admin-badge admin-badge--success";
  if (role === "patient") return "admin-badge admin-badge--danger";
  return "admin-badge";
};

function Modal({ title, onClose, children }) {
  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="admin-modal__title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export default function AdminUserRole() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [resetModal, setResetModal] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [newUser, setNewUser] = useState({ username: "", full_name: "", email: "", role: "receptionist", password: "" });
  const adminUser = JSON.parse(localStorage.getItem("user") || "{}");

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast("Failed to load users: " + e.message, true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Split into staff and patients
  const staff = users.filter(u => STAFF_ROLES.includes(u.role));
  const patients = users.filter(u => u.role === "patient");

  async function handleStatusChange(user, status) {
    try {
      await api.setUserStatus(user._id, status);
      await api.createAdminLog({ user: adminUser.username || "admin", module: "Admin", action: `${status === "inactive" ? "Deactivated" : "Activated"} user: ${user.username}` });
      showToast(`User ${user.username} ${status === "inactive" ? "deactivated" : "activated"}.`);
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, status } : u));
    } catch (e) {
      showToast("Action failed: " + e.message, true);
    }
    setConfirmModal(null);
  }

  async function handleResetPassword() {
    if (!newPwd || newPwd.length < 6) { showToast("Password must be at least 6 characters.", true); return; }
    try {
      await api.resetUserPassword(resetModal.user._id, newPwd);
      showToast(`Password reset for ${resetModal.user.username}.`);
      setResetModal(null); setNewPwd("");
    } catch (e) {
      showToast("Reset failed: " + e.message, true);
    }
  }

  async function handleCreateUser() {
    const { username, full_name, role, password } = newUser;
    if (!username || !full_name || !role || !password) { showToast("All required fields missing.", true); return; }
    if (password.length < 6) { showToast("Password must be at least 6 characters.", true); return; }
    try {
      await api.createAdminUser(newUser);
      showToast(`User '${username}' created successfully.`);
      setCreateModal(false);
      setNewUser({ username: "", full_name: "", email: "", role: "receptionist", password: "" });
      load();
    } catch (e) {
      showToast("Create failed: " + e.message, true);
    }
  }

  function UserTable({ rows, emptyMsg }) {
    return (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username / UHID</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login / Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <tr><td colSpan={6} style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>{emptyMsg}</td></tr>
              : rows.map((u) => (
                <tr key={u._id}>
                  <td><strong>{u.full_name || "—"}</strong></td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{u.username}</td>
                  <td><span className={ROLE_BADGE(u.role)}>{u.role}</span></td>
                  <td>
                    <span className={u.status === "inactive" ? "admin-badge admin-badge--danger" : "admin-badge admin-badge--success"}>
                      {u.status === "inactive" ? "Inactive" : "Active"}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.82rem", color: "#64748b" }}>{u.last_login || u.created_at || "—"}</td>
                  <td>
                    <button type="button" className="admin-btn admin-btn--sm" style={{ marginRight: 6 }} onClick={() => setResetModal({ user: u })}>Reset Password</button>
                    {u.status !== "inactive"
                      ? <button type="button" className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => setConfirmModal({ user: u, action: "deactivate" })}>Deactivate</button>
                      : <button type="button" className="admin-btn admin-btn--sm admin-btn--primary" onClick={() => setConfirmModal({ user: u, action: "activate" })}>Activate</button>
                    }
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page__title">User &amp; Role Management</h1>
      <p className="admin-page__subtitle">Staff and patients are managed separately. Deactivated accounts cannot log in.</p>

      {/* ── Staff Section ──────────────────────────── */}
      <section className="admin-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 className="admin-section__title" style={{ margin: 0 }}>
            👨‍⚕️ Staff Accounts ({loading ? "…" : staff.length})
          </h2>
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => setCreateModal(true)}>+ Create New Staff</button>
        </div>
        {loading
          ? <p className="admin-loading">Loading staff…</p>
          : <UserTable rows={staff} emptyMsg="No staff accounts found" />
        }
      </section>

      {/* ── Patients Section ───────────────────────── */}
      <section className="admin-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 className="admin-section__title" style={{ margin: 0 }}>
            🧑‍🤝‍🧑 Patient Accounts ({loading ? "…" : patients.length})
          </h2>
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Patient accounts are created automatically on registration</span>
        </div>
        {loading
          ? <p className="admin-loading">Loading patients…</p>
          : <UserTable rows={patients} emptyMsg="No patient accounts found" />
        }
      </section>

      {/* ── Confirm Status Change ──────────────────── */}
      {confirmModal && (
        <Modal
          title={confirmModal.action === "deactivate" ? `Deactivate ${confirmModal.user.full_name || confirmModal.user.username}?` : `Reactivate ${confirmModal.user.full_name || confirmModal.user.username}?`}
          onClose={() => setConfirmModal(null)}
        >
          <p style={{ color: "#52687a", fontSize: "0.9rem", marginBottom: 8 }}>
            {confirmModal.action === "deactivate"
              ? "This user will be immediately blocked from logging in to any part of the system."
              : "This will restore full login access for this user."}
          </p>
          <div className="admin-modal__actions">
            <button type="button" className="admin-btn" onClick={() => setConfirmModal(null)}>Cancel</button>
            <button
              type="button"
              className={`admin-btn ${confirmModal.action === "deactivate" ? "admin-btn--danger" : "admin-btn--primary"}`}
              onClick={() => handleStatusChange(confirmModal.user, confirmModal.action === "deactivate" ? "inactive" : "active")}
            >
              Confirm
            </button>
          </div>
        </Modal>
      )}

      {/* ── Reset Password ─────────────────────────── */}
      {resetModal && (
        <Modal title={`Reset Password — ${resetModal.user.username}`} onClose={() => { setResetModal(null); setNewPwd(""); }}>
          <input className="admin-input" type="password" placeholder="New password (min 6 chars)" value={newPwd} onChange={e => setNewPwd(e.target.value)} style={{ marginBottom: 8 }} />
          <div className="admin-modal__actions">
            <button type="button" className="admin-btn" onClick={() => { setResetModal(null); setNewPwd(""); }}>Cancel</button>
            <button type="button" className="admin-btn admin-btn--primary" onClick={handleResetPassword}>Reset Password</button>
          </div>
        </Modal>
      )}

      {/* ── Create Staff User ──────────────────────── */}
      {createModal && (
        <Modal title="Create New Staff Account" onClose={() => setCreateModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input className="admin-input" placeholder="Username *" value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} />
            <input className="admin-input" placeholder="Full Name *" value={newUser.full_name} onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))} />
            <input className="admin-input" type="email" placeholder="Email (optional)" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
            <select className="admin-select" value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
              {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input className="admin-input" type="password" placeholder="Password * (min 6 chars)" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
          </div>
          <div className="admin-modal__actions">
            <button type="button" className="admin-btn" onClick={() => setCreateModal(false)}>Cancel</button>
            <button type="button" className="admin-btn admin-btn--primary" onClick={handleCreateUser}>Create User</button>
          </div>
        </Modal>
      )}

      {toast && <div className="admin-toast" style={{ background: toast.isError ? "#b91c1c" : "#1a2b3c" }}>{toast.msg}</div>}
    </div>
  );
}
