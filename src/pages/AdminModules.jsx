import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./Formation.css";

const API = "http://localhost:5000/api";

const authHeaders = () => {
  const token = sessionStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const STATUT_LABELS = {
  en_attente: { label: "En attente", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)" },
  "acceptée": { label: "Acceptée", color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.35)" },
  "refusée":  { label: "Refusée",  color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)" },
};

const statutBadge = (statut) => {
  const s = STATUT_LABELS[statut] || STATUT_LABELS.en_attente;
  return (
    <span style={{
      display: "inline-block", padding: "0.25rem 0.6rem", borderRadius: 20,
      fontSize: "0.7rem", fontWeight: 700,
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
    }}>
      {s.label}
    </span>
  );
};

const emptyModuleForm = { titre: "", description: "", duree: "2 semaines", prix: 0, ordre: 0 };

function AdminModules({ user }) {
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const [tab, setTab] = useState("modules"); // "modules" | "inscriptions"
  const [formations, setFormations] = useState([]);
  const [selectedFormationId, setSelectedFormationId] = useState(null);
  const [modules, setModules] = useState([]);
  const [allInscriptions, setAllInscriptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [form, setForm] = useState(emptyModuleForm);

  const [inscriptionFilter, setInscriptionFilter] = useState("Toutes");
  const [moduleFilterId, setModuleFilterId] = useState("all");

  /* ── Redirect si pas admin ── */
  useEffect(() => {
    if (!isAdmin) navigate("/formations");
  }, [isAdmin, navigate]);

  /* ── Charger les formations au montage ── */
  useEffect(() => {
    const fetchFormations = async () => {
      try {
        const res = await fetch(`${API}/formations`, { headers: authHeaders() });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setFormations(data.formations || []);
        if (data.formations?.length) setSelectedFormationId(data.formations[0].id);
      } catch (err) {
        setErrorMsg("❌ Impossible de charger les formations.");
      } finally {
        setLoading(false);
      }
    };
    fetchFormations();
  }, []);

  /* ── Charger les modules de la formation sélectionnée ── */
  const fetchModules = async (formationId) => {
    if (!formationId) return;
    try {
      const res = await fetch(`${API}/modules/formation/${formationId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setModules(data.modules || []);
    } catch (err) {
      setErrorMsg("❌ Impossible de charger les modules.");
    }
  };

  useEffect(() => {
    if (selectedFormationId) fetchModules(selectedFormationId);
  }, [selectedFormationId]);

  /* ── Charger toutes les inscriptions aux modules (onglet Inscriptions) ── */
  const fetchAllInscriptions = async () => {
    try {
      const res = await fetch(`${API}/modules/inscriptions/all`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAllInscriptions(data.inscriptions || []);
    } catch (err) {
      setErrorMsg("❌ Impossible de charger les inscriptions.");
    }
  };

  useEffect(() => {
    if (tab === "inscriptions") fetchAllInscriptions();
  }, [tab]);

  const clearMsgs = () => { setErrorMsg(""); setSuccessMsg(""); };

  /* ── CRUD Module ── */
  const openCreateForm = () => {
    setEditingModule(null);
    setForm(emptyModuleForm);
    setShowForm(true);
    clearMsgs();
  };

  const openEditForm = (mod) => {
    setEditingModule(mod);
    setForm({
      titre: mod.titre || "",
      description: mod.description || "",
      duree: mod.duree || "2 semaines",
      prix: mod.prix || 0,
      ordre: mod.ordre || 0,
    });
    setShowForm(true);
    clearMsgs();
  };

  const submitForm = async (e) => {
    e.preventDefault();
    clearMsgs();
    if (!form.titre.trim()) {
      setErrorMsg("⚠️ Le titre du module est obligatoire.");
      return;
    }
    try {
      const url = editingModule
        ? `${API}/modules/${editingModule.id}`
        : `${API}/modules/formation/${selectedFormationId}`;
      const method = editingModule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur");

      setSuccessMsg(editingModule ? "✅ Module mis à jour." : "✅ Module créé.");
      setShowForm(false);
      fetchModules(selectedFormationId);
    } catch (err) {
      setErrorMsg(`❌ ${err.message}`);
    }
  };

  const deleteModule = async (mod) => {
    if (!window.confirm(`Supprimer le module "${mod.titre}" ? Cette action est irréversible.`)) return;
    clearMsgs();
    try {
      const res = await fetch(`${API}/modules/${mod.id}`, { method: "DELETE", headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur");
      setSuccessMsg("✅ Module supprimé.");
      fetchModules(selectedFormationId);
    } catch (err) {
      setErrorMsg(`❌ ${err.message}`);
    }
  };

  /* ── Gestion des inscriptions ── */
  const updateStatut = async (inscriptionId, statut) => {
    clearMsgs();
    try {
      const res = await fetch(`${API}/modules/inscriptions/${inscriptionId}/statut`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ statut }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur");
      setSuccessMsg("✅ Statut mis à jour.");
      fetchAllInscriptions();
    } catch (err) {
      setErrorMsg(`❌ ${err.message}`);
    }
  };

  const deleteInscription = async (inscriptionId) => {
    if (!window.confirm("Supprimer cette inscription ?")) return;
    clearMsgs();
    try {
      const res = await fetch(`${API}/modules/inscriptions/${inscriptionId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur");
      setSuccessMsg("✅ Inscription supprimée.");
      fetchAllInscriptions();
    } catch (err) {
      setErrorMsg(`❌ ${err.message}`);
    }
  };

  /* ── Modules disponibles pour le filtre (issus des inscriptions chargées) ── */
  const modulesInInscriptions = useMemo(() => {
    const map = new Map();
    for (const i of allInscriptions) {
      if (!map.has(i.module_id)) map.set(i.module_id, i.module_titre);
    }
    return Array.from(map.entries());
  }, [allInscriptions]);

  const filteredInscriptions = useMemo(() => {
    let list = allInscriptions;
    if (moduleFilterId !== "all") {
      list = list.filter((i) => String(i.module_id) === String(moduleFilterId));
    }
    if (inscriptionFilter !== "Toutes") {
      const map = { "En attente": "en_attente", "Acceptées": "acceptée", "Refusées": "refusée" };
      list = list.filter((i) => i.statut === map[inscriptionFilter]);
    }
    return list;
  }, [allInscriptions, moduleFilterId, inscriptionFilter]);

  /* ── Regroupement par module pour l'affichage ── */
  const groupedByModule = useMemo(() => {
    const groups = {};
    for (const i of filteredInscriptions) {
      const key = i.module_id;
      if (!groups[key]) groups[key] = { titre: i.module_titre, formation: i.formation_titre, items: [] };
      groups[key].items.push(i);
    }
    return Object.entries(groups);
  }, [filteredInscriptions]);

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="formation-page">
        <p style={{ textAlign: "center", padding: "4rem", color: "#888" }}>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="formation-page">
      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div className="navbar-brand" style={{ cursor: "pointer" }} onClick={() => navigate("/admin")}>
          <div className="brand-icon">⚡</div>
          <span className="brand-name">TZ Prime Solutions — Admin</span>
        </div>
        <div className="navbar-links">
          <button
            onClick={() => navigate("/admin")}
            style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12, padding: "0.45rem 0.9rem", cursor: "pointer",
              color: "#aaa", fontSize: "0.85rem",
            }}
          >
            ← Dashboard
          </button>
        </div>
      </nav>

      <div className="hero">
        <h1>🧩 Gestion des modules</h1>
        <p>Créez des modules et gérez les inscriptions par module</p>
      </div>

      {errorMsg && (
        <div style={{
          margin: "1rem 2rem", padding: "0.85rem 1.2rem",
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 10, color: "#ef4444", fontWeight: 600, fontSize: "0.9rem",
        }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{
          margin: "1rem 2rem", padding: "0.85rem 1.2rem",
          background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
          borderRadius: 10, color: "#22c55e", fontWeight: 600, fontSize: "0.9rem",
        }}>
          {successMsg}
        </div>
      )}

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 2rem 4rem" }}>

        {/* ── ONGLETS ── */}
        <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1.8rem" }}>
          {[
            { key: "modules", label: "📚 Modules" },
            { key: "inscriptions", label: "🎓 Inscriptions par module" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); clearMsgs(); }}
              style={{
                padding: "0.6rem 1.2rem", borderRadius: 10, cursor: "pointer",
                border: tab === t.key ? "1px solid rgba(212,168,67,0.5)" : "1px solid rgba(255,255,255,0.1)",
                background: tab === t.key ? "rgba(212,168,67,0.15)" : "rgba(255,255,255,0.04)",
                color: tab === t.key ? "#d4a843" : "#aaa",
                fontWeight: 700, fontSize: "0.88rem",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══════════ ONGLET MODULES ═══════════ */}
        {tab === "modules" && (
          <>
            {/* Sélecteur de formation */}
            <div style={{ display: "flex", gap: "0.8rem", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <label style={{ color: "#888", fontSize: "0.85rem" }}>Formation :</label>
              <select
                value={selectedFormationId || ""}
                onChange={(e) => setSelectedFormationId(Number(e.target.value))}
                style={{
                  background: "#1a1612", color: "#fff", border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8, padding: "0.5rem 0.8rem", fontSize: "0.88rem",
                }}
              >
                {formations.map((f) => (
                  <option key={f.id} value={f.id}>{f.titre}</option>
                ))}
              </select>

              <button
                onClick={openCreateForm}
                disabled={!selectedFormationId}
                style={{
                  marginLeft: "auto", padding: "0.55rem 1.1rem", borderRadius: 10, border: "none",
                  background: "linear-gradient(135deg,#d4a843,#f0c060)", color: "#1a1206",
                  fontWeight: 700, cursor: "pointer", fontSize: "0.85rem",
                }}
              >
                + Nouveau module
              </button>
            </div>

            {/* Formulaire création/édition */}
            {showForm && (
              <form
                onSubmit={submitForm}
                style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,168,67,0.25)",
                  borderRadius: 14, padding: "1.5rem", marginBottom: "1.5rem",
                }}
              >
                <h3 style={{ color: "#d4a843", marginTop: 0, fontSize: "1rem" }}>
                  {editingModule ? "Modifier le module" : "Nouveau module"}
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", color: "#888", marginBottom: "0.3rem" }}>Titre</label>
                    <input
                      value={form.titre}
                      onChange={(e) => setForm({ ...form, titre: e.target.value })}
                      style={inputStyle}
                      placeholder="Ex : Introduction à Python"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", color: "#888", marginBottom: "0.3rem" }}>Durée</label>
                    <input
                      value={form.duree}
                      onChange={(e) => setForm({ ...form, duree: e.target.value })}
                      style={inputStyle}
                      placeholder="Ex : 2 semaines"
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#888", marginBottom: "0.3rem" }}>Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.2rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", color: "#888", marginBottom: "0.3rem" }}>Prix (TND)</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={form.prix}
                      onChange={(e) => setForm({ ...form, prix: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", color: "#888", marginBottom: "0.3rem" }}>Ordre d'affichage</label>
                    <input
                      type="number" min="0"
                      value={form.ordre}
                      onChange={(e) => setForm({ ...form, ordre: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.7rem" }}>
                  <button type="submit" style={primaryBtnStyle}>
                    {editingModule ? "Enregistrer" : "Créer le module"}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} style={secondaryBtnStyle}>
                    Annuler
                  </button>
                </div>
              </form>
            )}

            {/* Liste des modules */}
            {modules.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", opacity: 0.5 }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🧩</div>
                <p style={{ color: "#aaa" }}>Aucun module pour cette formation.</p>
              </div>
            ) : (
              modules.map((mod) => (
                <div
                  key={mod.id}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "1rem 1.2rem", marginBottom: "0.7rem",
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                  }}
                >
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}>{mod.titre}</div>
                    <div style={{ color: "#888", fontSize: "0.78rem", marginTop: "0.2rem" }}>
                      {mod.duree} · {Number(mod.prix).toLocaleString("fr-TN")} TND · ordre {mod.ordre}
                    </div>
                    {mod.description && (
                      <div style={{ color: "#666", fontSize: "0.78rem", marginTop: "0.3rem", maxWidth: 500 }}>
                        {mod.description}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                    <button onClick={() => openEditForm(mod)} style={smallBtnStyle}>✏️ Modifier</button>
                    <button onClick={() => deleteModule(mod)} style={{ ...smallBtnStyle, color: "#ef4444" }}>🗑 Supprimer</button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* ═══════════ ONGLET INSCRIPTIONS PAR MODULE ═══════════ */}
        {tab === "inscriptions" && (
          <>
            <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
              <select
                value={moduleFilterId}
                onChange={(e) => setModuleFilterId(e.target.value)}
                style={{
                  background: "#1a1612", color: "#fff", border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8, padding: "0.5rem 0.8rem", fontSize: "0.85rem",
                }}
              >
                <option value="all">Tous les modules</option>
                {modulesInInscriptions.map(([id, titre]) => (
                  <option key={id} value={id}>{titre}</option>
                ))}
              </select>

              <div className="filters" style={{ margin: 0 }}>
                {["Toutes", "En attente", "Acceptées", "Refusées"].map((f) => (
                  <button
                    key={f}
                    className={`filter-btn ${inscriptionFilter === f ? "filter-btn--active" : ""}`}
                    onClick={() => setInscriptionFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {groupedByModule.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", opacity: 0.5 }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🎓</div>
                <p style={{ color: "#aaa" }}>Aucune inscription pour ce filtre.</p>
              </div>
            ) : (
              groupedByModule.map(([moduleId, group]) => (
                <div key={moduleId} style={{ marginBottom: "1.8rem" }}>
                  <div style={{
                    marginBottom: "0.7rem", paddingBottom: "0.5rem",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }}>
                    <span style={{ color: "#d4a843", fontWeight: 700, fontSize: "0.92rem" }}>
                      🧩 {group.titre}
                    </span>
                    <span style={{ color: "#666", fontSize: "0.78rem", marginLeft: "0.6rem" }}>
                      ({group.formation}) · {group.items.length} inscrit(s)
                    </span>
                  </div>

                  {group.items.map((i) => (
                    <div
                      key={i.id}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "0.85rem 1.1rem", marginBottom: "0.5rem",
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 10,
                      }}
                    >
                      <div>
                        <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.9rem" }}>
                          {i.user_name || "Utilisateur"}
                        </div>
                        <div style={{ color: "#666", fontSize: "0.75rem" }}>{i.user_email}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                        {statutBadge(i.statut)}
                        {i.statut !== "acceptée" && (
                          <button onClick={() => updateStatut(i.id, "acceptée")} style={{ ...smallBtnStyle, color: "#22c55e" }}>
                            ✓ Accepter
                          </button>
                        )}
                        {i.statut !== "refusée" && (
                          <button onClick={() => updateStatut(i.id, "refusée")} style={{ ...smallBtnStyle, color: "#ef4444" }}>
                            ✕ Refuser
                          </button>
                        )}
                        <button onClick={() => deleteInscription(i.id)} style={smallBtnStyle}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "0.55rem 0.8rem", borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.15)", background: "#1a1612",
  color: "#fff", fontSize: "0.88rem", boxSizing: "border-box",
};

const primaryBtnStyle = {
  padding: "0.6rem 1.3rem", borderRadius: 10, border: "none",
  background: "linear-gradient(135deg,#d4a843,#f0c060)", color: "#1a1206",
  fontWeight: 700, cursor: "pointer", fontSize: "0.85rem",
};

const secondaryBtnStyle = {
  padding: "0.6rem 1.3rem", borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.15)", background: "transparent",
  color: "#aaa", cursor: "pointer", fontSize: "0.85rem",
};

const smallBtnStyle = {
  padding: "0.4rem 0.7rem", borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
  color: "#aaa", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
};

export default AdminModules;