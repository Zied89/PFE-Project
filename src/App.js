import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ChooseServices from "./pages/ChooseServices";
import Formation from "./pages/Formation";
import FormationDetail from "./pages/FormationDetail";
import Coworking from "./pages/Coworking";
import DashboardRouter from "./pages/DashboardRouter";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("user");
      setUser(saved ? JSON.parse(saved) : null);
    } catch {
      localStorage.removeItem("user");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSetUser = (u) => {
    if (u) {
      localStorage.setItem("user", JSON.stringify(u));
    } else {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
    setUser(u);
  };

  if (loading) return null;

  const isAuth = Boolean(user);
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isSuperAdmin = user?.role === "superadmin";

  const RequireAuth = ({ children }) =>
    isAuth ? children : <Navigate to="/login" replace />;

  const RequireAdmin = ({ children }) => {
    if (!isAuth) return <Navigate to="/login" replace />;
    if (!isAdmin) return <Navigate to="/choose-services" replace />;
    return children;
  };

  const RequireSuperAdmin = ({ children }) => {
    if (!isAuth) return <Navigate to="/login" replace />;
    if (!isSuperAdmin) return <Navigate to="/choose-services" replace />;
    return children;
  };

  return (
    <BrowserRouter>
      <Routes>

        {/* Racine → toujours la page login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth : si déjà connecté, redirige vers choose-services */}
        <Route
          path="/login"
          element={
            isAuth
              ? <Navigate to="/choose-services" replace />
              : <Login setUser={handleSetUser} />
          }
        />
        <Route
          path="/register"
          element={
            isAuth
              ? <Navigate to="/choose-services" replace />
              : <Register setUser={handleSetUser} />
          }
        />

        {/* Pages protégées */}
        <Route
          path="/choose-services"
          element={
            <RequireAuth>
              <ChooseServices user={user} setUser={handleSetUser} />
            </RequireAuth>
          }
        />
        <Route
          path="/formation"
          element={
            <RequireAuth>
              <Formation user={user} />
            </RequireAuth>
          }
        />
        <Route
          path="/formation/:id"
          element={
            <RequireAuth>
              <FormationDetail user={user} />
            </RequireAuth>
          }
        />
        <Route
          path="/coworking"
          element={
            <RequireAuth>
              <Coworking user={user} />
            </RequireAuth>
          }
        />

        {/* Admin : réservé aux rôles admin/superadmin (DashboardRouter choisit le bon composant) */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <DashboardRouter user={user} setUser={handleSetUser} />
            </RequireAdmin>
          }
        />

        {/* Super Admin : réservé strictement au rôle superadmin */}
        <Route
          path="/superadmin"
          element={
            <RequireSuperAdmin>
              <SuperAdminDashboard user={user} setUser={handleSetUser} />
            </RequireSuperAdmin>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;