import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Coworking.css";

const API = "http://localhost:5000/api";
// NOTE BACKEND : voir le commentaire détaillé au-dessus de fetchDisponibilite()
// pour le contrat attendu de GET /coworking/reservations/disponibilite.
const getToken = () => sessionStorage.getItem("token");
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

const ALL_TABS = ["Salles", "Emplacements", "Tables", "Mes Réservations"];

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
  // Admins manage reservations from the AdminDashboard — hide that tab here
  const TABS = isAdmin
    ? ALL_TABS.filter(t => t !== "Mes Réservations")
    : ALL_TABS;
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
  // `dates` remplace l'ancien champ unique `date` : l'utilisateur peut sélectionner
  // 1 ou plusieurs jours dans le mini-calendrier de réservation.
  const [reservForm, setReservForm] = useState({ dates: [], heure_debut: "", heure_fin: "", table_ids: [] });
  const [calCursor, setCalCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [occupiedSlots, setOccupiedSlots] = useState([]); // créneaux {date, heure_debut, heure_fin, statut} déjà pris pour l'item en cours
  const [loadingDispo, setLoadingDispo] = useState(false);
  const tablesListRef = useRef(null);
  const scrollTablesList = (dir) => {
    tablesListRef.current?.scrollBy({ top: dir * 90, behavior: "smooth" });
  };

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
      body = {
        nom: form.nom,
        capacite: Number(form.capacite),
        disponible: form.disponible !== false,
        tarif_horaire: Number(form.tarif_horaire) || 0,
      };
    } else if (modal.type === "emplacement") {
      if (!form.nom || !form.salle_id || !form.places) return;
      url = isEdit ? `${API}/coworking/emplacements/${modal.data.id}` : `${API}/coworking/emplacements`;
      body = { nom: form.nom, salle_id: Number(form.salle_id), places: Number(form.places) };
    } else if (modal.type === "table") {
      if (!form.nom || !form.emplacement_id || !form.statut) return;
      url = isEdit ? `${API}/coworking/tables/${modal.data.id}` : `${API}/coworking/tables`;
      body = {
        nom: form.nom,
        emplacement_id: Number(form.emplacement_id),
        statut: form.statut || "Libre",
        tarif_horaire: Number(form.tarif_horaire) || 0,
      };
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
  const dateToStr = (d) => {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Convertit "HH:MM" en minutes depuis minuit, pour comparer des créneaux.
  const toMinutes = (hhmm) => {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };

  // Deux créneaux [aDebut,aFin) et [bDebut,bFin) se chevauchent si l'un
  // commence avant que l'autre ne finisse, dans les deux sens.
  const creneauxSeChevauchent = (aDebut, aFin, bDebut, bFin) => {
    const a1 = toMinutes(aDebut), a2 = toMinutes(aFin);
    const b1 = toMinutes(bDebut), b2 = toMinutes(bFin);
    if (a1 == null || a2 == null || b1 == null || b2 == null) return false;
    return a1 < b2 && b1 < a2;
  };

  // NOTE BACKEND : cette page appelle GET `${API}/coworking/reservations/disponibilite?type=salle|table&item_id=ID`
  // qui doit désormais renvoyer, pour CET item, TOUS utilisateurs confondus :
  //   { creneaux: [ { date: "2026-07-21", heure_debut: "09:00", heure_fin: "12:00", statut: "acceptée" }, ... ] }
  // en excluant uniquement les réservations "refusée". Chaque créneau confirmé
  // ("acceptée") doit interdire côté serveur toute nouvelle réservation qui le
  // chevauche (même logique que le contrôle fait ici côté client, à dupliquer
  // côté API pour éviter les doubles réservations en cas de requêtes simultanées).
  // Compatibilité : si l'API renvoie encore l'ancien format `{ dates: [...] }`
  // (jours entiers bloqués), on le convertit en créneaux "toute la journée".
  // Fonction pure : récupère les créneaux occupés pour un item, sans toucher
  // au state. Réutilisée par fetchDisponibilite (affichage calendrier) et par
  // handleReserv (revérification fraîche juste avant l'envoi, pour réduire le
  // risque de double réservation en cas de requêtes concurrentes).
  const fetchOccupiedSlots = async (type, item) => {
    try {
      const res = await fetch(
        `${API}/coworking/reservations/disponibilite?type=${type}&item_id=${item.id}`,
        { headers: authHeaders() }
      );
      if (!res.ok) return [];
      const d = await res.json();
      if (Array.isArray(d.creneaux)) return d.creneaux;
      if (Array.isArray(d.dates)) {
        return d.dates.map((date) => ({ date, heure_debut: "00:00", heure_fin: "23:59", statut: "acceptée" }));
      }
      return [];
    } catch {
      return [];
    }
  };

  const fetchDisponibilite = async (type, item) => {
    setLoadingDispo(true);
    setOccupiedSlots([]);
    const slots = await fetchOccupiedSlots(type, item);
    setOccupiedSlots(slots);
    setLoadingDispo(false);
  };

  // Créneaux confirmés ("acceptée") pour une date donnée — ce sont les seuls
  // qui interdisent une nouvelle réservation sur le même horaire.
  const creneauxConfirmesDuJour = (dateStr) =>
    occupiedSlots.filter((c) => c.date === dateStr && c.statut === "acceptée");


  // Un jour est entièrement indisponible seulement s'il est couvert par un
  // créneau confirmé "toute la journée" (ancien format de compat, ou blocage
  // explicite). Sinon le jour reste sélectionnable ; c'est l'horaire choisi
  // qui déterminera un éventuel conflit.
  const isJourneeEntierementBloquee = (dateStr) =>
    creneauxConfirmesDuJour(dateStr).some((c) => c.heure_debut === "00:00" && c.heure_fin === "23:59");

  // Détecte un chevauchement entre (heureDebut, heureFin) et les créneaux
  // CONFIRMÉS de `slots` pour la date donnée. Fonction générique réutilisable
  // avec le state (affichage) ou une liste fraîchement refetchée (revérification).
  const conflitDansCreneaux = (slots, dateStr, heureDebut, heureFin) =>
    slots
      .filter((c) => c.date === dateStr && c.statut === "acceptée")
      .some((c) => creneauxSeChevauchent(heureDebut, heureFin, c.heure_debut, c.heure_fin));

  // Vrai si l'horaire choisi chevauche un créneau CONFIRMÉ existant ce jour-là
  // (basé sur les créneaux déjà chargés dans le state, pour l'affichage live).
  const aConflitConfirme = (dateStr, heureDebut, heureFin) =>
    conflitDansCreneaux(occupiedSlots, dateStr, heureDebut, heureFin);

  const openReserv = (type, item) => {
    setReservForm({ dates: [], heure_debut: "", heure_fin: "", table_ids: [] });
    const d = new Date(); d.setDate(1);
    setCalCursor(d);
    setReservModal({ type, item });
    fetchDisponibilite(type, item);
  };

  const toggleReservDate = (dateStr) => {
    if (isJourneeEntierementBloquee(dateStr)) return;
    const todayStr = dateToStr(new Date());
    if (dateStr < todayStr) return;
    setReservForm((f) => {
      const already = f.dates.includes(dateStr);
      const dates = already ? f.dates.filter((d) => d !== dateStr) : [...f.dates, dateStr].sort();
      return { ...f, dates };
    });
  };

  const toggleReservTable = (tableId) => {
    setReservForm(f => {
      const already = f.table_ids.includes(tableId);
      return {
        ...f,
        table_ids: already
          ? f.table_ids.filter(id => id !== tableId)
          : [...f.table_ids, tableId],
      };
    });
  };

  const handleReserv = async () => {
    if (reservForm.dates.length === 0 || !reservForm.heure_debut || !reservForm.heure_fin) {
      setError("Choisissez au moins un jour et un horaire.");
      return;
    }
    const nbHeures = calculerNbHeures(reservForm.heure_debut, reservForm.heure_fin);
    if (nbHeures <= 0) {
      setError("L'heure de fin doit être après l'heure de début.");
      return;
    }
    // Sécurité : on revérifie — avec des données fraîches — qu'aucune des
    // dates/horaires choisis n'est entre-temps devenue indisponible (créneau
    // confirmé par un autre utilisateur pendant que ce formulaire était ouvert).
    const freshSlots = await fetchOccupiedSlots(reservModal.type, reservModal.item);
    setOccupiedSlots(freshSlots);
    const conflits = reservForm.dates.filter((d) =>
      conflitDansCreneaux(freshSlots, d, reservForm.heure_debut, reservForm.heure_fin)
    );
    if (conflits.length > 0) {
      setError(`Ce créneau (${reservForm.heure_debut}–${reservForm.heure_fin}) vient d'être confirmé pour un autre utilisateur sur : ${conflits.join(", ")}. Merci de changer d'horaire ou de désélectionner ces jours.`);
      return;
    }
    const frais = calculerFrais(
      reservModal.type,
      reservModal.item,
      reservForm.heure_debut,
      reservForm.heure_fin,
      reservForm.table_ids
    );

    const reussies = [];
    const echouees = [];
    for (const date of reservForm.dates) {
      try {
        const res = await fetch(`${API}/coworking/reservations`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            type: reservModal.type,
            item_id: reservModal.item.id,
            item_nom: reservModal.item.nom,
            date,
            heure_debut: reservForm.heure_debut,
            heure_fin: reservForm.heure_fin,
            statut: "en_attente",
            table_ids: reservModal.type === "salle" ? reservForm.table_ids : [],
            nb_heures: nbHeures,
            frais,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          echouees.push({ date, message: d?.message || "déjà indisponible" });
        } else {
          reussies.push(date);
        }
      } catch {
        echouees.push({ date, message: "erreur réseau" });
      }
    }

    fetchAll();
    if (reussies.length > 0) {
      setReservModal(null);
      const jours = reussies.length > 1 ? `${reussies.length} jours` : "1 jour";
      showSuccess(
        `Demande de réservation pour "${reservModal.item.nom}" envoyée pour ${jours} — en attente de validation par l'admin.` +
        (echouees.length > 0 ? ` (${echouees.length} jour(s) déjà indisponible(s) n'ont pas été réservés.)` : "")
      );
    } else {
      setError(`Aucune réservation créée — les jours choisis sont déjà indisponibles.`);
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

  // ── Calcul du frais de réservation ───────────────────────────────────────
  // Nombre d'heures (décimal) entre deux horaires "HH:MM"
  const calculerNbHeures = (heureDebut, heureFin) => {
    if (!heureDebut || !heureFin) return 0;
    const [h1, m1] = heureDebut.split(":").map(Number);
    const [h2, m2] = heureFin.split(":").map(Number);
    const minutes = (h2 * 60 + m2) - (h1 * 60 + m1);
    return minutes > 0 ? minutes / 60 : 0;
  };

  // Tarif horaire de l'élément réservé (salle ou table). Si une table n'a
  // pas de tarif propre, on retombe sur le tarif de la salle qui la contient.
  const getTarifHoraire = (type, item) => {
    if (!item) return 0;
    if (type === "table") {
      if (item.tarif_horaire) return Number(item.tarif_horaire);
      const emplacement = emplacements.find(e => e.id === item.emplacement_id);
      const salle = salles.find(s => s.id === emplacement?.salle_id);
      return Number(salle?.tarif_horaire) || 0;
    }
    return Number(item.tarif_horaire) || 0;
  };

  // Frais total = tarif horaire × nombre d'heures
  // Pour une salle réservée avec des tables spécifiques sélectionnées,
  // chaque table sélectionnée ajoute son propre tarif horaire (si défini)
  // en plus du tarif de base de la salle.
  const calculerFrais = (type, item, heureDebut, heureFin, tableIds = []) => {
    const nbHeures = calculerNbHeures(heureDebut, heureFin);
    if (nbHeures <= 0 || !item) return 0;

    if (type === "salle") {
      const tarifSalle = Number(item.tarif_horaire) || 0;
      const tarifTables = tableIds.reduce((sum, id) => {
        const t = tables.find(tb => tb.id === id);
        return sum + (Number(t?.tarif_horaire) || 0);
      }, 0);
      return +((tarifSalle + tarifTables) * nbHeures).toFixed(2);
    }

    return +(getTarifHoraire(type, item) * nbHeures).toFixed(2);
  };

  // Tables appartenant à une salle donnée (via ses emplacements)
  const getTablesOfSalle = (salleId) => {
    const empIds = emplacements.filter(e => e.salle_id === salleId).map(e => e.id);
    return tables.filter(t => empIds.includes(t.emplacement_id));
  };

  if (loading) return (
    <div className="cw-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="bg-glow" /><div className="bg-glow2" />
      <p style={{ color: "#fff", fontSize: "1.2rem" }}>⏳ Chargement...</p>
    </div>
  );

  return (
    <div className="cw-page">
      <style>{`
        html { scrollbar-width: thin; scrollbar-color: #c7cdd6 transparent; }
        html::-webkit-scrollbar, body::-webkit-scrollbar { width: 10px; }
        html::-webkit-scrollbar-track, body::-webkit-scrollbar-track { background: transparent; }
        html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb { background: #c7cdd6; border-radius: 8px; }
        html::-webkit-scrollbar-thumb:hover, body::-webkit-scrollbar-thumb:hover { background: #a8b0bd; }
        .cw-scroll-thin::-webkit-scrollbar { width: 6px; }
        .cw-scroll-thin::-webkit-scrollbar-track { background: transparent; }
        .cw-scroll-thin::-webkit-scrollbar-thumb { background: #c7cdd6; border-radius: 6px; }
        .cw-scroll-thin::-webkit-scrollbar-thumb:hover { background: #a8b0bd; }
        .cw-scroll-thin { scrollbar-width: thin; scrollbar-color: #c7cdd6 transparent; }
      `}</style>
      <div className="bg-glow" />
      <div className="bg-glow2" />

      <nav className="navbar">
        <div className="navbar-brand">
          <div className="brand-icon">⚡</div>
          <span className="brand-name">TZ Prime Solutions</span>
        </div>
        <div className="navbar-links">
          {user && (
            <div
              className="navbar-user"
              onClick={() => navigate("/services")}
              style={{ cursor: "pointer" }}
              title="Retour aux services"
            >
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
          {!isAdmin && <div className="cw-stat"><span>{reservations.length}</span>Réservations</div>}
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
                  <p className="cw-card-meta">Tarif : <strong>{Number(s.tarif_horaire) || 0} DT/h</strong></p>
                  {isAdmin && (
                    <div className="cw-card-actions">
                      <button className="cw-btn-edit" onClick={() => openEdit("salle", { ...s, disponible: !!s.disponible })}>✏ Modifier</button>
                      <button className="cw-btn-del" onClick={() => setDeleteConfirm({ type: "salle", id: s.id, nom: s.nom })}>🗑</button>
                    </div>
                  )}
                  {!isAdmin && s.disponible ? (
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
                  <p className="cw-card-meta">Tarif : <strong>{getTarifHoraire("table", t)} DT/h</strong></p>
                  {isAdmin && (
                    <div className="cw-card-actions">
                      <button className="cw-btn-edit" onClick={() => openEdit("table", t)}>✏ Modifier</button>
                      <button className="cw-btn-del" onClick={() => setDeleteConfirm({ type: "table", id: t.id, nom: t.nom })}>🗑</button>
                    </div>
                  )}
                  {!isAdmin && t.statut === "Libre" && (
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
                          <span className="cw-reserv-frais">💰 {r.frais != null ? r.frais : calculerFrais(r.type, r.type === "salle" ? salles.find(s => s.id === r.item_id) : tables.find(t => t.id === r.item_id), r.heure_debut, r.heure_fin, r.table_ids || [])} DT</span>
                        </p>
                        {r.type === "salle" && Array.isArray(r.table_ids) && r.table_ids.length > 0 && (
                          <p className="cw-reserv-meta" style={{ marginTop: 4 }}>
                            🪑 Tables : {r.table_ids
                              .map(id => tables.find(t => t.id === id)?.nom || `#${id}`)
                              .join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="cw-reserv-right">
                      <span className={`cw-badge ${
                        r.statut === "acceptée" ? "badge--green" :
                        r.statut === "refusée" ? "badge--red" :
                        "badge--amber"
                      }`}>
                        {r.statut === "acceptée" ? "✅ Acceptée" :
                         r.statut === "refusée"  ? "❌ Refusée"  :
                         "⏳ En attente"}
                      </span>
                      {r.statut !== "refusée" && (
                        <button className="cw-btn-annuler" onClick={() => annulerReservation(r.id)}>Annuler</button>
                      )}
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
            <label>Tarif horaire (DT/h)</label>
            <input type="number" min="0" step="0.5" placeholder="Ex: 20" value={form.tarif_horaire === undefined || form.tarif_horaire === null ? "" : form.tarif_horaire} onChange={e => setForm(f => ({ ...f, tarif_horaire: e.target.value }))} />
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
            <label>Tarif horaire (DT/h)</label>
            <input type="number" min="0" step="0.5" placeholder="Laisser vide pour utiliser le tarif de la salle" value={form.tarif_horaire === undefined || form.tarif_horaire === null ? "" : form.tarif_horaire} onChange={e => setForm(f => ({ ...f, tarif_horaire: e.target.value }))} />
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
          <div className="cw-form cw-scroll-thin" style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 6 }}>
            <div className="cw-reserv-type-badge">
              {reservModal.type === "salle" ? "🏢 Salle" : "🪑 Table"}
            </div>
            <label>Jour(s) à réserver {reservForm.dates.length > 0 && `(${reservForm.dates.length} sélectionné${reservForm.dates.length > 1 ? "s" : ""})`}</label>
            {loadingDispo && (
              <p style={{ fontSize: "0.78rem", opacity: 0.7, margin: "2px 0 8px" }}>⏳ Vérification des disponibilités…</p>
            )}
            {(() => {
              const todayStr = dateToStr(new Date());
              const monthLabel = calCursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
              const year = calCursor.getFullYear(), month = calCursor.getMonth();
              const firstOfMonth = new Date(year, month, 1);
              const startOffset = (firstOfMonth.getDay() + 6) % 7; // lundi = 0
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const cells = [];
              for (let i = 0; i < startOffset; i++) cells.push(null);
              for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

              const prevMonth = () => setCalCursor(new Date(year, month - 1, 1));
              const nextMonth = () => setCalCursor(new Date(year, month + 1, 1));
              const minMonth = new Date(); minMonth.setDate(1);
              const canGoPrev = new Date(year, month, 1) > minMonth;

              return (
                <div style={{
                  border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, padding: "8px 10px", marginBottom: 4,
                  maxWidth: 260,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <button type="button" onClick={prevMonth} disabled={!canGoPrev}
                      style={{ border: "none", background: "transparent", cursor: canGoPrev ? "pointer" : "default", opacity: canGoPrev ? 1 : 0.3, fontSize: "0.9rem", padding: 2, lineHeight: 1 }}>‹</button>
                    <strong style={{ textTransform: "capitalize", fontSize: "0.76rem" }}>{monthLabel}</strong>
                    <button type="button" onClick={nextMonth}
                      style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "0.9rem", padding: 2, lineHeight: 1 }}>›</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, fontSize: "0.58rem", opacity: 0.6, marginBottom: 3, textAlign: "center" }}>
                    {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i}>{d}</span>)}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
                    {cells.map((d, i) => {
                      if (!d) return <span key={i} />;
                      const dStr = dateToStr(d);
                      const isPast = dStr < todayStr;
                      const journeeBloquee = isJourneeEntierementBloquee(dStr);
                      // Conflit avec l'horaire actuellement choisi (si déjà renseigné) :
                      // le jour reste sélectionnable tant qu'aucun horaire n'est fixé,
                      // mais on prévient dès qu'un chevauchement avec un créneau
                      // confirmé est détecté pour l'horaire en cours de saisie.
                      const conflitHoraire =
                        reservForm.heure_debut && reservForm.heure_fin &&
                        aConflitConfirme(dStr, reservForm.heure_debut, reservForm.heure_fin);
                      const aDesCreneauxConfirmes = creneauxConfirmesDuJour(dStr).length > 0;
                      const isSelected = reservForm.dates.includes(dStr);
                      const disabled = isPast || journeeBloquee || (isSelected ? false : conflitHoraire);
                      const isOccupied = journeeBloquee || conflitHoraire;
                      return (
                        <button
                          type="button"
                          key={i}
                          disabled={disabled}
                          onClick={() => toggleReservDate(dStr)}
                          title={
                            journeeBloquee ? "Journée entièrement indisponible" :
                            conflitHoraire ? "Cet horaire chevauche une réservation déjà confirmée" :
                            aDesCreneauxConfirmes ? "Certains créneaux de ce jour sont déjà pris — vérifiez l'horaire" : ""
                          }
                          style={{
                            aspectRatio: "1", minWidth: 0, padding: 0, borderRadius: 5, fontSize: "0.64rem",
                            position: "relative",
                            border: isSelected ? "1.5px solid #4dd6a0" : "1px solid rgba(0,0,0,0.08)",
                            background: isSelected ? "#4dd6a0" : isOccupied ? "rgba(239,68,68,0.12)" : "transparent",
                            color: isSelected ? "#08321f" : isOccupied ? "#ef4444" : isPast ? "#b7c3d9" : "inherit",
                            cursor: disabled ? "not-allowed" : "pointer",
                            fontWeight: isSelected ? 700 : 400,
                            textDecoration: journeeBloquee ? "line-through" : "none",
                          }}
                        >
                          {d.getDate()}
                          {!isPast && !journeeBloquee && !isOccupied && aDesCreneauxConfirmes && (
                            <span style={{
                              position: "absolute", bottom: 2, right: 2,
                              width: 4, height: 4, borderRadius: "50%", background: "#f59e0b",
                            }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, fontSize: "0.6rem", opacity: 0.75, flexWrap: "wrap" }}>
                    <span><span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 2, background: "#4dd6a0", marginRight: 3, verticalAlign: "middle" }} />Sélectionné</span>
                    <span><span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 2, background: "rgba(239,68,68,0.4)", marginRight: 3, verticalAlign: "middle" }} />Indisponible pour cet horaire</span>
                    <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", marginRight: 3, verticalAlign: "middle" }} />Partiellement réservé ce jour-là</span>
                  </div>
                </div>
              );
            })()}

            <label>Heure de début</label>
            <input type="time" value={reservForm.heure_debut}
              onChange={e => setReservForm(f => ({ ...f, heure_debut: e.target.value }))} />
            <label>Heure de fin</label>
            <input type="time" value={reservForm.heure_fin}
              onChange={e => setReservForm(f => ({ ...f, heure_fin: e.target.value }))} />

            {(() => {
              const nbHeures = calculerNbHeures(reservForm.heure_debut, reservForm.heure_fin);
              const nbJours = reservForm.dates.length;
              const fraisParJour = calculerFrais(
                reservModal.type,
                reservModal.item,
                reservForm.heure_debut,
                reservForm.heure_fin,
                reservForm.table_ids
              );
              const fraisTotal = +(fraisParJour * nbJours).toFixed(2);
              return (
                <div className="cw-frais-box" style={{
                  background: "rgba(77,214,160,0.1)",
                  border: "1px solid rgba(77,214,160,0.35)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  margin: "10px 0",
                  fontSize: "0.9rem",
                }}>
                  {nbHeures > 0 && nbJours > 0 ? (
                    <>
                      💰 Frais estimé : <strong>{fraisTotal} DT</strong>
                      <span style={{ opacity: 0.7 }}> ({fraisParJour} DT × {nbJours} jour{nbJours > 1 ? "s" : ""}, {nbHeures.toFixed(2)} h/jour)</span>
                    </>
                  ) : (
                    <span style={{ opacity: 0.7 }}>Choisissez au moins un jour et un horaire pour voir le frais estimé.</span>
                  )}
                </div>
              );
            })()}

            {reservForm.heure_debut && reservForm.heure_fin && (() => {
              const joursEnConflit = reservForm.dates.filter((d) =>
                aConflitConfirme(d, reservForm.heure_debut, reservForm.heure_fin)
              );
              if (joursEnConflit.length === 0) return null;
              return (
                <div style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  margin: "-4px 0 10px",
                  fontSize: "0.82rem",
                  color: "#ef4444",
                }}>
                  ⛔ Le créneau {reservForm.heure_debut}–{reservForm.heure_fin} est déjà réservé (confirmé) pour : <strong>{joursEnConflit.join(", ")}</strong>.
                  Changez d'horaire ou désélectionnez ces jours pour continuer.
                </div>
              );
            })()}

            {reservModal.type === "salle" && (() => {
              const salleTables = getTablesOfSalle(reservModal.item.id);
              return (
                <>
                  <label>Tables de cette salle {salleTables.length > 0 && `(${reservForm.table_ids.length} sélectionnée${reservForm.table_ids.length > 1 ? "s" : ""})`}</label>
                  {salleTables.length === 0 ? (
                    <p className="cw-card-meta" style={{ marginTop: 0 }}>Aucune table enregistrée pour cette salle.</p>
                  ) : (
                    <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                      <div
                        ref={tablesListRef}
                        className="cw-reserv-tables-list cw-scroll-thin"
                        style={{ maxHeight: 220, overflowY: "auto", flex: 1 }}
                      >
                        {salleTables.map(t => {
                          const isLibre = t.statut === "Libre";
                          const checked = reservForm.table_ids.includes(t.id);
                          return (
                            <label
                              key={t.id}
                              className={`cw-reserv-table-item ${!isLibre ? "disabled" : ""} ${checked ? "checked" : ""}`}
                              style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "8px 10px", borderRadius: 8,
                                opacity: isLibre ? 1 : 0.5,
                                cursor: isLibre ? "pointer" : "not-allowed",
                                border: checked ? "1px solid #4dd6a0" : "1px solid rgba(0,0,0,0.1)",
                                marginBottom: 6,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!isLibre}
                                onChange={() => toggleReservTable(t.id)}
                              />
                              <span>🪑 {t.nom}</span>
                              <span className={`cw-badge ${isLibre ? "badge--green" : "badge--amber"}`} style={{ marginLeft: "auto" }}>
                                {t.statut}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      {salleTables.length > 3 && (
                        <div style={{
                          display: "flex", flexDirection: "column", justifyContent: "space-between",
                          alignItems: "center", width: 20, padding: "2px 0",
                        }}>
                          <button
                            type="button"
                            onClick={() => scrollTablesList(-1)}
                            aria-label="Défiler vers le haut"
                            style={{
                              border: "none", background: "transparent", cursor: "pointer",
                              color: "#94a3b8", fontSize: "0.75rem", padding: 2, lineHeight: 1,
                            }}
                          >▲</button>
                          <div style={{ flex: 1, width: 6, borderRadius: 6, background: "#c7cdd6", margin: "4px 0" }} />
                          <button
                            type="button"
                            onClick={() => scrollTablesList(1)}
                            aria-label="Défiler vers le bas"
                            style={{
                              border: "none", background: "transparent", cursor: "pointer",
                              color: "#94a3b8", fontSize: "0.75rem", padding: 2, lineHeight: 1,
                            }}
                          >▼</button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}

            <div className="cw-form-actions">
              <button className="cw-btn-cancel" onClick={() => setReservModal(null)}>Annuler</button>
              {(() => {
                const joursEnConflit = reservForm.heure_debut && reservForm.heure_fin
                  ? reservForm.dates.filter((d) => aConflitConfirme(d, reservForm.heure_debut, reservForm.heure_fin))
                  : [];
                const isDisabled = reservForm.dates.length === 0 || !reservForm.heure_debut || !reservForm.heure_fin || joursEnConflit.length > 0;
                return (
                  <button
                    className="cw-btn-save"
                    onClick={handleReserv}
                    disabled={isDisabled}
                    style={isDisabled ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                  >
                    Confirmer{reservForm.dates.length > 1 ? ` (${reservForm.dates.length} jours)` : ""}
                  </button>
                );
              })()}
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