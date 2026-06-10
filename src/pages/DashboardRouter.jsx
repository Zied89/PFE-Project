import React from "react";
import { Navigate } from "react-router-dom";
import AdminDashboard from "./AdminDashboard";
import SuperAdminDashboard from "./SuperAdminDashboard";

const ROLE_COMPONENTS = {
  superadmin: SuperAdminDashboard,
  admin: AdminDashboard,
};

function DashboardRouter({ user, setUser }) {
  if (!user) return <Navigate to="/login" replace />;

  const Component = ROLE_COMPONENTS[user.role];

  if (!Component) return <Navigate to="/choose-services" replace />;

  return <Component user={user} setUser={setUser} />;
}

export default DashboardRouter;