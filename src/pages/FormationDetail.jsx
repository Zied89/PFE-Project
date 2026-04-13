import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./FormationDetail.css";

const categoriesData = {
  1: {
    icon: "💻",
    title: "Développement Web",
    tag: "Tech",
    desc: "Maîtrisez les technologies modernes du web et devenez développeur full-stack opérationnel.",
    courses: [
      { id: 1, title: "HTML & CSS Fondamentaux", duration: "4 semaines", level: "Débutant", students: 342 },
      { id: 2, title: "JavaScript Moderne (ES6+)", duration: "6 semaines", level: "Intermédiaire", students: 218 },
      { id: 3, title: "React & Ecosystem", duration: "8 semaines", level: "Intermédiaire", students: 195 },
      { id: 4, title: "Node.js & Express", duration: "5 semaines", level: "Intermédiaire", students: 160 },
      { id: 5, title: "Bases de données SQL & NoSQL", duration: "4 semaines", level: "Intermédiaire", students: 134 },
      { id: 6, title: "Déploiement & DevOps", duration: "3 semaines", level: "Avancé", students: 98 },
    ],
  },
  2: {
    icon: "🎨",
    title: "Design Graphique",
    tag: "Créatif",
    desc: "Créez des identités visuelles percutantes et des interfaces mémorables avec les meilleurs outils.",
    courses: [
      { id: 1, title: "Figma pour débutants", duration: "3 semaines", level: "Débutant", students: 276 },
      { id: 2, title: "UI/UX Design Thinking", duration: "5 semaines", level: "Intermédiaire", students: 188 },
      { id: 3, title: "Adobe Illustrator", duration: "4 semaines", level: "Intermédiaire", students: 154 },
      { id: 4, title: "Adobe Photoshop", duration: "4 semaines", level: "Intermédiaire", students: 210 },
      { id: 5, title: "Identité visuelle & Branding", duration: "6 semaines", level: "Avancé", students: 112 },
    ],
  },
  3: {
    icon: "📈",
    title: "Marketing Digital",
    tag: "Business",
    desc: "Développez votre audience et boostez votre présence en ligne grâce aux stratégies digitales.",
    courses: [
      { id: 1, title: "SEO & Référencement naturel", duration: "4 semaines", level: "Débutant", students: 305 },
      { id: 2, title: "Google Ads & Meta Ads", duration: "5 semaines", level: "Intermédiaire", students: 229 },
      { id: 3, title: "Community Management", duration: "3 semaines", level: "Débutant", students: 198 },
      { id: 4, title: "Email Marketing & Automation", duration: "4 semaines", level: "Intermédiaire", students: 143 },
      { id: 5, title: "Stratégie de contenu", duration: "3 semaines", level: "Intermédiaire", students: 167 },
      { id: 6, title: "Analytics & Data Marketing", duration: "5 semaines", level: "Avancé", students: 121 },
    ],
  },
  4: {
    icon: "🤖",
    title: "Intelligence Artificielle",
    tag: "IA & Data",
    desc: "Plongez dans le machine learning, les LLMs et les pipelines de données pour maîtriser l'IA moderne.",
    courses: [
      { id: 1, title: "Python pour la Data Science", duration: "5 semaines", level: "Débutant", students: 289 },
      { id: 2, title: "Machine Learning avec Scikit-learn", duration: "6 semaines", level: "Intermédiaire", students: 174 },
      { id: 3, title: "Deep Learning & Réseaux de neurones", duration: "8 semaines", level: "Avancé", students: 132 },
      { id: 4, title: "LLMs & Prompt Engineering", duration: "4 semaines", level: "Intermédiaire", students: 201 },
      { id: 5, title: "Pipelines de données avec Airflow", duration: "5 semaines", level: "Avancé", students: 89 },
    ],
  },
};

const levelColors = {
  "Débutant": "level--green",
  "Intermédiaire": "level--blue",
  "Avancé": "level--purple",
};

function FormationDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [enrolled, setEnrolled] = React.useState({});

  const category = categoriesData[id];

  if (!category) {
    return (
      <div className="fd-page">
        <div className="bg-glow" />
        <div className="fd-not-found">
          <p>Catégorie introuvable.</p>
          <button className="btn-back" onClick={() => navigate("/formation")}>← Retour</button>
        </div>
      </div>
    );
  }

  const handleEnroll = (courseId) => {
    setEnrolled((prev) => ({ ...prev, [courseId]: true }));
  };

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
          <button className="btn-back" onClick={() => navigate("/formation")}>
            <span className="back-arrow">←</span> Retour
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="fd-hero">
        <div className="fd-hero-icon">{category.icon}</div>
        <div className="fd-hero-text">
          <p className="hero-eyebrow">{category.tag}</p>
          <h1 className="hero-title">{category.title}</h1>
          <p className="hero-subtitle">{category.desc}</p>
          <div className="hero-divider" />
        </div>
        <div className="hero-count">
          <span>{category.courses.length}</span> programme{category.courses.length > 1 ? "s" : ""}
        </div>
      </div>

      {/* Courses list */}
      <div className="fd-list">
        {category.courses.map((course, index) => (
          <div
            key={course.id}
            className="fd-course-card"
            style={{ animationDelay: `${index * 0.07}s` }}
          >
            <div className="fd-course-left">
              <span className="fd-course-index">0{index + 1}</span>
              <div>
                <h2 className="fd-course-title">{course.title}</h2>
                <div className="fd-course-meta">
                  <span className="fd-meta-item">⏱ {course.duration}</span>
                  <span className="fd-meta-item">👥 {course.students} inscrits</span>
                  <span className={`fd-level ${levelColors[course.level] || ""}`}>{course.level}</span>
                </div>
              </div>
            </div>
            <button
              className={`fd-enroll-btn ${enrolled[course.id] ? "enrolled" : ""}`}
              onClick={() => handleEnroll(course.id)}
            >
              {enrolled[course.id] ? "✓ Inscrit" : "S'inscrire"}
            </button>
            <div className="fd-card-line" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default FormationDetail;