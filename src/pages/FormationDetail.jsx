import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./FormationDetail.css";

const API = "http://localhost:5000/api";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// Programmes statiques par catégorie (enrichissement local)
const coursesByCategory = {
  "Développement Web": [
    { id: 1, title: "HTML & CSS Fondamentaux", duration: "4 semaines", level: "Débutant", students: 342, prix: 150 },
    { id: 2, title: "JavaScript Moderne (ES6+)", duration: "6 semaines", level: "Intermédiaire", students: 218, prix: 220 },
    { id: 3, title: "React & Ecosystem", duration: "8 semaines", level: "Intermédiaire", students: 195, prix: 290 },
    { id: 4, title: "Node.js & Express", duration: "5 semaines", level: "Intermédiaire", students: 160, prix: 240 },
    { id: 5, title: "Bases de données SQL & NoSQL", duration: "4 semaines", level: "Intermédiaire", students: 134, prix: 200 },
    { id: 6, title: "Déploiement & DevOps", duration: "3 semaines", level: "Avancé", students: 98, prix: 320 },
  ],
  "Design Graphique": [
    { id: 1, title: "Figma pour débutants", duration: "3 semaines", level: "Débutant", students: 276, prix: 130 },
    { id: 2, title: "UI/UX Design Thinking", duration: "5 semaines", level: "Intermédiaire", students: 188, prix: 250 },
    { id: 3, title: "Adobe Illustrator", duration: "4 semaines", level: "Intermédiaire", students: 154, prix: 210 },
    { id: 4, title: "Adobe Photoshop", duration: "4 semaines", level: "Intermédiaire", students: 210, prix: 210 },
    { id: 5, title: "Identité visuelle & Branding", duration: "6 semaines", level: "Avancé", students: 112, prix: 350 },
  ],
  "Marketing Digital": [
    { id: 1, title: "SEO & Référencement naturel", duration: "4 semaines", level: "Débutant", students: 305, prix: 160 },
    { id: 2, title: "Google Ads & Meta Ads", duration: "5 semaines", level: "Intermédiaire", students: 229, prix: 270 },
    { id: 3, title: "Community Management", duration: "3 semaines", level: "Débutant", students: 198, prix: 120 },
    { id: 4, title: "Email Marketing & Automation", duration: "4 semaines", level: "Intermédiaire", students: 143, prix: 190 },
    { id: 5, title: "Analytics & Data Marketing", duration: "5 semaines", level: "Avancé", students: 121, prix: 300 },
  ],
  "Intelligence Artificielle": [
    { id: 1, title: "Python pour la Data Science", duration: "5 semaines", level: "Débutant", students: 289, prix: 180 },
    { id: 2, title: "Machine Learning avec Scikit-learn", duration: "6 semaines", level: "Intermédiaire", students: 174, prix: 310 },
    { id: 3, title: "Deep Learning & Réseaux de neurones", duration: "8 semaines", level: "Avancé", students: 132, prix: 420 },
    { id: 4, title: "LLMs & Prompt Engineering", duration: "4 semaines", level: "Intermédiaire", students: 201, prix: 260 },
    { id: 5, title: "Pipelines de données avec Airflow", duration: "5 semaines", level: "Avancé", students: 89, prix: 380 },
  ],
  "Business & Entrepreneuriat": [
    { id: 1, title: "Lean Startup & MVP", duration: "4 semaines", level: "Débutant", students: 312, prix: 170 },
    { id: 2, title: "Business Model Canvas", duration: "3 semaines", level: "Débutant", students: 256, prix: 140 },
    { id: 3, title: "Stratégies de croissance", duration: "5 semaines", level: "Intermédiaire", students: 198, prix: 290 },
    { id: 4, title: "Pitching & Levée de fonds", duration: "4 semaines", level: "Intermédiaire", students: 142, prix: 240 },
    { id: 5, title: "Gestion financière pour startups", duration: "6 semaines", level: "Avancé", students: 97, prix: 360 },
  ],
};

const levelColors = {
  "Débutant":      "level--green",
  "Intermédiaire": "level--blue",
  "Avancé":        "level--purple",
};

// Clé localStorage partagée avec Formation.jsx
const cartKey = (userId) => `cart_${userId || "guest"}`;

function FormationDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formation, setFormation] = useState(null);
  const [isInscrit, setIsInscrit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Panier partagé avec Formation.jsx via localStorage
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(cartKey(user?.id));
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showCart, setShowCart] = useState(false);

  // Persister à chaque changement
  useEffect(() => {
    localStorage.setItem(cartKey(user?.id), JSON.stringify(cart));
  }, [cart, user?.id]);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  useEffect(() => {
    const fetchFormation = async () => {
      setLoading(true);
      try {
        const [fRes, iRes] = await Promise.all([
          fetch(`${API}/formations/${id}`, { headers: authHeaders() }),
          fetch(`${API}/formations/inscriptions/me`, { headers: authHeaders() }),
        ]);
        if (!fRes.ok) { setNotFound(true); return; }
        const fData = await fRes.json();
        const iData = await iRes.json();
        setFormation(fData.formation);
        const inscritIds = (iData.inscriptions || []).map(i => i.formation_id);
        setIsInscrit(inscritIds.includes(fData.formation.id));
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchFormation();
  }, [id]);

  // ── Panier helpers ──────────────────────────────────────────────────────────
  const toggleFormationCart = () => {
    if (!formation) return;
    setCart(prev => {
      const exists = prev.find(f => f.id === formation.id && f._type === "formation");
      if (exists) return prev.filter(f => !(f.id === formation.id && f._type === "formation"));
      return [...prev, { ...formation, _type: "formation", _label: formation.titre }];
    });
  };

  const toggleCourseCart = (course) => {
    setCart(prev => {
      const key = `course-${formation?.id}-${course.id}`;
      const exists = prev.find(f => f._cartKey === key);
      if (exists) return prev.filter(f => f._cartKey !== key);
      return [...prev, {
        ...course,
        _type: "course",
        _cartKey: key,
        _label: course.title,
        _formationId: formation?.id,
        _formationName: formation?.titre,
        icon: formation?.icon,
      }];
    });
  };

  const removeFromCart = (item) => {
    if (item._type === "course") {
      setCart(prev => prev.filter(f => f._cartKey !== item._cartKey));
    } else {
      setCart(prev => prev.filter(f => !(f.id === item.id && f._type === item._type)));
    }
  };

  const cartTotal = cart.reduce((acc, curr) => acc + Number(curr.prix || 0), 0);

  const isFormationInCart = formation && cart.some(f => f.id === formation.id && f._type === "formation");
  const isCourseInCart = (course) =>
    cart.some(f => f._cartKey === `course-${formation?.id}-${course.id}`);

  // ── Inscription formation entière ──────────────────────────────────────────
  const handleInscrire = async () => {
    if (isInscrit) return;
    try {
      const res = await fetch(`${API}/formations/${id}/inscrire`, {
        method: "POST", headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.message); return; }
      setIsInscrit(true);
      showSuccess(data.message || "Inscription réussie !");
    } catch {
      setErrorMsg("Erreur lors de l'inscription.");
    }
  };

  const handleDesinscrire = async () => {
    try {
      const res = await fetch(`${API}/formations/${id}/desinscrire`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) return;
      setIsInscrit(false);
      showSuccess("Désinscription effectuée.");
    } catch {
      setErrorMsg("Erreur lors de la désinscription.");
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const formationItems = cart.filter(f => f._type === "formation");
    const courseItems = cart.filter(f => f._type === "course");
    try {
      const promises = [];
      if (formationItems.length > 0) {
        promises.push(
          fetch(`${API}/formations/inscrire-multiple`, {
            method: "POST", headers: authHeaders(),
            body: JSON.stringify({ formationIds: formationItems.map(f => f.id) })
          })
        );
      }
      if (courseItems.length > 0) {
        courseItems.forEach(course => {
          promises.push(
            fetch(`${API}/formations/${course._formationId}/cours/${course.id}/inscrire`, {
              method: "POST", headers: authHeaders(),
            })
          );
        });
      }
      await Promise.all(promises);
      showSuccess("Inscriptions confirmées !");
      setCart([]);
      setShowCart(false);
    } catch {
      setErrorMsg("Erreur lors de la confirmation.");
    }
  };

  // ── Render states ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="fd-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="bg-glow" />
      <p style={{ color: "#fff", fontSize: "1.2rem" }}>⏳ Chargement...</p>
    </div>
  );

  if (notFound || !formation) return (
    <div className="fd-page">
      <div className="bg-glow" />
      <div className="fd-not-found">
        <p>Formation introuvable.</p>
        <button className="btn-back" onClick={() => navigate("/formation")}>← Retour</button>
      </div>
    </div>
  );

  const courses = coursesByCategory[formation.categorie] || [];
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  return (
    <div className="fd-page">
      <div className="bg-glow" />
      <div className="bg-glow2" />

      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="brand-icon">⚡</div>
          <span className="brand-name">TZ Prime Solutions</span>
        </div>
        <div className="navbar-links">
          {user && (
            <div className="navbar-user">
              <span className="user-dot" />
              {user.name || user.email || "Utilisateur"}
            </div>
          )}

          {/* Cart button in navbar */}
          {!isAdmin && (
            <button
              onClick={() => setShowCart(true)}
              style={{
                position: "relative", background: cart.length > 0 ? "rgba(212,168,67,0.15)" : "rgba(255,255,255,0.06)",
                border: cart.length > 0 ? "1px solid rgba(212,168,67,0.4)" : "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12, padding: "0.45rem 0.9rem", cursor: "pointer",
                color: cart.length > 0 ? "#d4a843" : "#aaa",
                fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.4rem", transition: "all 0.2s",
              }}>
              🛒
              {cart.length > 0 && (
                <>
                  <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{cart.length}</span>
                  <span style={{
                    fontSize: "0.75rem", color: "#d4a843", fontWeight: 600,
                    borderLeft: "1px solid rgba(212,168,67,0.3)", paddingLeft: "0.5rem",
                  }}>
                    {cartTotal.toLocaleString("fr-TN")} TND
                  </span>
                </>
              )}
            </button>
          )}

          <button className="btn-back" onClick={() => navigate("/formation")}>
            <span className="back-arrow">←</span> Retour
          </button>
        </div>
      </nav>

      {/* Alerts */}
      {errorMsg && (
        <div style={{ maxWidth: 900, margin: "1rem auto 0", padding: "0.7rem 1.2rem", background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444", borderRadius: 8, color: "#fca5a5" }}>
          {errorMsg} <button onClick={() => setErrorMsg("")} style={{ marginLeft: 8, background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>✕</button>
        </div>
      )}
      {successMsg && (
        <div style={{ maxWidth: 900, margin: "1rem auto 0", padding: "0.7rem 1.2rem", background: "rgba(74,222,128,0.12)", border: "1px solid #4ade80", borderRadius: 8, color: "#4ade80" }}>
          {successMsg}
        </div>
      )}

      {/* Hero */}
      <div className="fd-hero">
        <div className="fd-hero-icon">{formation.icon}</div>
        <div className="fd-hero-text">
          <p className="hero-eyebrow">{formation.tag}</p>
          <h1 className="hero-title">{formation.titre}</h1>
          <p className="hero-subtitle">{formation.description}</p>
          <div className="fd-hero-meta">
            <span>⏱ {formation.duree}</span>
            <span>🪑 {formation.places} places</span>
            <span>💰 {Number(formation.prix).toLocaleString("fr-TN")} TND</span>
          </div>
          <div className="hero-divider" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "flex-end" }}>
          <div className="hero-count">
            <span>{courses.length}</span> programme{courses.length > 1 ? "s" : ""}
          </div>

          {/* Actions : inscription directe OU ajout au panier */}
          {!isAdmin && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
              {/* Bouton inscription directe */}
              <button
                onClick={isInscrit ? handleDesinscrire : handleInscrire}
                style={{
                  padding: "0.6rem 1.5rem", borderRadius: 24, border: "none", cursor: "pointer", fontWeight: 700,
                  fontSize: "0.9rem", transition: "all 0.2s",
                  background: isInscrit
                    ? "rgba(74,222,128,0.15)"
                    : "linear-gradient(135deg,#d4a843,#f0c060)",
                  color: isInscrit ? "#4ade80" : "#1a1206",
                 
                }}>
                {isInscrit ? "✓ Inscrit — Se désinscrire" : "S'inscrire maintenant"}
              </button>

              {/* Bouton ajout panier (formation complète) */}
              {!isInscrit && (
                <button
                  onClick={toggleFormationCart}
                  style={{
                    padding: "0.5rem 1.2rem", borderRadius: 24, fontWeight: 600, fontSize: "0.85rem",
                    cursor: "pointer", transition: "all 0.2s",
                    background: isFormationInCart ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)",
                    color: isFormationInCart ? "#93c5fd" : "#aaa",
                    border: isFormationInCart ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.12)",
                  }}>
                  {isFormationInCart ? "✓ Formation au panier" : "🛒 Ajouter au panier"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Courses list */}
      <div className="fd-list">
        {courses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", opacity: 0.5 }}>
            <p>Aucun programme disponible pour cette catégorie.</p>
          </div>
        ) : (
          courses.map((course, index) => {
            const inCart = isCourseInCart(course);
            return (
              <div key={course.id} className="fd-course-card" style={{ animationDelay: `${index * 0.07}s` }}>
                <div className="fd-course-left">
                  <span className="fd-course-index">0{index + 1}</span>
                  <div style={{ flex: 1 }}>
                    <h2 className="fd-course-title">{course.title}</h2>
                    <div className="fd-course-meta">
                      <span className="fd-meta-item">⏱ {course.duration}</span>
                      <span className="fd-meta-item">👥 {course.students} inscrits</span>
                      <span className={`fd-level ${levelColors[course.level] || ""}`}>{course.level}</span>
                      <span className="fd-meta-item fd-prix">
                        💰 {course.prix.toLocaleString("fr-TN")} TND
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bouton ajout au panier par cours */}
                {!isAdmin && (
                  <button
                    onClick={() => toggleCourseCart(course)}
                    style={{
                      padding: "0.4rem 1rem", borderRadius: 20, fontWeight: 600, fontSize: "0.8rem",
                      cursor: "pointer", transition: "all 0.2s", flexShrink: 0,
                      background: inCart ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)",
                      color: inCart ? "#93c5fd" : "#888",
                      border: inCart ? "1px solid rgba(59,130,246,0.35)" : "1px solid rgba(255,255,255,0.1)",
                    }}>
                    {inCart ? "✓ Au panier" : "+ Panier"}
                  </button>
                )}

                <div className="fd-card-line" />
              </div>
            );
          })
        )}
      </div>

      {/* ═══ CART DRAWER ═══ */}
      {showCart && (
        <div className="cw-overlay" onClick={() => setShowCart(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: "fixed", right: 0, top: 0, bottom: 0,
              width: "min(420px, 95vw)",
              background: "linear-gradient(180deg, #141010 0%, #0e0c08 100%)",
              borderLeft: "1px solid rgba(212,168,67,0.2)",
              display: "flex", flexDirection: "column",
              zIndex: 200,
              boxShadow: "-20px 0 60px rgba(0,0,0,0.6)",
              animation: "slideInRight 0.25s ease",
            }}>

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
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "0.4rem 0.7rem", color: "#aaa", cursor: "pointer", fontSize: "1rem" }}>
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
                ["formation", "course"].map(type => {
                  const items = cart.filter(f => f._type === type);
                  if (items.length === 0) return null;
                  return (
                    <div key={type} style={{ marginBottom: "1.5rem" }}>
                      <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#666", marginBottom: "0.75rem", fontWeight: 600 }}>
                        {type === "formation" ? "📚 Formations" : "🎓 Cours individuels"}
                      </p>
                      {items.map(item => (
                        <div key={item._cartKey || `${item._type}-${item.id}`} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                          padding: "0.85rem 1rem",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          borderRadius: 10, marginBottom: "0.5rem",
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ margin: "0 0 0.2rem", color: "#fff", fontSize: "0.92rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
                            style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "1.1rem", padding: "0 0 0 0.5rem", flexShrink: 0, transition: "color 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                            onMouseLeave={e => e.currentTarget.style.color = "#555"}>
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
              {cart.some(f => f._type === "formation") && cart.some(f => f._type === "course") && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#888", marginBottom: "0.3rem" }}>
                    <span>Formations</span>
                    <span>{cart.filter(f => f._type === "formation").reduce((a, c) => a + Number(c.prix), 0).toLocaleString("fr-TN")} TND</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#888" }}>
                    <span>Cours individuels</span>
                    <span>{cart.filter(f => f._type === "course").reduce((a, c) => a + Number(c.prix), 0).toLocaleString("fr-TN")} TND</span>
                  </div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "0.6rem" }} />
                </div>
              )}

              {/* Total */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                <div>
                  <span style={{ color: "#888", fontSize: "0.82rem" }}>Total à payer</span>
                  <div style={{ color: "#d4a843", fontSize: "1.6rem", fontWeight: 800, lineHeight: 1.1 }}>
                    {cartTotal.toLocaleString("fr-TN")}
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
                }}>
                ✓ Confirmer les inscriptions
              </button>

              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  style={{ width: "100%", marginTop: "0.6rem", padding: "0.5rem", background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "0.8rem", transition: "color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                  onMouseLeave={e => e.currentTarget.style.color = "#555"}>
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
        .fd-course-card {
          display: flex !important;
          align-items: center !important;
          gap: 1rem !important;
        }
        .fd-course-left {
          flex: 1 !important;
          min-width: 0 !important;
        }
      `}</style>
    </div>
  );
}

export default FormationDetail;