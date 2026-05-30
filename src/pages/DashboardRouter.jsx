import React from "react";
import { Navigate } from "react-router-dom";
import AdminDashboard from "./AdminDashboard";
import SuperAdminDashboard from "./SuperAdminDashboard";

/**
 * DashboardRouter
 * Redirige automatiquement vers le bon dashboard selon le rôle de l'utilisateur.
 * Utilisation dans le router :
 *   <Route path="/admin" element={<DashboardRouter user={user} setUser={setUser} />} />
 */
function DashboardRouter({ user, setUser }) {
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "superadmin") {
    return <SuperAdminDashboard user={user} setUser={setUser} />;
  }

  if (user.role === "admin") {
    return <AdminDashboard user={user} setUser={setUser} />;
  }

  // Les utilisateurs normaux n'ont pas accès
  return <Navigate to="/choose-services" replace />;
}

export default DashboardRouter;