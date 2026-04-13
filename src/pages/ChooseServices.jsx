import { useNavigate } from "react-router-dom";
import "./ChooseServices.css";

function ChooseServices({ user, setUser }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="page">
      {/* Atmospheric background */}
      <div className="bg-glow" />

      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="brand-icon">⚡</div>
          <span className="brand-name">TZ Prime Solutions</span>
        </div>
        <div className="navbar-links">
          <div className="navbar-user">
            <span className="user-dot" />
            {user?.name || user?.email || "Utilisateur"}
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="hero">
        <p className="hero-eyebrow">Nos solutions</p>
        <h1 className="hero-title">Choisissez un service</h1>
        <p className="hero-subtitle">
          Accédez à nos solutions pensées pour vous.<br />
          Bienvenue chez notre société.
        </p>
        <div className="hero-divider" />
      </div>

      {/* Cards */}
      <div className="cards-grid">

        {/* Card Formation */}
        <div
          className="card card--formation"
          onClick={() => navigate("/formation")}
        >
          <p className="card-num">01 — Formation</p>
          <div className="card-icon-wrap">🎓</div>
          <h2 className="card-title">Formation</h2>
          <p className="card-desc">
            Accédez à nos programmes de formation professionnelle et
            développez vos compétences.
          </p>
          <div className="card-cta">
            <span>Voir les formations</span>
            <div className="cta-arrow">→</div>
          </div>
          <div className="card-line" />
        </div>

        {/* Card Coworking */}
        <div
          className="card card--coworking"
          onClick={() => navigate("/coworking")}
        >
          <p className="card-num">02 — Coworking</p>
          <div className="card-icon-wrap">🏢</div>
          <h2 className="card-title">Coworking</h2>
          <p className="card-desc">
            Réservez un espace de travail moderne et collaboratif adapté à
            vos besoins.
          </p>
          <div className="card-cta">
            <span>Voir les espaces</span>
            <div className="cta-arrow">→</div>
          </div>
          <div className="card-line" />
        </div>

      </div>
    </div>
  );
}

export default ChooseServices;