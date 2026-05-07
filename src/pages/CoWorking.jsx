import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Coworking.css";

const API = "http://localhost:5000/api";
const getToken = () => localStorage.getItem("token");
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

const TABS = ["Salles", "Emplacements", "Tables", "Mes Réservations"];

function Modal({ title, onClose, children }) {
  return (
    <div className="cw-overlay">
      <div className="cw-modal">
        <div className="cw-modal-header">
          <h2 className="cw-modal-title">{title}</h2>
          <button className="cw-modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Coworking({ user }) {
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [activeTab, setActiveTab] = useState("Salles");

  const [salles, setSalles] = useState([]);
  const [emplacements, setEmplacements] = useState([]);
  const [tables, setTables] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [reservModal, setReservModal] = useState(null);
  const [reservForm, setReservForm] = useState({ date: "", heure_debut: "", heure_fin: "" });

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3500); };

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, e, t, r] = await Promise.all([
        fetch(`${API}/coworking/salles`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/coworking/emplacements`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/coworking/tables`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/coworking/reservations/me`, { headers: authHeaders() }).then(r => r.json()),
      ]);
      setSalles(s.salles || []);
      setEmplacements(e.emplacements || []);
      setTables(t.tables || []);
      setReservations(r.reservations || []);
    } catch (err) {
      setError("Impossible de charger les données. Vérifiez que le serveur est démarré.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── CRUD helpers ───────────────────────────────────────────────────────────
  const openAdd = (type) => { setForm({}); setModal({ type, mode: "add" }); };
  const openEdit = (type, data) => { setForm({ ...data }); setModal({ type, mode: "edit", data }); };
  const closeModal = () => { setModal(null); setForm({}); };

  const handleSave = async () => {
    let url, body;
    const isEdit = modal.mode === "edit";

    if (modal.type === "salle") {
      if (!form.nom || !form.capacite) return;
      url = isEdit ? `${API}/coworking/salles/${modal.data.id}` : `${API}/coworking/salles`;
      body = { nom: form.nom, capacite: Number(form.capacite), disponible: form.disponible !== false };
    } else if (modal.type === "emplacement") {
      if (!form.nom || !form.salle_id || !form.places) return;
      url = isEdit ? `${API}/coworking/emplacements/${modal.data.id}` : `${API}/coworking/emplacements`;
      body = { nom: form.nom, salle_id: Number(form.salle_id), places: Number(form.places) };
    } else if (modal.type === "table") {
      if (!form.nom || !form.emplacement_id || !form.statut) return;
      url = isEdit ? `${API}/coworking/tables/${modal.data.id}` : `${API}/coworking/tables`;
      body = { nom: form.nom, emplacement_id: Number(form.emplacement_id), statut: form.statut || "Libre" };
    }

    try {
      await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      closeModal();
      fetchAll();
      showSuccess(isEdit ? "Modification enregistrée." : "Élément ajouté avec succès.");
    } catch {
      setError("Erreur lors de l'enregistrement.");
    }
  };

  const handleDelete = async () => {
    const { type, id } = deleteConfirm;
    const endpoints = { salle: "salles", emplacement: "emplacements", table: "tables" };
    try {
      await fetch(`${API}/coworking/${endpoints[type]}/${id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      setDeleteConfirm(null);
      fetchAll();
      showSuccess("Suppression effectuée.");
    } catch {
      setError("Erreur lors de la suppression.");
    }
  };

  // ── Réservations ───────────────────────────────────────────────────────────
  const openReserv = (type, item) => {
    setReservForm({ date: "", heure_debut: "", heure_fin: "" });
    setReservModal({ type, item });
  };

  const handleReserv = async () => {
    if (!reservForm.date || !reservForm.heure_debut || !reservForm.heure_fin) return;
    try {
      const res = await fetch(`${API}/coworking/reservations`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          type: reservModal.type,
          item_id: reservModal.item.id,
          item_nom: reservModal.item.nom,
          date: reservForm.date,
          heure_debut: reservForm.heure_debut,
          heure_fin: reservForm.heure_fin,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.message || "Erreur de réservation.");
        return;
      }
      setReservModal(null);
      fetchAll();
      showSuccess(`Réservation de "${reservModal.item.nom}" confirmée !`);
    } catch {
      setError("Impossible de réserver. Réessayez.");
    }
  };

  const annulerReservation = async (id) => {
    try {
      await fetch(`${API}/coworking/reservations/${id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      fetchAll();
      showSuccess("Réservation annulée.");
    } catch {
      setError("Erreur lors de l'annulation.");
    }
  };

  const getSalleName = (id) => salles.find(s => s.id === id)?.nom || "—";
  const getEmplacementName = (id) => emplacements.find(e => e.id === id)?.nom || "—";

  if (loading) return (
    <div className="cw-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="bg-glow" /><div className="bg-glow2" />
      <p style={{ color: "#fff", fontSize: "1.2rem" }}>⏳ Chargement...</p>
    </div>
  );

  return (
    <div className="cw-page">
      <div className="bg-glow" />
      <div className="bg-glow2" />

      <nav className="navbar">
        <div className="navbar-brand">
          <div className="brand-icon">⚡</div>
          <span className="brand-name">TZ Prime Solutions</span>
        </div>
        <div className="navbar-links">
          {user && (
            <div className="navbar-user">
              <span className="user-dot" />
              {user.name || user.email}
              {isAdmin && <span style={{ marginLeft: 6, fontSize: "0.7rem", opacity: 0.7 }}>({user.role})</span>}
            </div>
          )}
          <button className="btn-back" onClick={() => navigate("/choose-services")}>
            <span className="back-arrow">←</span> Retour
          </button>
        </div>
      </nav>

      <div className="cw-hero">
        <div>
          <p className="hero-eyebrow">Espace de travail</p>
          <h1 className="hero-title">Coworking</h1>
          <p className="hero-subtitle">Gérez et réservez vos salles, emplacements et tables</p>
          <div className="hero-divider" />
        </div>
        <div className="cw-stats">
          <div className="cw-stat"><span>{salles.length}</span>Salles</div>
          <div className="cw-stat"><span>{emplacements.length}</span>Emplacements</div>
          <div className="cw-stat"><span>{tables.length}</span>Tables</div>
          <div className="cw-stat"><span>{reservations.length}</span>Réservations</div>
        </div>
      </div>

      {error && <div className="cw-success" style={{ background: "rgba(239,68,68,0.15)", borderColor: "#ef4444" }}>{error} <button onClick={() => setError("")} style={{ marginLeft: 8, background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>✕</button></div>}
      {successMsg && <div className="cw-success">{successMsg}</div>}

      <div className="cw-tabs">
        {TABS.map(t => (
          <button key={t} className={`cw-tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
            {t}{t === "Mes Réservations" && reservations.length > 0 && (
              <span className="cw-tab-badge">{reservations.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="cw-content">

        {/* ── SALLES ── */}
        {activeTab === "Salles" && (
          <>
            <div className="cw-toolbar">
              <h2 className="cw-section-title">Liste des salles</h2>
              {isAdmin && <button className="cw-btn-add" onClick={() => openAdd("salle")}>+ Ajouter</button>}
            </div>
            <div className="cw-grid">
              {salles.map((s, i) => (
                <div className="cw-card" key={s.id} style={{ animationDelay: `${i * 0.07}s` }}>
                  <div className="cw-card-top">
                    <div className="cw-card-icon">🏢</div>
                    <span className={`cw-badge ${s.disponible ? "badge--green" : "badge--red"}`}>
                      {s.disponible ? "Disponible" : "Indisponible"}
                    </span>
                  </div>
                  <h3 className="cw-card-title">{s.nom}</h3>
                  <p className="cw-card-meta">Capacité : <strong>{s.capacite} personnes</strong></p>
                  {isAdmin && (
                    <div className="cw-card-actions">
                      <button className="cw-btn-edit" onClick={() => openEdit("salle", { ...s, disponible: !!s.disponible })}>✏ Modifier</button>
                      <button className="cw-btn-del" onClick={() => setDeleteConfirm({ type: "salle", id: s.id, nom: s.nom })}>🗑</button>
                    </div>
                  )}
                  {s.disponible ? (
                    <button className="cw-btn-reserv" onClick={() => openReserv("salle", s)}>
                      📅 Réserver cette salle
                    </button>
                  ) : null}
                  <div className="cw-card-line" />
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── EMPLACEMENTS ── */}
        {activeTab === "Emplacements" && (
          <>
            <div className="cw-toolbar">
              <h2 className="cw-section-title">Liste des emplacements</h2>
              {isAdmin && <button className="cw-btn-add" onClick={() => openAdd("emplacement")}>+ Ajouter</button>}
            </div>
            <div className="cw-grid">
              {emplacements.map((e, i) => (
                <div className="cw-card" key={e.id} style={{ animationDelay: `${i * 0.07}s` }}>
                  <div className="cw-card-top">
                    <div className="cw-card-icon">📍</div>
                    <span className="cw-badge badge--blue">{e.salle_nom || getSalleName(e.salle_id)}</span>
                  </div>
                  <h3 className="cw-card-title">{e.nom}</h3>
                  <p className="cw-card-meta">Places : <strong>{e.places}</strong></p>
                  {isAdmin && (
                    <div className="cw-card-actions">
                      <button className="cw-btn-edit" onClick={() => openEdit("emplacement", e)}>✏ Modifier</button>
                      <button className="cw-btn-del" onClick={() => setDeleteConfirm({ type: "emplacement", id: e.id, nom: e.nom })}>🗑</button>
                    </div>
                  )}
                  <div className="cw-card-line" />
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── TABLES ── */}
        {activeTab === "Tables" && (
          <>
            <div className="cw-toolbar">
              <h2 className="cw-section-title">Liste des tables</h2>
              {isAdmin && <button className="cw-btn-add" onClick={() => openAdd("table")}>+ Ajouter</button>}
            </div>
            <div className="cw-grid">
              {tables.map((t, i) => (
                <div className="cw-card" key={t.id} style={{ animationDelay: `${i * 0.07}s` }}>
                  <div className="cw-card-top">
                    <div className="cw-card-icon">🪑</div>
                    <span className={`cw-badge ${t.statut === "Libre" ? "badge--green" : t.statut === "Occupée" ? "badge--red" : "badge--amber"}`}>
                      {t.statut}
                    </span>
                  </div>
                  <h3 className="cw-card-title">{t.nom}</h3>
                  <p className="cw-card-meta">Emplacement : <strong>{t.emplacement_nom || getEmplacementName(t.emplacement_id)}</strong></p>
                  {isAdmin && (
                    <div className="cw-card-actions">
                      <button className="cw-btn-edit" onClick={() => openEdit("table", t)}>✏ Modifier</button>
                      <button className="cw-btn-del" onClick={() => setDeleteConfirm({ type: "table", id: t.id, nom: t.nom })}>🗑</button>
                    </div>
                  )}
                  {t.statut === "Libre" && (
                    <button className="cw-btn-reserv" onClick={() => openReserv("table", t)}>
                      📅 Réserver cette table
                    </button>
                  )}
                  <div className="cw-card-line" />
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── MES RÉSERVATIONS ── */}
        {activeTab === "Mes Réservations" && (
          <>
            <div className="cw-toolbar">
              <h2 className="cw-section-title">Mes réservations</h2>
            </div>
            {reservations.length === 0 ? (
              <div className="cw-empty">
                <div className="cw-empty-icon">📭</div>
                <p>Aucune réservation pour le moment.</p>
                <p className="cw-empty-sub">Allez dans Salles ou Tables pour réserver.</p>
              </div>
            ) : (
              <div className="cw-reserv-list">
                {reservations.map((r, i) => (
                  <div className="cw-reserv-card" key={r.id} style={{ animationDelay: `${i * 0.07}s` }}>
                    <div className="cw-reserv-left">
                      <div className="cw-reserv-icon">{r.type === "salle" ? "🏢" : "🪑"}</div>
                      <div>
                        <h3 className="cw-reserv-title">{r.item_nom}</h3>
                        <p className="cw-reserv-meta">
                          <span className={`cw-badge ${r.type === "salle" ? "badge--blue" : "badge--amber"}`}>
                            {r.type === "salle" ? "Salle" : "Table"}
                          </span>
                          <span className="cw-reserv-date">📅 {r.date}</span>
                          <span className="cw-reserv-time">⏱ {r.heure_debut} – {r.heure_fin}</span>
                        </p>
                      </div>
                    </div>
                    <div className="cw-reserv-right">
                      <span className="cw-badge badge--green">{r.statut}</span>
                      <button className="cw-btn-annuler" onClick={() => annulerReservation(r.id)}>Annuler</button>
                    </div>
                    <div className="cw-card-line" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODAL CRUD Salle ── */}
      {modal?.type === "salle" && (
        <Modal title={modal.mode === "add" ? "Ajouter une salle" : "Modifier la salle"} onClose={closeModal}>
          <div className="cw-form">
            <label>Nom de la salle</label>
            <input type="text" placeholder="Ex: Salle Sakura" value={form.nom || ""} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
            <label>Capacité (personnes)</label>
            <input type="number" min="1" placeholder="Ex: 10" value={form.capacite || ""} onChange={e => setForm(f => ({ ...f, capacite: e.target.value }))} />
            <label>Disponibilité</label>
            <select value={form.disponible === false ? "false" : "true"} onChange={e => setForm(f => ({ ...f, disponible: e.target.value === "true" }))}>
              <option value="true">Disponible</option>
              <option value="false">Indisponible</option>
            </select>
            <div className="cw-form-actions">
              <button className="cw-btn-cancel" onClick={closeModal}>Annuler</button>
              <button className="cw-btn-save" onClick={handleSave}>Enregistrer</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL CRUD Emplacement ── */}
      {modal?.type === "emplacement" && (
        <Modal title={modal.mode === "add" ? "Ajouter un emplacement" : "Modifier l'emplacement"} onClose={closeModal}>
          <div className="cw-form">
            <label>Nom de l'emplacement</label>
            <input type="text" placeholder="Ex: Zone A - Open Space" value={form.nom || ""} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
            <label>Salle</label>
            <select value={form.salle_id || ""} onChange={e => setForm(f => ({ ...f, salle_id: e.target.value }))}>
              <option value="">-- Choisir une salle --</option>
              {salles.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
            <label>Nombre de places</label>
            <input type="number" min="1" placeholder="Ex: 8" value={form.places || ""} onChange={e => setForm(f => ({ ...f, places: e.target.value }))} />
            <div className="cw-form-actions">
              <button className="cw-btn-cancel" onClick={closeModal}>Annuler</button>
              <button className="cw-btn-save" onClick={handleSave}>Enregistrer</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL CRUD Table ── */}
      {modal?.type === "table" && (
        <Modal title={modal.mode === "add" ? "Ajouter une table" : "Modifier la table"} onClose={closeModal}>
          <div className="cw-form">
            <label>Nom de la table</label>
            <input type="text" placeholder="Ex: Table 05" value={form.nom || ""} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
            <label>Emplacement</label>
            <select value={form.emplacement_id || ""} onChange={e => setForm(f => ({ ...f, emplacement_id: e.target.value }))}>
              <option value="">-- Choisir un emplacement --</option>
              {emplacements.map(em => <option key={em.id} value={em.id}>{em.nom}</option>)}
            </select>
            <label>Statut</label>
            <select value={form.statut || "Libre"} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
              <option value="Libre">Libre</option>
              <option value="Occupée">Occupée</option>
              <option value="Réservée">Réservée</option>
            </select>
            <div className="cw-form-actions">
              <button className="cw-btn-cancel" onClick={closeModal}>Annuler</button>
              <button className="cw-btn-save" onClick={handleSave}>Enregistrer</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL RÉSERVATION ── */}
      {reservModal && (
        <Modal title={`Réserver — ${reservModal.item.nom}`} onClose={() => setReservModal(null)}>
          <div className="cw-form">
            <div className="cw-reserv-type-badge">
              {reservModal.type === "salle" ? "🏢 Salle" : "🪑 Table"}
            </div>
            <label>Date</label>
            <input type="date" value={reservForm.date} min={new Date().toISOString().split("T")[0]}
              onChange={e => setReservForm(f => ({ ...f, date: e.target.value }))} />
            <label>Heure de début</label>
            <input type="time" value={reservForm.heure_debut}
              onChange={e => setReservForm(f => ({ ...f, heure_debut: e.target.value }))} />
            <label>Heure de fin</label>
            <input type="time" value={reservForm.heure_fin}
              onChange={e => setReservForm(f => ({ ...f, heure_fin: e.target.value }))} />
            <div className="cw-form-actions">
              <button className="cw-btn-cancel" onClick={() => setReservModal(null)}>Annuler</button>
              <button className="cw-btn-save" onClick={handleReserv}>Confirmer</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteConfirm && (
        <Modal title="Confirmer la suppression" onClose={() => setDeleteConfirm(null)}>
          <div className="cw-form">
            <p className="cw-delete-msg">Voulez-vous supprimer <strong>{deleteConfirm.nom}</strong> ?</p>
            <div className="cw-form-actions">
              <button className="cw-btn-cancel" onClick={() => setDeleteConfirm(null)}>Annuler</button>
              <button className="cw-btn-del-confirm" onClick={handleDelete}>Supprimer</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Coworking;