// Placeholder for module routes until modules are added.
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function PlaceholderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const name = location.pathname.split('/').filter(Boolean).join(' / ') || 'Page';

  return (
    <div style={{ padding: 24 }}>
      <h2>{name}</h2>
      <p>Content coming soon.</p>
      <button type="button" onClick={() => navigate('/dashboard')}>
        Back to Dashboard
      </button>
    </div>
  );
}

export default PlaceholderPage;
