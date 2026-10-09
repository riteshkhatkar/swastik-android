import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./GoogleSignInModal.css";

const GoogleSignInModal = ({ roleName, roleValue, onClose, onFailure }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleCredentialResponse = useCallback(async (googleResponse) => {
    const idToken = googleResponse.credential;
    setIsLoading(true);
    try {
      const { api } = await import("../../api/service");
      const res = await api.loginWithGoogle(idToken, roleValue);

      // Store session info (same as standard username/password login)
      const role = res.user.role.toLowerCase();
      localStorage.setItem("swastik_token", res.access_token);
      localStorage.setItem("swastik_user", JSON.stringify(res.user));
      localStorage.setItem("swastik_role", role);

      // Redirect to admin directly, other roles to /dashboard
      onClose();
      if (role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      if (onFailure) {
        onFailure(err.message || "No account found for this email. Please contact the administrator.");
      }
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [navigate, onClose, onFailure, roleValue]);

  useEffect(() => {
    // Dynamic loading of Google Identity Services library
    let script = document.getElementById("google-gsi-script");
    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.id = "google-gsi-script";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const initGoogleSignIn = () => {
      if (window.google) {
        const client_id = process.env.REACT_APP_GOOGLE_CLIENT_ID || "1027164735664-tkhh39l9gdl13mfkkdd2uj5qdghvi6h1.apps.googleusercontent.com";
        window.google.accounts.id.initialize({
          client_id,
          callback: handleCredentialResponse,
        });

        const buttonParent = document.getElementById("google-signin-button");
        if (buttonParent) {
          window.google.accounts.id.renderButton(buttonParent, {
            theme: "outline",
            size: "large",
            width: 280,
            text: "signin_with",
            shape: "pill",
          });
        }
      }
    };

    if (window.google) {
      initGoogleSignIn();
    } else {
      script.onload = initGoogleSignIn;
    }
  }, [handleCredentialResponse]);

  return (
    <div className="google-signin-overlay">
      <div className="google-signin-card" style={{ maxWidth: "400px" }}>
        {/* Close Button */}
        <button className="google-signin-card__close" type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {/* Google Logo SVG */}
        <div className="google-signin-card__logo-container">
          <svg viewBox="0 0 24 24" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
          </svg>
        </div>

        {/* Heading */}
        <h2 className="google-signin-card__title">Sign in with Google</h2>
        <p className="google-signin-card__subtitle" style={{ marginBottom: "1.5rem" }}>
          to continue to Swastik Hospital – <span className="google-signin-card__role">{roleName}</span>
        </p>

        {/* Google OAuth Button Container */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", minHeight: "60px" }}>
          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <div className="google-signin-card__spinner" style={{ margin: "0 auto" }}></div>
              <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>Verifying with Swastik Server...</span>
            </div>
          ) : (
            <div id="google-signin-button" style={{ minHeight: "44px" }}></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleSignInModal;
