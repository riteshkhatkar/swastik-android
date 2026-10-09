// AuthLayout: wrapper for login/registration. Renders child route via Outlet.
// Can be extended later with shared auth UI (e.g. logo strip, footer).
import { Outlet } from "react-router-dom";

function AuthLayout() {
  return <Outlet />;
}

export default AuthLayout;
