import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./FormationDetail.css";

const API = "http://localhost:5000/api";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${sessionStorage.getItem("token")}`,
});

// Programmes statiques par catégorie — clés = valeurs exactes en base
const coursesByCategory = {
  "Tech": [
    { id: 1, title: "HTML & CSS Fondamentaux", duration: "4 semaines", level: "Débutant", students: 342, prix: 150 },
    { id: 2, title: "JavaScript Moderne (ES6+)", duration: "6 semaines", level: "Intermédiaire", students: 218, prix: 220 },
    { id: 3, title: "React & Ecosystem", duration: "8 semaines", level: "Intermédiaire", students: 195, prix: 290 },
    { id: 4, title: "Node.js & Express", duration: "5 semaines", level: "Intermédiaire", students: 160, prix: 240 },
    { id: 5, title: "Bases de données SQL & NoSQL", duration: "4 semaines", level: "Intermédiaire", students: 134, prix: 200 },
    { id: 6, title: "Déploiement & DevOps", duration: "3 semaines", level: "Avancé", students: 98, prix: 320 },
  ],
  "Créatif": [
    { id: 1, title: "Figma pour débutants", duration: "3 semaines", level: "Débutant", students: 276, prix: 130 },
    { id: 2, title: "UI/UX Design Thinking", duration: "5 semaines", level: "Intermédiaire", students: 188, prix: 250 },
    { id: 3, title: "Adobe Illustrator", duration: "4 semaines", level: "Intermédiaire", students: 154, prix: 210 },
    { id: 4, title: "Adobe Photoshop", duration: "4 semaines", level: "Intermédiaire", students: 210, prix: 210 },
    { id: 5, title: "Identité visuelle & Branding", duration: "6 semaines", level: "Avancé", students: 112, prix: 350 },
  ],
  "Business": [
    { id: 1, title: "SEO & Référencement naturel", duration: "4 semaines", level: "Débutant", students: 305, prix: 160 },
    { id: 2, title: "Google Ads & Meta Ads", duration: "5 semaines", level: "Intermédiaire", students: 229, prix: 270 },
    { id: 3, title: "Community Management", duration: "3 semaines", level: "Débutant", students: 198, prix: 120 },
    { id: 4, title: "Email Marketing & Automation", duration: "4 semaines", level: "Intermédiaire", students: 143, prix: 190 },
    { id: 5, title: "Analytics & Data Marketing", duration: "5 semaines", level: "Avancé", students: 121, prix: 300 },
  ],
  "IA & Data": [
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
    { id: 6, title: "Étude de marché & Validation d'idée", duration: "3 semaines", level: "Débutant", students: 178, prix: 150 },
    { id: 7, title: "Juridique & Création d'entreprise", duration: "3 semaines", level: "Intermédiaire", students: 121, prix: 200 },
    { id: 8, title: "Growth Hacking & Acquisition", duration: "4 semaines", level: "Intermédiaire", students: 156, prix: 230 },
    { id: 9, title: "Négociation & Vente pour entrepreneurs", duration: "3 semaines", level: "Débutant", students: 134, prix: 170 },
    { id: 10, title: "Recrutement & Gestion d'équipe startup", duration: "4 semaines", level: "Avancé", students: 92, prix: 260 },
  ],
  "Cybersécurité": [
    { id: 1, title: "Fondamentaux de la cybersécurité", duration: "4 semaines", level: "Débutant", students: 265, prix: 190 },
    { id: 2, title: "Ethical Hacking & Pentesting", duration: "6 semaines", level: "Intermédiaire", students: 143, prix: 320 },
    { id: 3, title: "Sécurité des applications web", duration: "5 semaines", level: "Intermédiaire", students: 167, prix: 280 },
    { id: 4, title: "Cryptographie & Sécurité des données", duration: "6 semaines", level: "Avancé", students: 88, prix: 400 },
    { id: 5, title: "Gestion des incidents & Forensics", duration: "4 semaines", level: "Avancé", students: 76, prix: 350 },
  ],
  "Motion Design & Vidéo": [
    { id: 1, title: "After Effects pour débutants", duration: "4 semaines", level: "Débutant", students: 231, prix: 150 },
    { id: 2, title: "Cinema 4D & Modélisation 3D", duration: "6 semaines", level: "Intermédiaire", students: 112, prix: 300 },
    { id: 3, title: "Techniques avancées d'animation", duration: "5 semaines", level: "Avancé", students: 89, prix: 380 },
    { id: 4, title: "Montage vidéo avec Premiere Pro", duration: "4 semaines", level: "Intermédiaire", students: 154, prix: 220 },
    { id: 5, title: "Effets spéciaux & Compositing", duration: "6 semaines", level: "Avancé", students: 67, prix: 400 },
  ],
};
// Alias : le filtre de Formation.jsx utilise le tag "Entrepreneuriat & Startup",
// qui peut différer du champ `categorie` stocké en base ("Business & Entrepreneuriat").
// On fait pointer les deux clés vers la même liste pour que ça matche dans tous les cas.
coursesByCategory["Entrepreneuriat & Startup"] = coursesByCategory["Business & Entrepreneuriat"];

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
        const fRes = await fetch(`${API}/formations/${id}`, { headers: authHeaders() });
        if (!fRes.ok) { setNotFound(true); return; }
        const fData = await fRes.json();
        setFormation(fData.formation);
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


  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const formationItems = cart.filter(f => f._type === "formation");
    const courseItems = cart.filter(f => f._type === "course");

    // Instantané des articles du panier pour la commande (titre/prix figés à l'achat)
    const commandeItems = cart.map((item) => ({
      type: item._type === "course" ? "cours" : "formation",
      formationId: item._type === "formation" ? item.id : item._formationId,
      titre: item._label || item.titre || item.title,
      prix: item.prix,
      tag: item.tag,
      icon: item.icon,
    }));

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
            fetch(`${API}/formations/${course._formationId}/cours/inscrire`, {
              method: "POST", headers: authHeaders(),
              body: JSON.stringify({
                titre: course.title,
                duree: course.duration,
                prix: course.prix,
              }),
            })
          );
        });
      }
      await Promise.all(promises);

      // Enregistrer la commande (visible dans "Mes commandes" et l'admin)
      try {
        const cmdRes = await fetch(`${API}/commandes`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ items: commandeItems }),
        });
        if (!cmdRes.ok) console.error("Erreur enregistrement commande:", await cmdRes.text());
      } catch (cmdErr) {
        console.error("Erreur enregistrement commande:", cmdErr);
      }

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

  // Recherche par categorie (correspondance exacte avec la DB)
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
            textAlign: "center",
            boxShadow: "0 0 24px rgba(34,255,136,0.35)",
            animation: "toastSlideDown 0.3s ease",
          }}
        >
          {successMsg}
        </div>
      )}

      <style>{`
        @keyframes toastSlideDown {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to   { transform: translate(-50%, 0);      opacity: 1; }
        }
      `}</style>

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

          {/* Ajout au panier (formation complète) */}
          {!isAdmin && (
            <button
              onClick={toggleFormationCart}
              className={`fd-cart-btn-main${isFormationInCart ? " in-cart" : ""}`}>
              {isFormationInCart ? "✓ Formation au panier" : "🛒 Ajouter au panier"}
            </button>
          )}
        </div>
      </div>

      {/* Courses list */}
      <div className="fd-list">
        {courses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", opacity: 0.5 }}>
            <p>Aucun programme disponible pour cette catégorie : <strong>{formation.categorie}</strong></p>
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
                    className={`fd-cart-btn-course${inCart ? " in-cart" : ""}`}>
                    {inCart ? "✓ Au panier" : "🛒 Ajouter"}
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
              background: "rgba(255,255,255,0.80)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderLeft: "1px solid var(--sky-200)",
              display: "flex", flexDirection: "column",
              zIndex: 200,
              boxShadow: "-20px 0 60px rgba(3,105,161,0.15)",
              animation: "slideInRight 0.25s ease",
            }}>

            {/* Header */}
            <div style={{
              padding: "1.5rem",
              borderBottom: "1px solid var(--sky-100)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <h2 style={{ margin: 0, color: "var(--sky-900)", fontSize: "1.2rem", fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>🛒 Mon Panier</h2>
                <span style={{ fontSize: "0.8rem", color: "var(--sky-600)", marginTop: "0.2rem", display: "block" }}>
                  {cart.length} article{cart.length > 1 ? "s" : ""}
                </span>
              </div>
              <button
                onClick={() => setShowCart(false)}
                style={{ background: "var(--sky-100)", border: "1px solid var(--sky-200)", borderRadius: 999, padding: "0.4rem 0.7rem", color: "var(--sky-700)", cursor: "pointer", fontSize: "1rem", transition: "background 0.2s ease" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--sky-200)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--sky-100)"}>
                ✕
              </button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 1rem", opacity: 0.6 }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "1rem", color: "var(--sky-400)" }}>🛒</div>
                  <p style={{ color: "var(--sky-500)" }}>Votre panier est vide</p>
                </div>
              ) : (
                ["formation", "course"].map(type => {
                  const items = cart.filter(f => f._type === type);
                  if (items.length === 0) return null;
                  return (
                    <div key={type} style={{ marginBottom: "1.5rem" }}>
                      <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--sky-600)", marginBottom: "0.75rem", fontWeight: 600 }}>
                        {type === "formation" ? "📚 Formations" : "🎓 Cours individuels"}
                      </p>
                      {items.map(item => (
                        <div key={item._cartKey || `${item._type}-${item.id}`} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                          padding: "0.85rem 1rem",
                          background: "var(--sky-50)",
                          border: "1px solid var(--sky-100)",
                          borderRadius: 10, marginBottom: "0.5rem",
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ margin: "0 0 0.2rem", color: "var(--sky-900)", fontSize: "0.92rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
                            style={{ background: "none", border: "none", color: "var(--sky-400)", cursor: "pointer", fontSize: "1.1rem", padding: "0 0 0 0.5rem", flexShrink: 0, transition: "color 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                            onMouseLeave={e => e.currentTarget.style.color = "var(--sky-400)"}>
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
              borderTop: "1px solid var(--sky-200)",
              background: "rgba(255,255,255,0.70)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}>
              {/* Subtotals si les deux types */}
              {cart.some(f => f._type === "formation") && cart.some(f => f._type === "course") && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--sky-600)", marginBottom: "0.3rem" }}>
                    <span>Formations</span>
                    <span>{cart.filter(f => f._type === "formation").reduce((a, c) => a + Number(c.prix), 0).toLocaleString("fr-TN")} TND</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--sky-600)" }}>
                    <span>Cours individuels</span>
                    <span>{cart.filter(f => f._type === "course").reduce((a, c) => a + Number(c.prix), 0).toLocaleString("fr-TN")} TND</span>
                  </div>
                  <div style={{ borderTop: "1px solid var(--sky-100)", marginTop: "0.6rem" }} />
                </div>
              )}

              {/* Total */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                <div>
                  <span style={{ color: "var(--sky-600)", fontSize: "0.82rem" }}>Total à payer</span>
                  <div style={{ color: "#f5a623", fontSize: "1.6rem", fontWeight: 800, lineHeight: 1.1 }}>
                   {cart.reduce((acc, f) => acc + Number(f.prix || 0), 0).toLocaleString("fr-TN")}
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, marginLeft: 4 }}>TND</span>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--sky-500)" }}>
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

    </div>
  );
}

export default FormationDetail;