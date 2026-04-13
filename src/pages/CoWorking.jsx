import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Coworking.css";

const initialSalles = [
  { id: 1, nom: "Salle Sakura", capacite: 10, disponible: true },
  { id: 2, nom: "Salle Horizon", capacite: 20, disponible: true },
  { id: 3, nom: "Salle Zenith", capacite: 6, disponible: false },
];

const initialEmplacements = [
  { id: 1, nom: "Zone A - Open Space", salleId: 1, places: 10 },
  { id: 2, nom: "Zone B - Silence", salleId: 2, places: 8 },
  { id: 3, nom: "Zone C - Créatif", salleId: 2, places: 6 },
];

const initialTables = [
  { id: 1, nom: "Table 01", emplacementId: 1, statut: "Libre" },
  { id: 2, nom: "Table 02", emplacementId: 1, statut: "Occupée" },
  { id: 3, nom: "Table 03", emplacementId: 2, statut: "Libre" },
  { id: 4, nom: "Table 04", emplacementId: 3, statut: "Réservée" },
];

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
  const [activeTab, setActiveTab] = useState("Salles");

  const [salles, setSalles] = useState(initialSalles);
  const [emplacements, setEmplacements] = useState(initialEmplacements);
  const [tables, setTables] = useState(initialTables);
  const [reservations, setReservations] = useState([]);

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [reservModal, setReservModal] = useState(null); // { type: 'salle'|'table', item }
  const [reservForm, setReservForm] = useState({ date: "", heure_debut: "", heure_fin: "" });
  const [successMsg, setSuccessMsg] = useState("");

  const nextId = (arr) => arr.length ? Math.max(...arr.map(i => i.id)) + 1 : 1;

  const openAdd = (type) => { setForm({}); setModal({ type, mode: "add" }); };
  const openEdit = (type, data) => { setForm({ ...data }); setModal({ type, mode: "edit", data }); };
  const closeModal = () => { setModal(null); setForm({}); };

  const handleSave = () => {
    if (modal.type === "salle") {
      if (!form.nom || !form.capacite) return;
      if (modal.mode === "add") {
        setSalles(s => [...s, { id: nextId(s), nom: form.nom, capacite: Number(form.capacite), disponible: form.disponible !== false }]);
      } else {
        setSalles(s => s.map(x => x.id === modal.data.id ? { ...x, ...form, capacite: Number(form.capacite) } : x));
      }
    } else if (modal.type === "emplacement") {
      if (!form.nom || !form.salleId || !form.places) return;
      if (modal.mode === "add") {
        setEmplacements(e => [...e, { id: nextId(e), nom: form.nom, salleId: Number(form.salleId), places: Number(form.places) }]);
      } else {
        setEmplacements(e => e.map(x => x.id === modal.data.id ? { ...x, ...form, salleId: Number(form.salleId), places: Number(form.places) } : x));
      }
    } else if (modal.type === "table") {
      if (!form.nom || !form.emplacementId || !form.statut) return;
      if (modal.mode === "add") {
        setTables(t => [...t, { id: nextId(t), nom: form.nom, emplacementId: Number(form.emplacementId), statut: form.statut || "Libre" }]);
      } else {
        setTables(t => t.map(x => x.id === modal.data.id ? { ...x, ...form, emplacementId: Number(form.emplacementId) } : x));
      }
    }
    closeModal();
  };

  const handleDelete = () => {
    if (deleteConfirm.type === "salle") setSalles(s => s.filter(x => x.id !== deleteConfirm.id));
    if (deleteConfirm.type === "emplacement") setEmplacements(e => e.filter(x => x.id !== deleteConfirm.id));
    if (deleteConfirm.type === "table") setTables(t => t.filter(x => x.id !== deleteConfirm.id));
    setDeleteConfirm(null);
  };

  const openReserv = (type, item) => {
    setReservForm({ date: "", heure_debut: "", heure_fin: "" });
    setReservModal({ type, item });
  };

  const handleReserv = () => {
    if (!reservForm.date || !reservForm.heure_debut || !reservForm.heure_fin) return;
    const newR = {
      id: nextId(reservations),
      type: reservModal.type,
      itemId: reservModal.item.id,
      itemNom: reservModal.item.nom,
      user: user?.name || user?.email || "Utilisateur",
      date: reservForm.date,
      heure_debut: reservForm.heure_debut,
      heure_fin: reservForm.heure_fin,
      statut: "Confirmée",
    };
    setReservations(r => [...r, newR]);
    if (reservModal.type === "table") {
      setTables(t => t.map(x => x.id === reservModal.item.id ? { ...x, statut: "Réservée" } : x));
    }
    if (reservModal.type === "salle") {
      setSalles(s => s.map(x => x.id === reservModal.item.id ? { ...x, disponible: false } : x));
    }
    setReservModal(null);
    setSuccessMsg(`Réservation de "${newR.itemNom}" confirmée !`);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const annulerReservation = (id) => {
    const r = reservations.find(x => x.id === id);
    if (r) {
      if (r.type === "table") setTables(t => t.map(x => x.id === r.itemId ? { ...x, statut: "Libre" } : x));
      if (r.type === "salle") setSalles(s => s.map(x => x.id === r.itemId ? { ...x, disponible: true } : x));
    }
    setReservations(r => r.filter(x => x.id !== id));
  };

  const getSalleName = (id) => salles.find(s => s.id === id)?.nom || "—";
  const getEmplacementName = (id) => emplacements.find(e => e.id === id)?.nom || "—";

  const mesReservations = reservations.filter(r => r.user === (user?.name || user?.email || "Utilisateur"));

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
              {user.name || user.email || "Utilisateur"}
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
          <div className="cw-stat"><span>{mesReservations.length}</span>Réservations</div>
        </div>
      </div>

      {successMsg && (
        <div className="cw-success">{successMsg}</div>
      )}

      <div className="cw-tabs">
        {TABS.map(t => (
          <button key={t} className={`cw-tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
            {t}{t === "Mes Réservations" && mesReservations.length > 0 && (
              <span className="cw-tab-badge">{mesReservations.length}</span>
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
              <button className="cw-btn-add" onClick={() => openAdd("salle")}>+ Ajouter</button>
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
                  <div className="cw-card-actions">
                    <button className="cw-btn-edit" onClick={() => openEdit("salle", s)}>✏ Modifier</button>
                    <button className="cw-btn-del" onClick={() => setDeleteConfirm({ type: "salle", id: s.id, nom: s.nom })}>🗑</button>
                  </div>
                  {s.disponible && (
                    <button className="cw-btn-reserv" onClick={() => openReserv("salle", s)}>
                      📅 Réserver cette salle
                    </button>
                  )}
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
              <button className="cw-btn-add" onClick={() => openAdd("emplacement")}>+ Ajouter</button>
            </div>
            <div className="cw-grid">
              {emplacements.map((e, i) => (
                <div className="cw-card" key={e.id} style={{ animationDelay: `${i * 0.07}s` }}>
                  <div className="cw-card-top">
                    <div className="cw-card-icon">📍</div>
                    <span className="cw-badge badge--blue">{getSalleName(e.salleId)}</span>
                  </div>
                  <h3 className="cw-card-title">{e.nom}</h3>
                  <p className="cw-card-meta">Places : <strong>{e.places}</strong></p>
                  <div className="cw-card-actions">
                    <button className="cw-btn-edit" onClick={() => openEdit("emplacement", e)}>✏ Modifier</button>
                    <button className="cw-btn-del" onClick={() => setDeleteConfirm({ type: "emplacement", id: e.id, nom: e.nom })}>🗑</button>
                  </div>
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
              <button className="cw-btn-add" onClick={() => openAdd("table")}>+ Ajouter</button>
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
                  <p className="cw-card-meta">Emplacement : <strong>{getEmplacementName(t.emplacementId)}</strong></p>
                  <div className="cw-card-actions">
                    <button className="cw-btn-edit" onClick={() => openEdit("table", t)}>✏ Modifier</button>
                    <button className="cw-btn-del" onClick={() => setDeleteConfirm({ type: "table", id: t.id, nom: t.nom })}>🗑</button>
                  </div>
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
            {mesReservations.length === 0 ? (
              <div className="cw-empty">
                <div className="cw-empty-icon">📭</div>
                <p>Aucune réservation pour le moment.</p>
                <p className="cw-empty-sub">Allez dans Salles ou Tables pour réserver.</p>
              </div>
            ) : (
              <div className="cw-reserv-list">
                {mesReservations.map((r, i) => (
                  <div className="cw-reserv-card" key={r.id} style={{ animationDelay: `${i * 0.07}s` }}>
                    <div className="cw-reserv-left">
                      <div className="cw-reserv-icon">{r.type === "salle" ? "🏢" : "🪑"}</div>
                      <div>
                        <h3 className="cw-reserv-title">{r.itemNom}</h3>
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
            <select value={form.salleId || ""} onChange={e => setForm(f => ({ ...f, salleId: e.target.value }))}>
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
            <select value={form.emplacementId || ""} onChange={e => setForm(f => ({ ...f, emplacementId: e.target.value }))}>
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
        <Modal
          title={`Réserver — ${reservModal.item.nom}`}
          onClose={() => setReservModal(null)}
        >
          <div className="cw-form">
            <div className="cw-reserv-type-badge">
              {reservModal.type === "salle" ? "🏢 Salle" : "🪑 Table"}
            </div>
            <label>Date</label>
            <input
              type="date"
              value={reservForm.date}
              min={new Date().toISOString().split("T")[0]}
              onChange={e => setReservForm(f => ({ ...f, date: e.target.value }))}
            />
            <label>Heure de début</label>
            <input
              type="time"
              value={reservForm.heure_debut}
              onChange={e => setReservForm(f => ({ ...f, heure_debut: e.target.value }))}
            />
            <label>Heure de fin</label>
            <input
              type="time"
              value={reservForm.heure_fin}
              onChange={e => setReservForm(f => ({ ...f, heure_fin: e.target.value }))}
            />
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