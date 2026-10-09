/**
 * Alternative entry (e.g. for Vite). Uses same tree as index.js but without
 * its own Router so it can be used when index.js already provides one, or
 * you must wrap this in a Router at the call site.
 * CRA uses src/index.js as entry; this file should not add a second Router.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
