import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./auth.css";

function Login({ setUser }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);

    // Simulate API call — replace with your real auth logic
    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const found = users.find(
        (u) => u.email === email && u.password === password
      );

      if (!found) {
        setError("Email ou mot de passe incorrect.");
        setLoading(false);
        return;
      }

      setUser(found);
      navigate("/choose-services");
      setLoading(false);
    }, 600);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1>Bienvenue</h1>
          <p>Connectez-vous à votre compte</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email">Adresse email</label>
            <input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="auth-divider">ou</div>

        <p className="auth-link-row">
          Pas encore de compte ?{" "}
          <Link to="/register">S'inscrire</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;