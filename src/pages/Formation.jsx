import React from "react";
import { useNavigate } from "react-router-dom";
import "./Formation.css";

const categories = [
  {
    id: 1,
    icon: "💻",
    title: "Développement Web",
    desc: "HTML, CSS, JavaScript, React, Node.js et bien plus. Devenez développeur full-stack opérationnel.",
    count: 12,
    tag: "Tech",
    accent: "gold",
  },
  {
    id: 2,
    icon: "🎨",
    title: "Design Graphique",
    desc: "Figma, Adobe Suite, UI/UX, typographie et identité visuelle. Créez des interfaces mémorables.",
    count: 8,
    tag: "Créatif",
    accent: "teal",
  },
  {
    id: 3,
    icon: "📈",
    title: "Marketing Digital",
    desc: "SEO, réseaux sociaux, publicité en ligne et stratégie de contenu. Développez votre audience.",
    count: 9,
    tag: "Business",
    accent: "gold",
  },
  {
    id: 4,
    icon: "🤖",
    title: "Intelligence Artificielle",
    desc: "Machine learning, deep learning, Python, LLMs et pipelines de données. Maîtrisez l'IA moderne.",
    count: 6,
    tag: "IA & Data",
    accent: "teal",
  },
];

const filters = ["Toutes", "Tech", "Créatif", "Business", "IA & Data"];

function Formation({ user }) {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = React.useState("Toutes");

  const filtered =
    activeFilter === "Toutes"
      ? categories
      : categories.filter((c) => c.tag === activeFilter);

  return (
    <div className="formation-page">
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
          <button className="btn-back" onClick={() => navigate("/")}>
            <span className="back-arrow">←</span> Retour
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="hero">
        <div className="hero-left">
          <p className="hero-eyebrow">Catalogue</p>
          <h1 className="hero-title">
            Formations<br />Professionnelles
          </h1>
          <p className="hero-subtitle">
            Choisissez une catégorie pour explorer les programmes
          </p>
          <div className="hero-divider" />
        </div>
        <div className="hero-count">
          <span>{filtered.length}</span>{" "}
          catégorie{filtered.length > 1 ? "s" : ""} disponible{filtered.length > 1 ? "s" : ""}
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        {filters.map((f) => (
          <button
            key={f}
            className={`filter-pill ${activeFilter === f ? "active" : ""}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Categories grid */}
      <div className="categories-grid">
        {filtered.map((cat, index) => (
          <div
            key={cat.id}
            className={`cat-card cat-card--${cat.accent}`}
            style={{ animationDelay: `${index * 0.07}s` }}
            onClick={() => navigate(`/formation/${cat.id}`)}
          >
            <div className="cat-top">
              <div className="cat-icon">{cat.icon}</div>
              <span className="cat-index">0{index + 1}</span>
            </div>
            <h2 className="cat-title">{cat.title}</h2>
            <p className="cat-desc">{cat.desc}</p>
            <div className="cat-footer">
              <span className="cat-badge">{cat.count} programmes</span>
              <div className="cat-cta">
                <span>Explorer</span>
                <div className="cta-circle">→</div>
              </div>
            </div>
            <div className="cat-line" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default Formation;