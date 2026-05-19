import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ChooseServices from "./pages/ChooseServices";
import Formation from "./pages/Formation";
import FormationDetail from "./pages/FormationDetail";
import Coworking from "./pages/Coworking";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Charge l'utilisateur depuis localStorage au démarrage
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

  // Attendre la lecture du localStorage avant de rendre quoi que ce soit
  if (loading) return null;

  const isAuth = Boolean(user);
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  // Guard : utilisateur connecté requis
  const RequireAuth = ({ children }) =>
    isAuth ? children : <Navigate to="/login" replace />;

  // Guard : rôle admin ou superadmin requis
  const RequireAdmin = ({ children }) => {
    if (!isAuth) return <Navigate to="/login" replace />;
    if (!isAdmin) return <Navigate to="/choose-services" replace />;
    return children;
  };

  return (
    <BrowserRouter>
      <Routes>

        {/* Racine → redirige selon l'état de connexion */}
        <Route
          path="/"
          element={
            isAuth
              ? <Navigate to="/choose-services" replace />
              : <Navigate to="/login" replace />
          }
        />

        {/* Auth : si déjà connecté, on redirige directement */}
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

        {/* Dashboard admin — réservé admin/superadmin */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboard user={user} setUser={handleSetUser} />
            </RequireAdmin>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;