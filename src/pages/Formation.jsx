
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Formation.css";
import { FaShoppingCart } from "react-icons/fa";

const API = "http://localhost:5000/api";

// 🔐 Headers sécurisés
const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const filters = ["Toutes", "Tech", "Créatif", "Business", "IA & Data", "Business & Entrepreneuriat"];

function Formation({ user }) {
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const [activeFilter, setActiveFilter] = useState("Toutes");
  const [formations, setFormations] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // 🔄 FETCH DATA
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const fRes = await fetch(`${API}/formations`, {
        headers: authHeaders(),
      });

      if (!fRes.ok) throw new Error("Erreur API formations");

      const fData = await fRes.json();

      let iData = { inscriptions: [] };

      try {
        const iRes = await fetch(`${API}/formations/inscriptions/me`, {
          headers: authHeaders(),
        });

        if (iRes.ok) {
          iData = await iRes.json();
        }
      } catch {
        console.log("Pas d'inscriptions (non connecté)");
      }

      setFormations(fData.formations || []);
      setInscriptions(
        (iData.inscriptions || []).map((i) => i.formation_id)
      );
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🎯 FILTRE
  const filtered =
    activeFilter === "Toutes"
      ? formations
      : formations.filter((f) => f.tag === activeFilter);

  // 🛒 PANIER SIMPLE
  const [cart, setCart] = useState([]);

  const toggleCart = (formation) => {
    setCart((prev) => {
      const exists = prev.find((f) => f.id === formation.id);
      if (exists) return prev.filter((f) => f.id !== formation.id);
      return [...prev, formation];
    });
  };

  // 💰 TOTAL
  const total = cart.reduce((acc, f) => acc + Number(f.prix || 0), 0);

  // 💳 CHECKOUT
  const handleCheckout = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(`${API}/formations/inscrire-multiple`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          formationIds: cart.map((f) => f.id),
        }),
      });

      if (!res.ok) throw new Error();

      setSuccessMsg("✅ Inscription réussie !");
      setCart([]);
      fetchData();
    } catch {
      setErrorMsg("❌ Erreur lors de l'inscription.");
    }
  };

  // ⏳ LOADING
  if (loading) {
    return (
      <div className="formation-page">
        <p style={{ textAlign: "center" }}>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="formation-page">
      {/* ALERTS */}
      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
      {successMsg && <p style={{ color: "green" }}>{successMsg}</p>}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="brand-icon">⚡</div>
          <span className="brand-name">TZ Prime Solutions</span>
        </div>
      </nav>
      {/* HERO */}
      <div className="hero">
        <h1>Formations</h1>
        <p>{filtered.length} disponibles</p>
      </div>

      {/* FILTERS */}
      <div className="filters">
        {filters.map((f) => (
          <button
            key={f}
            className={`filter-btn ${activeFilter === f ? "filter-btn--active" : ""
              }`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* GRID */}
      <div className="categories-grid">
        {filtered.map((f) => {
          const isInscrit = inscriptions.includes(f.id);
          const inCart = cart.some((c) => c.id === f.id);

          return (
            <div key={f.id} className="cat-card">
              <h2>{f.titre}</h2>
              <p>{f.description}</p>

              <strong>{f.prix} TND</strong>

              <div className="cat-footer">
                {!isAdmin && (
                  <button
                    onClick={() => toggleCart(f)}
                    disabled={isInscrit}
                  >
                    {isInscrit
                      ? "✓ Inscrit"
                      : inCart
                        ? "✓ Au panier"
                        : "+ Panier"}
                  </button>
                )}

                <button
                  onClick={() => navigate(`/formation/${f.id}`)}
                >
                  Voir →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* PANIER */}
      {!isAdmin && (

        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <FaShoppingCart />
          <h3>Panier ({cart.length})</h3>
          <p>Total: {total} TND</p>

          <button class="buttoninscription" onClick={handleCheckout}>
            Confirmer inscription
          </button>
        </div>
      )}
    </div>
  );
}

export default Formation;