import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./InscriptionConfirm.css";
import {
  cartKey,
  restoreAuthFromBridge,
  fetchFormationDetailsForCart,
  executeCheckout,
} from "../utils/inscriptionFlow";

const formatDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-TN", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return d;
  }
};

const monthFromSession = (s) => {
  if (!s?.dateDebut) return null;
  try {
    return new Date(s.dateDebut).toLocaleDateString("fr-TN", { month: "long", year: "numeric" });
  } catch {
    return null;
  }
};

function InscriptionConfirm() {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [formationDetails, setFormationDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const init = async () => {
      // #region agent log
      fetch('http://127.0.0.1:7767/ingest/07ab952c-9395-4a8d-8a2a-2d85bdcf3314',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'45edd1'},body:JSON.stringify({sessionId:'45edd1',location:'InscriptionConfirm.jsx:init',message:'Page confirm mount',data:{hasTokenBeforeBridge:!!sessionStorage.getItem('token')},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      restoreAuthFromBridge();

      // #region agent log
      fetch('http://127.0.0.1:7767/ingest/07ab952c-9395-4a8d-8a2a-2d85bdcf3314',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'45edd1'},body:JSON.stringify({sessionId:'45edd1',location:'InscriptionConfirm.jsx:afterBridge',message:'Auth after bridge',data:{hasToken:!!sessionStorage.getItem('token')},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      if (!sessionStorage.getItem("token")) {
        setErrorMsg("Session expirée — veuillez vous reconnecter.");
        setLoading(false);
        return;
      }

      let userId;
      try {
        userId = JSON.parse(sessionStorage.getItem("user") || "{}").id;
      } catch {
        userId = "guest";
      }

      let cartItems = [];
      try {
        const saved = localStorage.getItem(cartKey(userId));
        cartItems = saved ? JSON.parse(saved) : [];
      } catch {
        cartItems = [];
      }

      // #region agent log
      fetch('http://127.0.0.1:7767/ingest/07ab952c-9395-4a8d-8a2a-2d85bdcf3314',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'45edd1'},body:JSON.stringify({sessionId:'45edd1',location:'InscriptionConfirm.jsx:cartLoaded',message:'Cart loaded in confirm tab',data:{cartCount:cartItems.length,userId},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      setCart(cartItems);

      if (cartItems.length > 0) {
        const details = await fetchFormationDetailsForCart(cartItems);
        setFormationDetails(details);

        // #region agent log
        fetch('http://127.0.0.1:7767/ingest/07ab952c-9395-4a8d-8a2a-2d85bdcf3314',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'45edd1'},body:JSON.stringify({sessionId:'45edd1',location:'InscriptionConfirm.jsx:detailsLoaded',message:'Formation details fetched',data:{formationIds:Object.keys(details),sessionsCounts:Object.fromEntries(Object.entries(details).map(([k,v])=>[k,(v.sessions||[]).length]))},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      }

      setLoading(false);
    };
    init();
  }, []);

  const total = cart.reduce((acc, f) => acc + Number(f.prix || 0), 0);

  const handleRefuse = () => {
    // #region agent log
    fetch('http://127.0.0.1:7767/ingest/07ab952c-9395-4a8d-8a2a-2d85bdcf3314',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'45edd1'},body:JSON.stringify({sessionId:'45edd1',location:'InscriptionConfirm.jsx:refuse',message:'User refused inscription',data:{cartCount:cart.length},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    window.close();
    setTimeout(() => navigate("/formation"), 300);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setErrorMsg("");
    try {
      const result = await executeCheckout(cart);

      // #region agent log
      fetch('http://127.0.0.1:7767/ingest/07ab952c-9395-4a8d-8a2a-2d85bdcf3314',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'45edd1'},body:JSON.stringify({sessionId:'45edd1',location:'InscriptionConfirm.jsx:confirmSuccess',message:'Checkout completed',data:{successCount:result.successCount,commandeStatut:result.commande?.commande?.statut,commandeId:result.commande?.commande?.id},timestamp:Date.now(),hypothesisId:'C,E'})}).catch(()=>{});
      // #endregion

      let userId;
      try {
        userId = JSON.parse(sessionStorage.getItem("user") || "{}").id;
      } catch {
        userId = "guest";
      }
      localStorage.removeItem(cartKey(userId));
      navigate("/mes-commandes");
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7767/ingest/07ab952c-9395-4a8d-8a2a-2d85bdcf3314',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'45edd1'},body:JSON.stringify({sessionId:'45edd1',location:'InscriptionConfirm.jsx:confirmError',message:'Checkout failed',data:{error:String(err.message||err)},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      setErrorMsg(err.message || "Erreur lors de la confirmation.");
    } finally {
      setSubmitting(false);
    }
  };

  const getFormationForItem = (item) => {
    const fid = item._type === "formation" ? item.id : item._formationId;
    return formationDetails[fid] || null;
  };

  if (loading) {
    return (
      <div className="ic-page">
        <p className="ic-loading">Chargement des détails...</p>
      </div>
    );
  }

  return (
    <div className="ic-page">
      <nav className="ic-navbar">
        <div className="ic-brand">
          <span>⚡</span>
          <span>TZ Prime Solutions</span>
        </div>
      </nav>

      <div className="ic-hero">
        <h1>📋 Confirmer votre inscription</h1>
        <p>Vérifiez les mois de formation, le programme et les détails avant de valider.</p>
      </div>

      <div className="ic-content">
        {errorMsg && <div className="ic-alert ic-alert-error">{errorMsg}</div>}

        {cart.length === 0 ? (
          <div className="ic-empty">
            <p>Votre panier est vide ou la session a expiré.</p>
            <button className="ic-btn ic-btn-refuse" onClick={() => navigate("/formation")}>
              Retour aux formations
            </button>
          </div>
        ) : (
          <>
            {cart.map((item) => {
              const formation = getFormationForItem(item);
              const sessions = formation?.sessions || [];
              const modules = formation?.modules || [];
              const months = [...new Set(sessions.map(monthFromSession).filter(Boolean))];

              return (
                <div className="ic-card" key={item._cartKey || `${item._type}-${item.id}`}>
                  <div className="ic-card-header">
                    <div>
                      <div className="ic-card-title">
                        {item.icon && <span style={{ marginRight: 6 }}>{item.icon}</span>}
                        {item._label || item.titre || item.title}
                      </div>
                      {item._formationName && (
                        <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 4 }}>
                          dans {item._formationName}
                        </p>
                      )}
                    </div>
                    <strong style={{ color: "#f5a623", whiteSpace: "nowrap" }}>
                      {Number(item.prix).toLocaleString("fr-TN")} TND
                    </strong>
                  </div>

                  <div className="ic-card-meta">
                    {formation?.duree && <span>⏱ Durée : {formation.duree}</span>}
                    {formation?.tag && <span>🏷 {formation.tag}</span>}
                    {formation?.description && (
                      <span style={{ flex: "1 1 100%" }}>{formation.description}</span>
                    )}
                  </div>

                  {months.length > 0 && (
                    <div className="ic-sessions">
                      <div className="ic-sessions-title">📅 Mois de formation</div>
                      {months.map((m) => (
                        <div key={m} className="ic-session-row">• {m}</div>
                      ))}
                    </div>
                  )}

                  {sessions.length > 0 && (
                    <div className="ic-sessions">
                      <div className="ic-sessions-title">🗓 Sessions planifiées</div>
                      {sessions.map((s, idx) => (
                        <div key={idx} className="ic-session-row">
                          {s.titre && <span><strong>{s.titre}</strong> — </span>}
                          <span>{formatDate(s.dateDebut)}</span>
                          {s.dateFin && s.dateFin !== s.dateDebut && (
                            <span> → {formatDate(s.dateFin)}</span>
                          )}
                          {s.lieu && <span> · 📍 {s.lieu}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {modules.length > 0 && (
                    <div className="ic-modules">
                      <strong>Programme ({modules.length} module{modules.length > 1 ? "s" : ""}) :</strong>
                      <ul style={{ margin: "0.4rem 0 0 1.2rem" }}>
                        {modules.slice(0, 5).map((m, i) => (
                          <li key={i}>{m.titre}{m.duree ? ` (${m.duree})` : ""}</li>
                        ))}
                        {modules.length > 5 && <li>… et {modules.length - 5} autre(s)</li>}
                      </ul>
                    </div>
                  )}

                  {!formation && item._type === "course" && (
                    <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 8 }}>
                      Cours individuel — détails de la formation parente en cours de chargement.
                    </p>
                  )}
                </div>
              );
            })}

            <div className="ic-total-bar">
              <span className="ic-total-label">Total à confirmer</span>
              <span className="ic-total-value">
                {total.toLocaleString("fr-TN")} <span style={{ fontSize: "0.9rem" }}>TND</span>
              </span>
            </div>

            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1rem", textAlign: "center" }}>
              En confirmant, votre demande sera <strong>en attente de validation</strong> par l'administrateur
              et visible dans <strong>Mes commandes</strong>.
            </p>

            <div className="ic-actions">
              <button
                type="button"
                className="ic-btn ic-btn-refuse"
                onClick={handleRefuse}
                disabled={submitting}
              >
                ✕ Refuser
              </button>
              <button
                type="button"
                className="ic-btn ic-btn-confirm"
                onClick={handleConfirm}
                disabled={submitting}
              >
                {submitting ? "⏳ Traitement..." : "✓ Confirmer l'inscription"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default InscriptionConfirm;
