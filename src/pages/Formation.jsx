import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Formation.css";

const API = "http://localhost:5000/api";

// 🔐 Headers sécurisés
const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const filters = ["Toutes", "Tech", "Créatif", "Business", "IA & Data", "Entrepreneuriat & Startup"];

function Formation({ user }) {
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const [activeFilter, setActiveFilter] = useState("Toutes");
  const [formations, setFormations] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showCart, setShowCart] = useState(false);

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

      setFormations(fData.formations || []);
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

  // 🛒 PANIER PARTAGÉ — même clé localStorage que FormationDetail.jsx
  const cartKey = `cart_${user?.id || "guest"}`;

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(cartKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Persister à chaque changement
  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(cart));
  }, [cart, cartKey]);

  // Sync depuis localStorage si l'utilisateur revient de FormationDetail
  useEffect(() => {
    const onStorageChange = (e) => {
      if (e.key === cartKey) {
        try {
          setCart(e.newValue ? JSON.parse(e.newValue) : []);
        } catch {}
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

  // 💰 TOTAL
  const total = cart.reduce((acc, f) => acc + Number(f.prix || 0), 0);

  // 💳 CHECKOUT
  const handleCheckout = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    const formationItems = cart.filter((f) => f._type === "formation");
    const courseItems = cart.filter((f) => f._type === "course");

    try {
      const promises = [];

      if (formationItems.length > 0) {
        promises.push(
          fetch(`${API}/formations/inscrire-multiple`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ formationIds: formationItems.map((f) => f.id) }),
          })
        );
      }

      if (courseItems.length > 0) {
        courseItems.forEach((course) => {
          promises.push(
            fetch(`${API}/formations/${course._formationId}/cours/${course.id}/inscrire`, {
              method: "POST",
              headers: authHeaders(),
            })
          );
        });
      }

      if (promises.length === 0) return;

      await Promise.all(promises);
      setCart([]);
      setShowCart(false);
      setSuccessMsg("✅ Inscription(s) confirmée(s) !");
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

        {/* Bouton panier dans la navbar */}
        {!isAdmin && (
          <button
            onClick={() => setShowCart(true)}
            style={{
              position: "relative",
              background: cart.length > 0 ? "rgba(212,168,67,0.15)" : "rgba(255,255,255,0.06)",
              border: cart.length > 0 ? "1px solid rgba(212,168,67,0.4)" : "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "0.45rem 0.9rem",
              cursor: "pointer",
              color: cart.length > 0 ? "#d4a843" : "#aaa",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              transition: "all 0.2s",
            }}
          >
            🛒
            {cart.length > 0 && (
              <>
                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{cart.length}</span>
                <span style={{
                  fontSize: "0.75rem",
                  color: "#d4a843",
                  fontWeight: 600,
                  borderLeft: "1px solid rgba(212,168,67,0.3)",
                  paddingLeft: "0.5rem",
                }}>
                  {total.toLocaleString("fr-TN")} TND
                </span>
              </>
            )}
          </button>
        )}
      </nav>

      {/* HERO */}
      <div className="hero">
        <h1>Formations</h1>
        <p>{filtered.length} disponibles</p>
        {isAdmin && (
          <p style={{
            marginTop: "0.5rem",
            fontSize: "0.85rem",
            color: "#f59e0b",
            fontWeight: 600,
          }}>
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

      {/* FILTERS */}
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

      {/* GRID */}
      <div className="categories-grid">
        {filtered.map((f) => {
          const inCart = cart.some((c) => c.id === f.id && c._type === "formation");

          return (
            <div key={f.id} className="cat-card">
              <h2>{f.titre}</h2>
              <p>{f.description}</p>

              <strong>{f.prix} TND</strong>

              <div className="cat-footer">
                {!isAdmin && (
                  <button onClick={() => toggleCart(f)}>
                    {inCart ? "✓ Au panier" : "+ Panier"}
                  </button>
                )}

                <button onClick={() => navigate(`/formation/${f.id}`)}>
                  Voir →
                </button>
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
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed", right: 0, top: 0, bottom: 0,
              width: "min(420px, 95vw)",
              background: "linear-gradient(180deg, #141010 0%, #0e0c08 100%)",
              borderLeft: "1px solid rgba(212,168,67,0.2)",
              display: "flex", flexDirection: "column",
              zIndex: 200,
              boxShadow: "-20px 0 60px rgba(0,0,0,0.6)",
              animation: "slideInRight 0.25s ease",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "1.5rem",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <h2 style={{ margin: 0, color: "#fff", fontSize: "1.2rem", fontWeight: 700 }}>🛒 Mon Panier</h2>
                <span style={{ fontSize: "0.8rem", color: "#888", marginTop: "0.2rem", display: "block" }}>
                  {cart.length} article{cart.length > 1 ? "s" : ""}
                </span>
              </div>
              <button
                onClick={() => setShowCart(false)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, padding: "0.4rem 0.7rem",
                  color: "#aaa", cursor: "pointer", fontSize: "1rem",
                }}
              >
                ✕
              </button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 1rem", opacity: 0.4 }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🛒</div>
                  <p style={{ color: "#aaa" }}>Votre panier est vide</p>
                </div>
              ) : (
                ["formation", "course"].map((type) => {
                  const items = cart.filter((f) => f._type === type);
                  if (items.length === 0) return null;
                  return (
                    <div key={type} style={{ marginBottom: "1.5rem" }}>
                      <p style={{
                        fontSize: "0.7rem", textTransform: "uppercase",
                        letterSpacing: "0.1em", color: "#666",
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
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            borderRadius: 10, marginBottom: "0.5rem",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{
                              margin: "0 0 0.2rem", color: "#fff",
                              fontSize: "0.92rem", fontWeight: 600,
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            }}>
                              {item.icon && <span style={{ marginRight: 6 }}>{item.icon}</span>}
                              {item._label || item.titre || item.title}
                            </h4>
                            {item._formationName && (
                              <p style={{ margin: "0 0 0.25rem", fontSize: "0.72rem", color: "#666" }}>
                                dans {item._formationName}
                              </p>
                            )}
                            <span style={{ fontSize: "0.88rem", color: "#d4a843", fontWeight: 700 }}>
                              {Number(item.prix).toLocaleString("fr-TN")} TND
                            </span>
                          </div>
                          <button
                            onClick={() => removeFromCart(item)}
                            style={{
                              background: "none", border: "none", color: "#555",
                              cursor: "pointer", fontSize: "1.1rem",
                              padding: "0 0 0 0.5rem", flexShrink: 0, transition: "color 0.15s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "#555"}
                          >
                            ✕
                          </button>
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
              borderTop: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.3)",
            }}>
              {/* Subtotals si les deux types */}
              {cart.some((f) => f._type === "formation") && cart.some((f) => f._type === "course") && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#888", marginBottom: "0.3rem" }}>
                    <span>Formations</span>
                    <span>{cart.filter((f) => f._type === "formation").reduce((a, c) => a + Number(c.prix), 0).toLocaleString("fr-TN")} TND</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#888" }}>
                    <span>Cours individuels</span>
                    <span>{cart.filter((f) => f._type === "course").reduce((a, c) => a + Number(c.prix), 0).toLocaleString("fr-TN")} TND</span>
                  </div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "0.6rem" }} />
                </div>
              )}

              {/* Total */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                <div>
                  <span style={{ color: "#888", fontSize: "0.82rem" }}>Total à payer</span>
                  <div style={{ color: "#d4a843", fontSize: "1.6rem", fontWeight: 800, lineHeight: 1.1 }}>
                    {total.toLocaleString("fr-TN")}
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, marginLeft: 4 }}>TND</span>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#555" }}>
                  {cart.length} article{cart.length > 1 ? "s" : ""}
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                style={{
                  width: "100%", padding: "0.9rem", borderRadius: 10, border: "none",
                  cursor: cart.length > 0 ? "pointer" : "not-allowed",
                  background: cart.length > 0
                    ? "linear-gradient(135deg,#d4a843,#f0c060)"
                    : "rgba(255,255,255,0.06)",
                  color: cart.length > 0 ? "#1a1206" : "#555",
                  fontWeight: 800, fontSize: "1rem", transition: "all 0.2s",
                  boxShadow: cart.length > 0 ? "0 4px 20px rgba(212,168,67,0.3)" : "none",
                }}
              >
                ✓ Confirmer les inscriptions
              </button>

              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  style={{
                    width: "100%", marginTop: "0.6rem", padding: "0.5rem",
                    background: "none", border: "none", color: "#555",
                    cursor: "pointer", fontSize: "0.8rem", transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "#555"}
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
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default Formation;