import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ChooseServices from "./pages/ChooseServices";
import Formation from "./pages/Formation";
import FormationDetail from "./pages/FormationDetail";
import Coworking from "./pages/Coworking";

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleSetUser = (u) => {
    if (u) {
      localStorage.setItem("user", JSON.stringify(u));
    } else {
      localStorage.removeItem("user");
    }
    setUser(u);
  };

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
            user ? (
              <Formation user={user} />
            ) : (
              <Navigate to="/login" replace />
            )
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
            user ? (
              <Coworking user={user} />
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