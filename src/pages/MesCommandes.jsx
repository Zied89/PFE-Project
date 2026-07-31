import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./Formation.css";

const API = "http://localhost:5000/api";

const authHeaders = () => {
  const token = sessionStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const STATUT_LABELS = {
  en_attente: { label: "En attente", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)" },
  "acceptée": { label: "Acceptée", color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.35)" },
  "refusée":  { label: "Refusée",  color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)" },
};

const statutBadge = (statut) => {
  const s = STATUT_LABELS[statut] || STATUT_LABELS.en_attente;
  return (
    <span style={{
      display: "inline-block", padding: "0.25rem 0.65rem", borderRadius: 20,
      fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.02em",
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
    }}>
      {s.label}
    </span>
  );
};

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
};

const formatDay = (iso) => {
  if (!iso) return "inconnue";
  const d = new Date(iso);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD, clé de regroupement
};

function MesCommandes({ user }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [formationInscriptions, setFormationInscriptions] = useState([]);
  const [moduleInscriptions, setModuleInscriptions] = useState([]);
  const [activeFilter, setActiveFilter] = useState("Toutes");

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const [fRes, mRes] = await Promise.all([
          fetch(`${API}/formations/inscriptions/me`, { headers: authHeaders() }),
          fetch(`${API}/modules/inscriptions/me`, { headers: authHeaders() }),
        ]);

        if (!fRes.ok || !mRes.ok) throw new Error("Erreur API");

        const fData = await fRes.json();
        const mData = await mRes.json();

        setFormationInscriptions(fData.inscriptions || []);
        setModuleInscriptions(mData.inscriptions || []);
      } catch (err) {
        console.error(err);
        setErrorMsg("❌ Impossible de charger votre historique de commandes.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  /* ── Fusion des deux sources en une seule liste homogène ── */
  const allItems = useMemo(() => {
    const formationItems = formationInscriptions.map((i) => ({
      _type: "formation",
      id: i.id,
      titre: i.titre,
      prix: i.prix,
      statut: i.statut,
      created_at: i.created_at,
      icon: i.icon || "📚",
      parent: null,
    }));

    const moduleItems = moduleInscriptions.map((i) => ({
      _type: "module",
      id: i.id,
      titre: i.module_titre,
      prix: i.module_prix,
      statut: i.statut,
      created_at: i.created_at,
      icon: "🧩",
      parent: i.formation_titre,
    }));

    return [...formationItems, ...moduleItems].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }, [formationInscriptions, moduleInscriptions]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "Toutes") return allItems;
    const map = { "En attente": "en_attente", "Acceptées": "acceptée", "Refusées": "refusée" };
    return allItems.filter((it) => it.statut === map[activeFilter]);
  }, [allItems, activeFilter]);

  /* ── Regroupement par "commande" (jour d'achat) ── */
  const groupedByDay = useMemo(() => {
    const groups = {};
    for (const item of filteredItems) {
      const key = formatDay(item.created_at);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return Object.entries(groups).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filteredItems]);

  const totalDepense = allItems
    .filter((i) => i.statut === "acceptée")
    .reduce((acc, i) => acc + Number(i.prix || 0), 0);

  if (loading) {
    return (
      <div className="formation-page">
        <p style={{ textAlign: "center", padding: "4rem", color: "#888" }}>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="formation-page">
      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div className="navbar-brand" style={{ cursor: "pointer" }} onClick={() => navigate("/formations")}>
          <div className="brand-icon">⚡</div>
          <span className="brand-name">TZ Prime Solutions</span>
        </div>
        <div className="navbar-links">
          <button
            onClick={() => navigate("/formations")}
            style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12, padding: "0.45rem 0.9rem", cursor: "pointer",
              color: "#aaa", fontSize: "0.85rem",
            }}
          >
            ← Retour aux formations
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="hero">
        <h1>🧾 Mes commandes</h1>
        <p>{allItems.length} inscription{allItems.length > 1 ? "s" : ""} au total</p>
      </div>

      {errorMsg && (
        <div style={{
          margin: "1rem 2rem", padding: "0.85rem 1.2rem",
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 10, color: "#ef4444", fontWeight: 600, fontSize: "0.9rem",
        }}>
          {errorMsg}
        </div>
      )}

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 2rem 4rem" }}>

        {/* ── RÉSUMÉ ── */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem",
        }}>
          <div style={{
            flex: "1 1 200px", padding: "1.2rem", borderRadius: 14,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <span style={{ fontSize: "0.78rem", color: "#888" }}>Total dépensé (accepté)</span>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#d4a843", marginTop: "0.2rem" }}>
              {totalDepense.toLocaleString("fr-TN")} <span style={{ fontSize: "0.9rem" }}>TND</span>
            </div>
          </div>
          <div style={{
            flex: "1 1 200px", padding: "1.2rem", borderRadius: 14,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <span style={{ fontSize: "0.78rem", color: "#888" }}>En attente de validation</span>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f59e0b", marginTop: "0.2rem" }}>
              {allItems.filter((i) => i.statut === "en_attente").length}
            </div>
          </div>
        </div>

        {/* ── FILTRES ── */}
        <div className="filters" style={{ marginBottom: "1.5rem" }}>
          {["Toutes", "En attente", "Acceptées", "Refusées"].map((f) => (
            <button
              key={f}
              className={`filter-btn ${activeFilter === f ? "filter-btn--active" : ""}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* ── LISTE GROUPÉE PAR DATE DE COMMANDE ── */}
        {groupedByDay.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem", opacity: 0.5 }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🧾</div>
            <p style={{ color: "#aaa" }}>Aucune commande dans cette catégorie.</p>
          </div>
        ) : (
          groupedByDay.map(([day, items]) => {
            const dayTotal = items.reduce((acc, i) => acc + Number(i.prix || 0), 0);
            return (
              <div key={day} style={{ marginBottom: "1.8rem" }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  marginBottom: "0.7rem", paddingBottom: "0.5rem",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}>
                  <span style={{ fontSize: "0.85rem", color: "#d4a843", fontWeight: 700 }}>
                    Commande du {formatDate(items[0].created_at)}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "#888" }}>
                    {items.length} article{items.length > 1 ? "s" : ""} · {dayTotal.toLocaleString("fr-TN")} TND
                  </span>
                </div>

                {items.map((item) => (
                  <div
                    key={`${item._type}-${item.id}`}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "0.9rem 1.1rem", marginBottom: "0.6rem",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", minWidth: 0 }}>
                      <div style={{ fontSize: "1.4rem" }}>{item.icon}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.94rem" }}>
                          {item.titre}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#666", marginTop: "0.15rem" }}>
                          {item._type === "module" ? `Module · ${item.parent}` : "Formation complète"}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
                      <span style={{ color: "#d4a843", fontWeight: 700, fontSize: "0.92rem" }}>
                        {Number(item.prix || 0).toLocaleString("fr-TN")} TND
                      </span>
                      {statutBadge(item.statut)}
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default MesCommandes;