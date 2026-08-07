import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ChooseServices from "./pages/ChooseServices";
import Formation from "./pages/Formation";
import FormationDetail from "./pages/FormationDetail";
import Coworking from "./pages/CoWorking";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleSetUser = (u) => {
    if (u) {
      localStorage.setItem("user", JSON.stringify(u));
    } else {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
    setUser(u);
  };

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  // Guard components pour éviter la répétition
  const RequireAuth = ({ children }) =>
    user ? children : <Navigate to="/login" replace />;

  const RequireAdmin = ({ children }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (!isAdmin) return <Navigate to="/choose-services" replace />;
    return children;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Redirection racine */}
        <Route
          path="/"
          element={
            user
              ? <Navigate to="/choose-services" replace />
              : <Navigate to="/login" replace />
          }
        />

        {/* Auth — redirige vers choose-services si déjà connecté */}
        <Route
          path="/login"
          element={
            user
              ? <Navigate to="/choose-services" replace />
              : <Login setUser={handleSetUser} />
          }
        />
        <Route
          path="/register"
          element={
            user
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

        {/* Route admin — réservée aux rôles admin et superadmin */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboard user={user} setUser={handleSetUser} />
            </RequireAdmin>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
