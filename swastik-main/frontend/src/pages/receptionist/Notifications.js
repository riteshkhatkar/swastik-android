import React, { useState, useEffect } from "react";
import { FiBell, FiCheckCircle, FiInfo, FiCalendar, FiClock } from 'react-icons/fi';
import "./ReceptionistDashboard.css";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const { api } = await import("../../api/service");
      const data = await api.getNotifications("receptionist");
      setNotifications(data || []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      const { api } = await import("../../api/service");
      await api.markNotificationRead(id);
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) return;
    
    try {
      const { api } = await import("../../api/service");
      await Promise.all(unread.map(n => api.markNotificationRead(n._id)));
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "appointment": return <FiCalendar style={{ color: '#0d9488' }} />;
      case "medical": return <FiClock style={{ color: '#0d9488' }} />;
      case "alert": return <FiInfo style={{ color: '#e11d48' }} />;
      default: return <FiBell style={{ color: '#0d9488' }} />;
    }
  };

  return (
    <div className="recep-dash">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 className="recep-dash-title">Notifications Center</h1>
          <p className="recep-dash-subtitle">Real-time updates on hospital activities and patient flow.</p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button 
            className="recep-btn recep-btn-primary" 
            onClick={markAllAsRead}
            style={{ background: '#1a5f5c' }}
          >
            Mark all as read
          </button>
        )}
      </header>

      <section className="recep-dash-section">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem' }}>
            <div className="spin" style={{ fontSize: '2rem', color: '#1a5f5c' }}>⌛</div>
            <p style={{ marginTop: '1rem', color: '#64748b' }}>Fetching alerts...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '8rem 2rem', background: '#fff', borderRadius: '32px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <FiBell style={{ fontSize: '5rem', color: '#1a5f5c', opacity: 0.1, marginBottom: '2rem' }} />
            <h2 style={{ color: '#1a5f5c', fontWeight: 800 }}>All Clear!</h2>
            <p style={{ color: '#64748b', maxWidth: '400px', margin: '1rem auto' }}>
              You've processed all recent alerts. New notifications for bookings and admissions will appear here in real-time.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {notifications.map((n) => (
              <div
                key={n._id}
                className="recep-table-wrap"
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  gap: '1.5rem',
                  alignItems: 'center',
                  borderLeft: `6px solid ${n.is_read ? '#f1f5f9' : '#1a5f5c'}`,
                  transition: 'all 0.2s ease',
                  background: '#fff',
                  boxShadow: n.is_read ? 'none' : '0 4px 12px rgba(26, 95, 92, 0.05)',
                  borderRadius: '16px'
                }}
              >
                <div style={{
                  background: n.is_read ? '#f8fafc' : '#f0fdfa',
                  padding: '1rem',
                  borderRadius: '12px',
                  fontSize: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '56px'
                }}>
                  {getIcon(n.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: n.is_read ? '#64748b' : '#1e293b' }}>{n.title}</h3>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: n.is_read ? '#94a3b8' : '#64748b', fontSize: '0.95rem', fontWeight: n.is_read ? 400 : 500 }}>{n.message}</p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => markAsRead(n._id)}
                    className="recep-btn recep-btn-small"
                    style={{ borderColor: '#1a5f5c', color: '#1a5f5c', background: 'transparent' }}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
