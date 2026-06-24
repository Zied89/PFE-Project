import { useNavigate } from "react-router-dom";
import "./ChooseServices.css";

function ChooseServices({ user, setUser }) {
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isSuperAdmin = user?.role === "superadmin";

  const handleLogout = () => {
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="page">
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
            {isAdmin && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: "0.7rem",
                  padding: "0.15rem 0.5rem",
                  borderRadius: 20,
                  background: "rgba(212,168,67,0.2)",
                  color: "#d4a843",
                  border: "1px solid rgba(212,168,67,0.3)",
                }}
              >
                {user.role}
              </span>
            )}
          </div>
          {isAdmin && (
            <button
              className="btn-logout btn-admin"
              onClick={() => navigate(isSuperAdmin ? "/superadmin" : "/admin")}
            >
              {isSuperAdmin ? "👑 Dashboard Super Admin" : "🛡 Dashboard Admin"}
            </button>
          )}
          <button className="btn-logout" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="hero">
        <p className="hero-eyebrow">Nos Solutions</p>
        <h1 className="hero-title">Choisissez un service</h1>
        <p className="hero-desc">
          Découvrez nos services de formation et de coworking pour booster votre
          carrière et votre productivité.
        </p>
        <div className="hero-divider" />
      </div>

      {/* Cards */}
      <div className="cards-grid">

        {/* Card Formation */}
        <div className="card" onClick={() => navigate("/formation")}>
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
        <div className="card" onClick={() => navigate("/coworking")}>
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