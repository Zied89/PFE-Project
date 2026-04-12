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
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="brand-icon">⚡</span>
          <span className="brand-name">TZ Prime Solutions</span>
        </div>
        <div className="navbar-links">
          <span className="navbar-user">
            👤 {user?.name || user?.email || "Utilisateur"}
          </span>
          <button className="btn-logout" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </nav>

     
      <div className="hero">
        <h1 className="hero-title">Choisissez un service</h1>
        <p className="hero-subtitle">
          Accédez à nos solutions pensées pour vous
          && Bienvenue chez notre societé
        </p>
      </div>

      {/* Cards */}
      <div className="cards-grid">

        {/* Card Formation */}
        <div
          className="card card--formation"
          onClick={() => navigate("/formation")}
        >
          <div className="card-icon">🎓</div>
          <h2 className="card-title">Formation</h2>
          <p className="card-desc">
            Accédez à nos programmes de formation professionnelle et
            développez vos compétences.
          </p>
          <button className="card-btn">Voir les formations →</button>
        </div>

        {/* Card Coworking */}
        <div
          className="card card--coworking"
          onClick={() => navigate("/coworking")}
        >
          <div className="card-icon">🏢</div>
          <h2 className="card-title">Coworking</h2>
          <p className="card-desc">
            Réservez un espace de travail moderne et collaboratif adapté à
            vos besoins.
          </p>
          <button className="card-btn">Voir les espaces →</button>
        </div>

      </div>
    </div>
  );
}

export default ChooseServices;