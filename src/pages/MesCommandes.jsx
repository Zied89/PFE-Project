import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./MesCommandes.css";

const API = "http://localhost:5000/api";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${sessionStorage.getItem("token")}`,
});

const statutInfo = (statut) => {
  if (statut === "acceptée") return { label: "✅ Acceptée", cls: "accepted" };
  if (statut === "refusée")  return { label: "❌ Refusée",  cls: "refused" };
  return { label: "⏳ En attente", cls: "pending" };
};

function MesCommandes({ user }) {
  const navigate = useNavigate();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchCommandes = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await fetch(`${API}/commandes/me`, { headers: authHeaders() });
        if (!res.ok) throw new Error("Erreur API commandes");
        const data = await res.json();
        setCommandes(data.commandes || []);
      } catch (err) {
        console.error(err);
        setErrorMsg("❌ Impossible de charger vos commandes.");
      } finally {
        setLoading(false);
      }
    };
    fetchCommandes();
  }, []);

  return (
    <div className="mc-page">
      <div className="mc-bg-glow" />
      <div className="mc-bg-glow2" />

      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="brand-icon">⚡</div>
          <span className="brand-name">Elite Innovation</span>
        </div>
        <button className="btn-back" onClick={() => navigate("/formation")}>
          <span className="back-arrow">←</span> Retour aux formations
        </button>
      </nav>

      {/* ── HERO ── */}
      <div className="mc-hero">
        <h1>🧾 Mes commandes</h1>
        <p>{commandes.length} commande{commandes.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="mc-content">
        {errorMsg && <div className="mc-alert mc-alert--error">{errorMsg}</div>}

        {loading ? (
          <p className="mc-loading">Chargement...</p>
        ) : commandes.length === 0 ? (
          <div className="mc-empty">
            <div className="mc-empty-icon">🛒</div>
            <p>Vous n'avez encore passé aucune commande.</p>
            <button className="mc-empty-btn" onClick={() => navigate("/formation")}>
              Découvrir les formations
            </button>
          </div>
        ) : (
          <div className="mc-list">
            {commandes.map((c) => {
              const s = statutInfo(c.statut);
              const dateStr = c.created_at ? new Date(c.created_at).toLocaleString("fr-TN") : "—";
              return (
                <div className={`mc-card mc-card--${s.cls}`} key={c.id}>
                  <div className="mc-card-header">
                    <div>
                      <h3 className="mc-card-title">Commande #{c.id}</h3>
                      <p className="mc-card-meta">
                        🕓 {dateStr} · {c.items?.length || 0} article{(c.items?.length || 0) > 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className={`mc-badge mc-badge--${s.cls}`}>{s.label}</span>
                  </div>

                  <div className="mc-items">
                    {(c.items || []).map((item) => (
                      <div className="mc-item-chip" key={item.id}>
                        {item.icon && <span>{item.icon}</span>}
                        <span>{item.titre}</span>
                        <span className="mc-item-price">
                          {Number(item.prix).toLocaleString("fr-TN")} TND
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mc-card-footer">
                    <span className="mc-card-footer-label">Total</span>
                    <span className="mc-card-footer-total">
                      {Number(c.total).toLocaleString("fr-TN")} TND
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MesCommandes;