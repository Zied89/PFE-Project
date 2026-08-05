import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Formation.css";
import { openInscriptionConfirmTab } from "../utils/inscriptionFlow";

const API = "http://localhost:5000/api";

const authHeaders = () => {
  const token = sessionStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const filters = ["Toutes", "Tech", "Créatif", "Business", "IA & Data", "Entrepreneuriat & Startup"];

const getFormationIcon = (formation) => {
  const titre = (formation.titre || "").toLowerCase();
  const tag   = (formation.tag   || "").toLowerCase();

  if (titre.includes("data science") || titre.includes("machine learning")) return "🤖";
  if (titre.includes("intelligence artificielle") || titre.includes("ia avancée") || titre.includes("ia ")) return "🧠";
  if (titre.includes("design") || titre.includes("ux") || titre.includes("ui") || titre.includes("figma")) return "🎨";
  if (titre.includes("marketing")) return "📣";
  if (titre.includes("python")) return "🐍";
  if (titre.includes("javascript") || titre.includes("js")) return "⚡";
  if (titre.includes("react") || titre.includes("vue") || titre.includes("angular")) return "⚛️";
  if (titre.includes("web") || titre.includes("html") || titre.includes("css")) return "🌐";
  if (titre.includes("mobile") || titre.includes("android") || titre.includes("ios")) return "📱";
  if (titre.includes("cloud") || titre.includes("aws") || titre.includes("azure")) return "☁️";
  if (titre.includes("cybersécurité") || titre.includes("sécurité") || titre.includes("cyber")) return "🔐";
  if (titre.includes("blockchain") || titre.includes("crypto")) return "🔗";
  if (titre.includes("startup") || titre.includes("entrepreneuriat")) return "🚀";
  if (titre.includes("finance") || titre.includes("comptabilité")) return "💰";
  if (titre.includes("management") || titre.includes("gestion")) return "📊";
  if (titre.includes("photo") || titre.includes("vidéo")) return "📸";
  if (titre.includes("musique") || titre.includes("audio")) return "🎵";
  if (titre.includes("3d") || titre.includes("animation")) return "🎬";
  if (titre.includes("excel") || titre.includes("tableau")) return "📊";
  if (titre.includes("base de données") || titre.includes("sql")) return "🗄️";
  if (titre.includes("devops") || titre.includes("docker") || titre.includes("linux")) return "🛠️";

  if (tag === "tech") return "💻";
  if (tag === "créatif") return "🎨";
  if (tag === "business") return "💼";
  if (tag === "ia & data") return "🧠";
  if (tag === "entrepreneuriat & startup") return "🚀";

  return "📚";
};

function Formation({ user }) {
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const [activeFilter, setActiveFilter] = useState("Toutes");
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showCart, setShowCart] = useState(false);

  /* ── Fetch formations ── */
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const fRes = await fetch(`${API}/formations`, { headers: authHeaders() });
      if (!fRes.ok) throw new Error("Erreur API formations");
      const fData = await fRes.json();
      setFormations(fData.formations || []);
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  /* ── Auto-dismiss du toast de succès ── */
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(""), 3000);
    return () => clearTimeout(t);
  }, [successMsg]);

  /* ── Filter ── */
  const filtered =
    activeFilter === "Toutes"
      ? formations
      : formations.filter((f) => f.tag === activeFilter);

  /* ── Cart (localStorage) ── */
  const cartKey = `cart_${user?.id || "guest"}`;

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(cartKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(cart));
  }, [cart, cartKey]);

  useEffect(() => {
    const onStorageChange = (e) => {
      if (e.key === cartKey) {
        try { setCart(e.newValue ? JSON.parse(e.newValue) : []); } catch {}
      }
    };
    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, [cartKey]);

  const toggleCart = (formation) => {
    setCart((prev) => {
      const exists = prev.find((f) => f.id === formation.id && f._type === "formation");
      if (exists) return prev.filter((f) => !(f.id === formation.id && f._type === "formation"));
      return [...prev, { ...formation, _type: "formation", _label: formation.titre }];
    });
  };

  const removeFromCart = (item) => {
    if (item._type === "course") {
      setCart((prev) => prev.filter((f) => f._cartKey !== item._cartKey));
    } else {
      setCart((prev) => prev.filter((f) => !(f.id === item.id && f._type === item._type)));
    }
  };

  const total = cart.reduce((acc, f) => acc + Number(f.prix || 0), 0);

/* ── Checkout ── */
  const handleCheckout = async () => {
    if (!user) { navigate("/login"); return; }
    if (cart.length === 0) return;

    setErrorMsg("");
    setSuccessMsg("");

    // Ouvre un nouvel onglet qui affiche les mois de formation et les détails,
    // où l'utilisateur choisit de confirmer ou de refuser.
    openInscriptionConfirmTab();
    setShowCart(false);
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="formation-page">
      <p style={{ textAlign: "center", padding: "4rem", color: "#888" }}>Chargement...</p>
    </div>
  );

  return (
    <div className="formation-page">

      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="brand-icon">⚡</div>
          <span className="brand-name">TZ Prime Solutions</span>
        </div>

        <div className="navbar-links">
          {user && (
            <div
              className="navbar-user"
              onClick={() => navigate("/services")}
              style={{ cursor: "pointer" }}
              title="Retour aux services"
            >
              <span className="user-dot" />
              {user.name || user.email || "Utilisateur"}
            </div>
          )}

        {!isAdmin && user && (
          <button
            onClick={() => navigate("/mes-commandes")}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12, padding: "0.45rem 0.9rem",
              cursor: "pointer",
              color: "#aaa",
              fontSize: "0.85rem",
              display: "flex", alignItems: "center", gap: "0.4rem",
              transition: "all 0.2s",
            }}
          >
            🧾 Mes commandes
          </button>
        )}

        {!isAdmin && (
          <button
            onClick={() => setShowCart(true)}
            style={{
              position: "relative",
              background: cart.length > 0 ? "rgba(212,168,67,0.15)" : "rgba(255,255,255,0.06)",
              border: cart.length > 0 ? "1px solid rgba(212,168,67,0.4)" : "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12, padding: "0.45rem 0.9rem",
              cursor: "pointer",
              color: cart.length > 0 ? "#d4a843" : "#aaa",
              fontSize: "1rem",
              display: "flex", alignItems: "center", gap: "0.4rem",
              transition: "all 0.2s",
            }}
          >
            🛒
            {cart.length > 0 && (
              <>
                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{cart.length}</span>
                <span style={{
                  fontSize: "0.75rem", color: "#d4a843", fontWeight: 600,
                  borderLeft: "1px solid rgba(212,168,67,0.3)", paddingLeft: "0.5rem",
                }}>
                  {total.toLocaleString("fr-TN")} TND
                </span>
              </>
            )}
          </button>
        )}
        </div>
      </nav>

      {/* ── ALERTS ── */}
      {errorMsg && (
        <div style={{
          margin: "1rem 2rem", padding: "0.85rem 1.2rem",
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 10, color: "#ef4444", fontWeight: 600, fontSize: "0.9rem",
        }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div
          style={{
            position: "fixed",
            top: "1.25rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            maxWidth: "min(700px, 90vw)",
            padding: "0.9rem 1.6rem",
            background: "rgba(16, 60, 50, 0.55)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid #22ff88",
            borderRadius: 14,
            color: "#4ade80",
            fontWeight: 600,
            fontSize: "0.9rem",
            textAlign: "center",
            boxShadow: "0 0 24px rgba(34,255,136,0.35)",
            animation: "toastSlideDown 0.3s ease",
          }}
        >
          {successMsg}
        </div>
      )}

      {/* ── HERO ── */}
      <div className="hero">
        <h1>Formations</h1>
        <p>{filtered.length} disponibles</p>
        {isAdmin && (
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#f59e0b", fontWeight: 600 }}>
            🛡 Mode admin — les inscriptions sont gérées depuis le{" "}
            <span
              style={{ textDecoration: "underline", cursor: "pointer" }}
              onClick={() => navigate("/admin")}
            >
              Dashboard Admin
            </span>
          </p>
        )}
      </div>

      {/* ── FILTERS ── */}
      <div className="filters">
        {filters.map((f) => (
          <button
            key={f}
            className={`filter-btn ${activeFilter === f ? "filter-btn--active" : ""}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── GRID ── */}
      <div className="categories-grid">
        {filtered.map((f) => {
          const inCart = cart.some((c) => c.id === f.id && c._type === "formation");
          const minP = f.minParticipants ?? f.min_participants;
          const maxP = f.maxParticipants ?? f.max_participants ?? f.places;
          const nbModules = Array.isArray(f.modules) ? f.modules.length : 0;
          return (
            <div key={f.id} className="cat-card">
              <div className="cat-icon">{getFormationIcon(f)}</div>
              <h2>{f.titre}</h2>
              <p>{f.description}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", margin: "0.4rem 0", fontSize: "0.78rem", opacity: 0.75 }}>
                {minP != null && <span>👥 {minP}–{maxP} pers.</span>}
                {nbModules > 0 && <span>🧩 {nbModules} module{nbModules > 1 ? "s" : ""}</span>}
                {f.duree && <span>⏱ {f.duree}</span>}
              </div>
              <strong>{f.prix} TND</strong>
              <div className="cat-footer">
                {!isAdmin && (
                  <button onClick={() => toggleCart(f)}>
                    {inCart ? "✓ Au panier" : "+ Panier"}
                  </button>
                )}
                <button onClick={() => navigate(`/formation/${f.id}`)}>Voir →</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ CART DRAWER ═══ */}
      {!isAdmin && showCart && (
        <div
          onClick={() => setShowCart(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(10,36,80,0.35)",
            zIndex: 100, backdropFilter: "blur(2px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed", right: 0, top: 0, bottom: 0,
              width: "min(420px, 95vw)",
              background: "rgba(255,255,255,0.80)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderLeft: "1px solid var(--sky-200)",
              display: "flex", flexDirection: "column",
              zIndex: 200,
              boxShadow: "-20px 0 60px rgba(3,105,161,0.15)",
              animation: "slideInRight 0.25s ease",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "1.5rem",
              borderBottom: "1px solid var(--sky-100)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <h2 style={{
                  margin: 0, color: "var(--sky-900)", fontSize: "1.2rem", fontWeight: 700,
                  fontFamily: "'Playfair Display', serif",
                }}>
                  🛒 Mon Panier
                </h2>
                <span style={{ fontSize: "0.8rem", color: "var(--sky-600)", marginTop: "0.2rem", display: "block" }}>
                  {cart.length} article{cart.length > 1 ? "s" : ""}
                </span>
              </div>
              <button
                onClick={() => setShowCart(false)}
                style={{
                  background: "var(--sky-100)",
                  border: "1px solid var(--sky-200)",
                  borderRadius: 999, padding: "0.4rem 0.7rem",
                  color: "var(--sky-700)", cursor: "pointer", fontSize: "1rem",
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--sky-200)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "var(--sky-100)"}
              >✕</button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 1rem", opacity: 0.6 }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "1rem", color: "var(--sky-400)" }}>🛒</div>
                  <p style={{ color: "var(--sky-500)" }}>Votre panier est vide</p>
                </div>
              ) : (
                ["formation", "course"].map((type) => {
                  const items = cart.filter((f) => f._type === type);
                  if (items.length === 0) return null;
                  return (
                    <div key={type} style={{ marginBottom: "1.5rem" }}>
                      <p style={{
                        fontSize: "0.7rem", textTransform: "uppercase",
                        letterSpacing: "0.1em", color: "var(--sky-600)",
                        marginBottom: "0.75rem", fontWeight: 600,
                      }}>
                        {type === "formation" ? "📚 Formations" : "🎓 Cours individuels"}
                      </p>
                      {items.map((item) => (
                        <div
                          key={item._cartKey || `${item._type}-${item.id}`}
                          style={{
                            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                            padding: "0.85rem 1rem",
                            background: "var(--sky-50)",
                            border: "1px solid var(--sky-100)",
                            borderRadius: 10, marginBottom: "0.5rem",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{
                              margin: "0 0 0.2rem", color: "var(--sky-900)",
                              fontSize: "0.92rem", fontWeight: 600,
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            }}>
                              {item.icon && <span style={{ marginRight: 6 }}>{item.icon}</span>}
                              {item._label || item.titre || item.title}
                            </h4>
                            {item._formationName && (
                              <p style={{ margin: "0 0 0.25rem", fontSize: "0.72rem", color: "var(--sky-600)" }}>
                                dans {item._formationName}
                              </p>
                            )}
                            <span style={{ fontSize: "0.88rem", color: "#f5a623", fontWeight: 700 }}>
                              {Number(item.prix).toLocaleString("fr-TN")} TND
                            </span>
                          </div>
                          <button
                            onClick={() => removeFromCart(item)}
                            style={{
                              background: "none", border: "none", color: "var(--sky-400)",
                              cursor: "pointer", fontSize: "1.1rem",
                              padding: "0 0 0 0.5rem", flexShrink: 0, transition: "color 0.15s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "var(--sky-400)"}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: "1.5rem",
              borderTop: "1px solid var(--sky-200)",
              background: "rgba(255,255,255,0.70)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}>
              {/* Subtotals si les deux types présents */}
              {cart.some((f) => f._type === "formation") && cart.some((f) => f._type === "course") && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--sky-600)", marginBottom: "0.3rem" }}>
                    <span>Formations</span>
                    <span>{cart.filter((f) => f._type === "formation").reduce((a, c) => a + Number(c.prix), 0).toLocaleString("fr-TN")} TND</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--sky-600)" }}>
                    <span>Cours individuels</span>
                    <span>{cart.filter((f) => f._type === "course").reduce((a, c) => a + Number(c.prix), 0).toLocaleString("fr-TN")} TND</span>
                  </div>
                  <div style={{ borderTop: "1px solid var(--sky-100)", marginTop: "0.6rem" }} />
                </div>
              )}

              {/* Total */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                <div>
                  <span style={{ color: "var(--sky-600)", fontSize: "0.82rem" }}>Total à payer</span>
                  <div style={{ color: "#f5a623", fontSize: "1.6rem", fontWeight: 800, lineHeight: 1.1 }}>
                    {total.toLocaleString("fr-TN")}
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, marginLeft: 4 }}>TND</span>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--sky-500)" }}>
                  {cart.length} article{cart.length > 1 ? "s" : ""}
                </div>
              </div>

              {/* Inline alerts dans le drawer */}
              {errorMsg && (
                <div style={{
                  marginBottom: "0.8rem", padding: "0.6rem 0.9rem",
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 8, color: "#ef4444", fontSize: "0.82rem", fontWeight: 600,
                }}>
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div style={{
                  marginBottom: "0.8rem", padding: "0.6rem 0.9rem",
                  background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
                  borderRadius: 8, color: "#22c55e", fontSize: "0.82rem", fontWeight: 600,
                }}>
                  {successMsg}
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                style={{
                  width: "100%", padding: "0.9rem", borderRadius: 10, border: "none",
                  cursor: cart.length > 0 ? "pointer" : "not-allowed",
                  background: cart.length > 0
                    ? "linear-gradient(135deg, var(--sky-600), var(--sky-500))"
                    : "var(--sky-100)",
                  color: cart.length > 0 ? "#fff" : "var(--sky-400)",
                  fontWeight: 800, fontSize: "1rem", transition: "all 0.2s",
                  boxShadow: cart.length > 0 ? "0 4px 20px rgba(14,165,233,0.35)" : "none",
                }}
              >
                ✓ Confirmer les inscriptions
              </button>

              {cart.length > 0 && (
                <button
                  onClick={() => { setCart([]); localStorage.removeItem(cartKey); }}
                  style={{
                    width: "100%", marginTop: "0.6rem", padding: "0.5rem",
                    background: "none", border: "none", color: "var(--sky-400)",
                    cursor: "pointer", fontSize: "0.8rem", transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "var(--sky-400)"}
                >
                  Vider le panier
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes toastSlideDown {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to   { transform: translate(-50%, 0);      opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default Formation;