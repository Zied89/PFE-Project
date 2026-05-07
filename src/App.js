import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ChooseServices from "./pages/ChooseServices";
import Formation from "./pages/Formation";
import FormationDetail from "./pages/FormationDetail";
import Coworking from "./pages/Coworking";
import Admin from "./pages/AdminDashboard";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("user");
    setUser(saved ? JSON.parse(saved) : null);
    setLoading(false);
  }, []);

  const handleSetUser = (u) => {
    if (u) {
      localStorage.setItem("user", JSON.stringify(u));
    } else {
      localStorage.removeItem("user");
    }
    setUser(u);
  };

  if (loading) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login setUser={handleSetUser} />} />
        <Route path="/register" element={<Register setUser={handleSetUser} />} />
        <Route
          path="/choose-services"
          element={
            user ? (
              <ChooseServices user={user} setUser={handleSetUser} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/formation"
          element={
            user ? <Formation user={user} /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/formation/:id"
          element={
            user ? (
              <FormationDetail user={user} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/coworking"
          element={
            user ? <Coworking user={user} /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/admin"
          element={
            user && (user.role === "admin" || user.role === "superadmin") ? (
              <Admin user={user} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;