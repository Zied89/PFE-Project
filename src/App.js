import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ChooseServices from "./pages/ChooseServices";
import Formation from "./pages/Formation";
import FormationDetail from "./pages/FormationDetail";
import Coworking from "./pages/Coworking";
import DashboardRouter from "./pages/DashboardRouter";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import MesCommandes from "./pages/MesCommandes";
import AdminModules from "./pages/AdminModules";


function App() {
  // ✅ sessionStorage = isolé par onglet (pas partagé entre onglets, contrairement à localStorage).
  // Chaque onglet peut donc avoir sa propre session connectée (compte user différent d'un compte admin par ex).
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      sessionStorage.removeItem("user");
      return null;
    }
  });

  const handleSetUser = (u) => {
    if (u) {
      sessionStorage.setItem("user", JSON.stringify(u));
    } else {
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("token");
    }
    setUser(u);
  };

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

        {/* Racine → choose-services si connecté, sinon login */}
        <Route
          path="/"
          element={<Navigate to={isAuth ? "/choose-services" : "/login"} replace />}
        />

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

        {/* Mes commandes (utilisateur connecté) */}
        <Route
          path="/mes-commandes"
          element={
            <RequireAuth>
              <MesCommandes user={user} />
            </RequireAuth>
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <DashboardRouter user={user} setUser={handleSetUser} />
            </RequireAdmin>
          }
        />

        {/* Admin — gestion des modules */}
        <Route
          path="/admin/modules"
          element={
            <RequireAdmin>
              <AdminModules user={user} />
            </RequireAdmin>
          }
        />

        {/* Super Admin */}
        <Route
          path="/superadmin"
          element={
            <RequireSuperAdmin>
              <SuperAdminDashboard user={user} setUser={handleSetUser} />
            </RequireSuperAdmin>
          }
        />

        {/* Fallback */}
        <Route
          path="*"
          element={<Navigate to={isAuth ? "/choose-services" : "/login"} replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;