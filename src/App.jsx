import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ChooseServices from "./pages/ChooseServices";
import Formation from "./pages/Formation";
import Coworking from "./pages/Coworking";

function App() {
  const [user, setUser] = useState(null);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register setUser={setUser} />} />
        <Route
          path="/choose-services"
          element={
            user ? (
              <ChooseServices user={user} setUser={setUser} />
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