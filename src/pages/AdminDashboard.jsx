import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const API = "http://localhost:5000/api";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${sessionStorage.getItem("token")}`,
});

/* ── Helpers ── */
const initials = (name = "") =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

const roleBadge = (role) => {
  const map = { superadmin: "badge-superadmin", admin: "badge-admin", user: "badge-user" };
  return map[role] || "badge-user";
};

const statutBadge = (s) => {
  const map = { actif: "badge-actif", inactif: "badge-inactif", suspendu: "badge-suspendu" };
  return map[s] || "badge-inactif";
};

/* ── Helpers créneaux (chevauchement horaire) ── */
const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const seChevauchent = (aDebut, aFin, bDebut, bFin) => {
  const a1 = toMinutes(aDebut), a2 = toMinutes(aFin);
  const b1 = toMinutes(bDebut), b2 = toMinutes(bFin);
  if (a1 == null || a2 == null || b1 == null || b2 == null) return false;
  return a1 < b2 && b1 < a2;
};

/* ── Modal wrapper ── */
function Modal({ title, onClose, children }) {
  return (
    <div className="adm-overlay">
      <div className="adm-modal">
        <div className="adm-modal-header">
          <h2 className="adm-modal-title">{title}</h2>
          <button className="adm-modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AdminDashboard({ user, setUser }) {
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === "superadmin";

  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Formations CRUD (gestion des formations) ──
  const [formationModal, setFormationModal] = useState(null); // { mode: "add" | "edit", data }
  const [formationForm, setFormationForm] = useState({});
  const [formationDeleteConfirm, setFormationDeleteConfirm] = useState(null);
  const [formationSearch, setFormationSearch] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("tous");
  const [statutFilter, setStatutFilter] = useState("tous");

  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [resDetails, setResDetails] = useState(null); // réservation affichée dans la modale "détails complets"

  // ── History filters
  const [histTypeFilter, setHistTypeFilter] = useState("tous");   // "tous" | "reservations" | "inscriptions"
  const [histStatutFilter, setHistStatutFilter] = useState("tous"); // "tous" | "acceptée" | "refusée"

  // ── Calendar tab state
  const [calCursor, setCalCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [calUserFilter, setCalUserFilter] = useState("tous");
  const [calSelectedDate, setCalSelectedDate] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Fetch all data ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, rRes, iRes, fRes] = await Promise.all([
        fetch(`${API}/admin/users`, { headers: authHeaders() }),
        fetch(`${API}/coworking/reservations`, { headers: authHeaders() }),
        fetch(`${API}/formations/inscriptions/all`, { headers: authHeaders() }),
        fetch(`${API}/formations`, { headers: authHeaders() }),
      ]);

      const uData = uRes.ok ? await uRes.json() : { users: [] };
      const rData = rRes.ok ? await rRes.json() : { reservations: [] };
      const iData = iRes.ok ? await iRes.json() : { inscriptions: [] };
      const fData = fRes.ok ? await fRes.json() : { formations: [] };

      setUsers(uData.users || []);
      setReservations(rData.reservations || []);
      setInscriptions(iData.inscriptions || []);
      setFormations(fData.formations || []);
    } catch (err) {
      showToast("Impossible de charger les données.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Derived lists ── */
  // Active = en_attente only
  const pendingReservations = reservations.filter((r) => !r.statut || r.statut === "en_attente");
  const pendingInscriptions  = inscriptions.filter((i) => !i.statut || i.statut === "en_attente");

  // History = acceptée, refusée, ou annulée (par l'utilisateur)
  const historyReservations = reservations.filter(
    (r) => r.statut === "acceptée" || r.statut === "refusée" || r.statut === "annulée"
  );
  const historyInscriptions  = inscriptions.filter(
    (i) => i.statut === "acceptée" || i.statut === "refusée"
  );

  // Combined history with type tag
  const historyAll = [
    ...historyReservations.map((r) => ({ ...r, _kind: "reservation" })),
    ...historyInscriptions.map((i)  => ({ ...i, _kind: "inscription" })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  /* ── Filtered users ── */
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      searchTerm === "" ||
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole   = roleFilter   === "tous" || u.role   === roleFilter;
    const matchStatut = statutFilter === "tous" || u.statut === statutFilter;
    return matchSearch && matchRole && matchStatut;
  });

  /* ── KPI calculations ── */
  const kpis = {
    total:        users.length,
    admins:       users.filter((u) => u.role === "admin" || u.role === "superadmin").length,
    actifs:       users.filter((u) => u.statut === "actif").length,
    reservations: reservations.length,
    inscriptions: inscriptions.length,
    pendingReservations: pendingReservations.length,
    pendingInscriptions: pendingInscriptions.length,
    historyCount: historyAll.length,
  };

  /* ── User CRUD ── */
  const openEdit = (u) => { setForm({ ...u, password: "" }); setModal({ mode: "edit", data: u }); };
  const closeModal = () => { setModal(null); setForm({}); };

  const handleSave = async () => {
    if (!form.name || !form.email) return showToast("Nom et email requis.", "error");
    const isEdit = modal.mode === "edit";
    try {
      if (isEdit) {
        if (isSuperAdmin && form.role !== modal.data.role) {
          const roleRes = await fetch(`${API}/admin/users/${modal.data.id}/role`, {
            method: "PUT", headers: authHeaders(),
            body: JSON.stringify({ role: form.role }),
          });
          if (!roleRes.ok) {
            const d = await roleRes.json();
            return showToast(d.message || "Erreur changement de rôle.", "error");
          }
        }
        if (form.statut !== modal.data.statut) {
          const statRes = await fetch(`${API}/admin/users/${modal.data.id}/statut`, {
            method: "PUT", headers: authHeaders(),
            body: JSON.stringify({ statut: form.statut }),
          });
          if (!statRes.ok) {
            const d = await statRes.json();
            return showToast(d.message || "Erreur changement de statut.", "error");
          }
        }
      } else {
        if (!form.password || form.password.length < 6)
          return showToast("Mot de passe de 6 caractères minimum.", "error");
        const res = await fetch(`${API}/auth/register`, {
          method: "POST", headers: authHeaders(),
          body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
        });
        if (!res.ok) { const d = await res.json(); return showToast(d.message || "Erreur serveur.", "error"); }
        if (isSuperAdmin && form.role !== "user") {
          const regData = await res.json().catch(() => null);
          if (regData?.user?.id) {
            await fetch(`${API}/admin/users/${regData.user.id}/role`, {
              method: "PUT", headers: authHeaders(),
              body: JSON.stringify({ role: form.role }),
            });
          }
        }
      }
      closeModal(); fetchAll();
      showToast(isEdit ? "Utilisateur mis à jour." : "Utilisateur créé avec succès.");
    } catch { showToast("Erreur de connexion au serveur.", "error"); }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API}/admin/users/${deleteConfirm.id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) return showToast("Erreur lors de la suppression.", "error");
      setDeleteConfirm(null); fetchAll();
      showToast("Utilisateur supprimé.");
    } catch { showToast("Erreur de connexion au serveur.", "error"); }
  };

  const changeStatut = async (u, newStatut) => {
    try {
      const res = await fetch(`${API}/admin/users/${u.id}/statut`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ statut: newStatut }),
      });
      if (!res.ok) { const d = await res.json(); return showToast(d.message || "Erreur.", "error"); }
      fetchAll();
      showToast(`Statut de ${u.name} → ${newStatut}.`);
    } catch { showToast("Erreur de connexion au serveur.", "error"); }
  };

  /* ── Reservations ── */
  // Accepter une réservation :
  //  1. Interdit l'acceptation si un créneau CONFIRMÉ chevauchant existe déjà
  //     pour le même item/date (garde-fou, normalement déjà exclu par l'étape 3
  //     ci-dessous appliquée aux acceptations précédentes).
  //  2. Envoie le changement de statut au serveur.
  //  3. En cas de succès, refuse automatiquement toute autre demande "en attente"
  //     sur le même item/date dont l'horaire chevauche celui qui vient d'être
  //     confirmé — "chaque réservation confirmée interdit les nouvelles
  //     réservations sur le même créneau".
  const updateStatutReservation = async (id, statut) => {
    const target = reservations.find((r) => r.id === id);

    if (statut === "acceptée" && target) {
      const dejaConfirme = reservations.some((r) =>
        r.id !== id &&
        r.statut === "acceptée" &&
        r.type === target.type &&
        r.item_id === target.item_id &&
        r.date === target.date &&
        seChevauchent(target.heure_debut, target.heure_fin, r.heure_debut, r.heure_fin)
      );
      if (dejaConfirme) {
        return showToast("❌ Impossible : une autre réservation est déjà confirmée sur ce créneau.", "error");
      }
    }

    try {
      const res = await fetch(`${API}/coworking/reservations/${id}/statut`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        return showToast(`❌ ${errData?.message || `Erreur ${res.status}`}`, "error");
      }

      let nbAutoRefusees = 0;
      if (statut === "acceptée" && target) {
        const concurrentes = reservations.filter((r) =>
          r.id !== id &&
          (!r.statut || r.statut === "en_attente") &&
          r.type === target.type &&
          r.item_id === target.item_id &&
          r.date === target.date &&
          seChevauchent(target.heure_debut, target.heure_fin, r.heure_debut, r.heure_fin)
        );
        for (const c of concurrentes) {
          try {
            const rr = await fetch(`${API}/coworking/reservations/${c.id}/statut`, {
              method: "PUT", headers: authHeaders(),
              body: JSON.stringify({ statut: "refusée" }),
            });
            if (rr.ok) nbAutoRefusees++;
          } catch { /* on ignore, l'admin pourra la traiter manuellement */ }
        }
      }

      fetchAll();
      showToast(
        statut === "acceptée"
          ? `✅ Réservation acceptée — déplacée dans l'historique.${nbAutoRefusees > 0 ? ` ${nbAutoRefusees} demande(s) concurrente(s) sur le même créneau ont été refusée(s) automatiquement.` : ""}`
          : "❌ Réservation refusée — déplacée dans l'historique."
      );
    } catch (err) { showToast(`Erreur : ${err.message}`, "error"); }
  };

  const deleteReservation = async (id) => {
    try {
      const res = await fetch(`${API}/coworking/reservations/${id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) return showToast("Erreur lors de la suppression.", "error");
      fetchAll(); showToast("🗑 Réservation supprimée.");
    } catch { showToast("Erreur de connexion au serveur.", "error"); }
  };

  /* ── Inscriptions ── */
  const updateStatutInscription = async (id, statut) => {
    try {
      const res = await fetch(`${API}/formations/inscriptions/${id}/statut`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        return showToast(`❌ ${errData?.message || `Erreur ${res.status}`}`, "error");
      }
      fetchAll();
      showToast(
        statut === "acceptée"
          ? "✅ Inscription acceptée — déplacée dans l'historique."
          : "❌ Inscription refusée — déplacée dans l'historique."
      );
    } catch (err) { showToast(`Erreur : ${err.message}`, "error"); }
  };

  const deleteInscription = async (id) => {
    try {
      const res = await fetch(`${API}/formations/inscriptions/${id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) return showToast("Erreur lors de la suppression.", "error");
      fetchAll(); showToast("🗑 Inscription supprimée.");
    } catch { showToast("Erreur de connexion au serveur.", "error"); }
  };

  /* ── Formations (gestion) ── */
  const FORMATION_TAGS = ["Tech", "Créatif", "Business", "IA & Data", "Entrepreneuriat & Startup"];

  const emptyFormation = {
    titre: "", description: "", tag: "Tech", categorie: "Tech",
    duree: "", prix: "", minParticipants: 5, maxParticipants: 20,
    icon: "📚", modules: [], sessions: [],
  };

  const openAddFormation = () => {
    setFormationForm({ ...emptyFormation });
    setFormationModal({ mode: "add" });
  };

  const openEditFormation = (f) => {
    setFormationForm({
      ...f,
      minParticipants: f.minParticipants ?? f.min_participants ?? 5,
      maxParticipants: f.maxParticipants ?? f.max_participants ?? f.places ?? 20,
      modules: Array.isArray(f.modules) ? f.modules : [],
      sessions: Array.isArray(f.sessions) ? f.sessions : [],
    });
    setFormationModal({ mode: "edit", data: f });
  };

  const closeFormationModal = () => { setFormationModal(null); setFormationForm({}); };

  const addModuleRow = () => {
    setFormationForm((f) => ({ ...f, modules: [...(f.modules || []), { titre: "", duree: "", prix: "" }] }));
  };
  const updateModuleRow = (idx, key, val) => {
    setFormationForm((f) => {
      const modules = [...(f.modules || [])];
      modules[idx] = { ...modules[idx], [key]: val };
      return { ...f, modules };
    });
  };
  const removeModuleRow = (idx) => {
    setFormationForm((f) => ({ ...f, modules: (f.modules || []).filter((_, i) => i !== idx) }));
  };

  // ── Sessions (dates de tenue de la formation) ──
  const addSessionRow = () => {
    setFormationForm((f) => ({
      ...f,
      sessions: [...(f.sessions || []), { titre: "", dateDebut: "", dateFin: "", lieu: "", capacite: "" }],
    }));
  };
  const updateSessionRow = (idx, key, val) => {
    setFormationForm((f) => {
      const sessions = [...(f.sessions || [])];
      sessions[idx] = { ...sessions[idx], [key]: val };
      return { ...f, sessions };
    });
  };
  const removeSessionRow = (idx) => {
    setFormationForm((f) => ({ ...f, sessions: (f.sessions || []).filter((_, i) => i !== idx) }));
  };

  const handleSaveFormation = async () => {
    if (!formationForm.titre?.trim()) return showToast("Le titre de la formation est requis.", "error");
    if (formationForm.prix === "" || formationForm.prix == null || Number(formationForm.prix) < 0)
      return showToast("Un prix valide est requis.", "error");

    const minP = formationForm.minParticipants === "" ? 0 : Number(formationForm.minParticipants);
    const maxP = formationForm.maxParticipants === "" ? 0 : Number(formationForm.maxParticipants);
    if (minP < 0 || maxP < 0) return showToast("Le nombre de participants ne peut pas être négatif.", "error");
    if (maxP && minP && maxP < minP)
      return showToast("Le maximum de participants doit être supérieur ou égal au minimum.", "error");

    const cleanModules = (formationForm.modules || [])
      .filter((m) => m.titre && m.titre.trim())
      .map((m) => ({ titre: m.titre.trim(), duree: m.duree || "", prix: m.prix === "" || m.prix == null ? 0 : Number(m.prix) }));

    // ── Sessions : on ne garde que celles avec au moins une date de début ──
    const cleanSessions = (formationForm.sessions || [])
      .filter((s) => s.dateDebut)
      .map((s) => ({
        titre: (s.titre || "").trim(),
        dateDebut: s.dateDebut,
        dateFin: s.dateFin || s.dateDebut,
        lieu: (s.lieu || "").trim(),
        capacite: s.capacite === "" || s.capacite == null ? null : Number(s.capacite),
      }));
    for (const s of cleanSessions) {
      if (s.dateFin < s.dateDebut) {
        return showToast("❌ La date de fin d'une session ne peut pas précéder sa date de début.", "error");
      }
      if (s.capacite != null && s.capacite < 0) {
        return showToast("❌ La capacité d'une session ne peut pas être négative.", "error");
      }
    }

    const isEdit = formationModal.mode === "edit";
    const payload = {
      titre: formationForm.titre.trim(),
      description: formationForm.description || "",
      tag: formationForm.tag || "Tech",
      categorie: formationForm.categorie || formationForm.tag || "Tech",
      duree: formationForm.duree || "",
      prix: Number(formationForm.prix),
      minParticipants: minP,
      maxParticipants: maxP,
      places: maxP,
      icon: formationForm.icon || "📚",
      modules: cleanModules,
      sessions: cleanSessions,
    };

    try {
      const url = isEdit ? `${API}/formations/${formationModal.data.id}` : `${API}/formations`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        return showToast(d?.message || "Erreur serveur.", "error");
      }
      closeFormationModal();
      fetchAll();
      showToast(isEdit ? "Formation mise à jour." : "Formation créée avec succès.");
    } catch {
      showToast("Erreur de connexion au serveur.", "error");
    }
  };

  const handleDeleteFormation = async () => {
    try {
      const res = await fetch(`${API}/formations/${formationDeleteConfirm.id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) return showToast("Erreur lors de la suppression.", "error");
      setFormationDeleteConfirm(null);
      fetchAll();
      showToast("🗑 Formation supprimée.");
    } catch {
      showToast("Erreur de connexion au serveur.", "error");
    }
  };

  const filteredFormations = formations.filter((f) => {
    const s = formationSearch.toLowerCase();
    return s === "" || f.titre?.toLowerCase().includes(s) || f.tag?.toLowerCase().includes(s) || f.categorie?.toLowerCase().includes(s);
  });

  /* ── Occupation des formations (calculée à partir des inscriptions acceptées) ──
     Une place est occupée soit par une inscription "formation complète", soit
     par une inscription à un module ("cours") de cette formation. */
  const getFormationOccupation = (formationId) => {
    const accepted = inscriptions.filter(
      (i) => i.statut === "acceptée" && String(i.formation_id) === String(formationId)
    );
    return {
      total: accepted.length,
      complete: accepted.filter((i) => i.type !== "cours").length,
      parCours: accepted.filter((i) => i.type === "cours").length,
    };
  };

  // Occupation d'un module précis (regroupement par titre — pas d'id stable côté modules)
  const getModuleOccupation = (formationId, moduleTitre) =>
    inscriptions.filter(
      (i) =>
        i.statut === "acceptée" &&
        i.type === "cours" &&
        String(i.formation_id) === String(formationId) &&
        i.cours_titre === moduleTitre
    ).length;

  // Statut d'une session déduit de ses dates
  const sessionStatut = (s) => {
    if (!s.dateDebut) return { label: "Non planifiée", color: "#94a3b8" };
    const now = new Date();
    const debut = new Date(s.dateDebut);
    const fin = s.dateFin ? new Date(s.dateFin) : debut;
    if (now > fin) return { label: "Terminée", color: "#64748b" };
    if (now >= debut) return { label: "En cours", color: "#22c55e" };
    return { label: "À venir", color: "#1a6fc4" };
  };

  /* ── Stats data ── */
  const roleStats = [
    { label: "Utilisateurs", val: users.filter((u) => u.role === "user").length },
    { label: "Admins",       val: users.filter((u) => u.role === "admin").length },
    { label: "Superadmins",  val: users.filter((u) => u.role === "superadmin").length },
  ];
  const maxRole = Math.max(...roleStats.map((r) => r.val), 1);

  const statutStats = [
    { label: "Actifs",    val: users.filter((u) => u.statut === "actif").length,    color: "#4dd6a0" },
    { label: "Inactifs",  val: users.filter((u) => u.statut === "inactif").length,  color: "#5ab4ff" },
    { label: "Suspendus", val: users.filter((u) => u.statut === "suspendu").length, color: "#f5d07a" },
  ];
  const totalStatut = statutStats.reduce((a, s) => a + s.val, 0) || 1;
  let cumulDeg = 0;
  const donutSegments = statutStats.map((s) => {
    const deg = (s.val / totalStatut) * 360;
    const segment = `${s.color} ${cumulDeg}deg ${cumulDeg + deg}deg`;
    cumulDeg += deg;
    return segment;
  });
  const donutGradient = `conic-gradient(${donutSegments.join(", ")})`;

  /* ── Taux d'occupation des salles (calculé à partir des vraies réservations) ── */
  const OPENING_HOUR = 8;   // 08:00
  const CLOSING_HOUR = 20;  // 20:00
  const HOURS_PER_DAY = CLOSING_HOUR - OPENING_HOUR; // 12h/jour d'ouverture

  const [occupancyPeriod, setOccupancyPeriod] = useState("30j"); // "7j" | "30j" | "mois"

  const occupancyRange = (() => {
    const now = new Date();
    let start;
    if (occupancyPeriod === "7j") {
      start = new Date(now); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
    } else if (occupancyPeriod === "mois") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      start = new Date(now); start.setDate(start.getDate() - 29); start.setHours(0, 0, 0, 0);
    }
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
    return { start, end, days };
  })();

  const dureeHeures = (r) => {
    const d1 = toMinutes(r.heure_debut), d2 = toMinutes(r.heure_fin);
    if (d1 == null || d2 == null || d2 <= d1) return 0;
    return (d2 - d1) / 60;
  };

  const salleReservationsAcceptees = reservations.filter((r) => {
    if (r.type !== "salle" || r.statut !== "acceptée") return false;
    const d = new Date(r.date);
    return d >= occupancyRange.start && d <= occupancyRange.end;
  });

  const salleOccupancy = (() => {
    const byName = {};
    salleReservationsAcceptees.forEach((r) => {
      const nom = r.item_nom || `Salle #${r.salle_id ?? "?"}`;
      if (!byName[nom]) byName[nom] = { nom, heures: 0, reservations: 0 };
      byName[nom].heures += dureeHeures(r);
      byName[nom].reservations += 1;
    });
    const capaciteTotale = occupancyRange.days * HOURS_PER_DAY;
    return Object.values(byName)
      .map((s) => ({ ...s, taux: capaciteTotale > 0 ? Math.min(100, (s.heures / capaciteTotale) * 100) : 0 }))
      .sort((a, b) => b.taux - a.taux);
  })();

  const tauxOccupationMoyen = salleOccupancy.length > 0
    ? salleOccupancy.reduce((acc, s) => acc + s.taux, 0) / salleOccupancy.length
    : 0;

  const totalHeuresReservees = salleOccupancy.reduce((acc, s) => acc + s.heures, 0);
  const salleLaPlusDemandee = salleOccupancy[0] || null;

  const handleLogout = () => { setUser(null); navigate("/login"); };

  /* ── TABS config ── */
  const TABS = [
    { id: "users",        label: "Utilisateurs", icon: "👥", count: kpis.total,               pending: 0 },
    { id: "reservations", label: "Date De Réservations",  icon: "📅", count: pendingReservations.length, pending: pendingReservations.length },
    { id: "calendrier",   label: "Calendrier De Réservations",    icon: "🗓", count: null,                       pending: 0 },
    { id: "formations",   label: "Formations",    icon: "📚", count: formations.length,          pending: 0 },
    { id: "inscriptions", label: "Inscriptions",  icon: "🎓", count: pendingInscriptions.length,  pending: pendingInscriptions.length },
    { id: "historique",   label: "Historique",    icon: "🕓", count: kpis.historyCount,          pending: 0 },
    { id: "stats",        label: "Statistiques",  icon: "📊", count: null,                       pending: 0 },
  ];

  /* ── Calendar helpers ── */
  // Normalise n'importe quel format de date renvoyé par l'API (ex: "2026-07-15",
  // "2026-07-15T00:00:00.000Z", objet Date...) vers une clé locale "YYYY-MM-DD".
  // Sans ça, si le backend renvoie un horodatage complet, la comparaison stricte
  // avec la clé du calendrier échoue silencieusement et aucune case ne se colore.
  const toDateKey = (val) => {
    if (!val) return null;
    if (typeof val === "string") {
      // Extrait directement "YYYY-MM-DD" en tête de chaîne (ex: "2026-07-28T23:00:00.000Z"
      // → "2026-07-28"). Important : on NE PASSE PAS par `new Date(val)` ici, car un
      // horodatage UTC proche de minuit peut "glisser" d'un jour une fois converti en
      // heure locale (ex: 23:00 UTC = 00:00 le lendemain à Tunis, UTC+1).
      const match = val.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Regroupe les réservations par date "YYYY-MM-DD", en tenant compte du
  // filtre utilisateur sélectionné dans l'onglet Calendrier.
  const calReservations = reservations;
  const reservationsByDate = calReservations.reduce((acc, r) => {
    const key = toDateKey(r.date);
    if (!key) return acc;
    if (calUserFilter !== "tous" && String(r.user_id) !== String(calUserFilter)) return acc;
    (acc[key] = acc[key] || []).push(r);
    return acc;
  }, {});

  // À l'ouverture de l'onglet Calendrier, si aucun jour n'est encore
  // sélectionné, on saute automatiquement sur la date de la réservation la
  // plus récente (salle ou table, quel que soit son statut) et on l'affiche
  // avec ses détails — l'admin n'a pas à deviner dans quel mois chercher.
  useEffect(() => {
    if (activeTab !== "calendrier" || calSelectedDate) return;
    if (reservations.length === 0) return;
    const dated = reservations
      .map((r) => ({ r, key: toDateKey(r.date) }))
      .filter((x) => x.key)
      .sort((a, b) => new Date(b.r.created_at || b.key) - new Date(a.r.created_at || a.key));
    if (dated.length === 0) return;
    const [y, m] = dated[0].key.split("-").map(Number);
    setCalCursor(new Date(y, m - 1, 1));
    setCalSelectedDate(dated[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, reservations]);

  /* ════════════════════ RENDER ════════════════════ */
  if (loading) return (
    <div className="adm-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="bg-glow" /><div className="bg-glow2" />
      <p style={{ color: "#1a6fc4", fontSize: "1.2rem", fontWeight: 700 }}>⏳ Chargement...</p>
    </div>
  );

  return (
    <div className="adm-page">
      <div className="bg-glow" />
      <div className="bg-glow2" />

      {/* ── NAVBAR ── */}
      <nav className="navbar" style={isSuperAdmin ? {
        borderBottom: "1.5px solid rgba(167,139,250,0.25)",
        background: "linear-gradient(90deg, rgba(10,8,20,0.98) 0%, rgba(30,15,50,0.98) 100%)",
      } : {}}>
        <div className="navbar-brand">
          <div className="brand-icon" style={isSuperAdmin ? { background: "linear-gradient(135deg,#7c3aed,#a78bfa)", boxShadow: "0 0 16px rgba(124,58,237,0.5)" } : {}}>
            {isSuperAdmin ? "👑" : "🛡"}
          </div>
          <span className="brand-name" style={isSuperAdmin ? { color: "#c084fc" } : {}}>TZ Prime Solutions</span>
          {isSuperAdmin && (
            <span style={{
              fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.1em",
              background: "linear-gradient(90deg,#7c3aed,#a78bfa)",
              color: "#fff", borderRadius: 20, padding: "2px 10px", marginLeft: 8,
              textTransform: "uppercase",
            }}>Super Admin</span>
          )}
        </div>
        <div className="navbar-links">
          <div className="navbar-user">
            <span className="user-dot" style={isSuperAdmin ? { background: "#a78bfa", boxShadow: "0 0 6px #a78bfa" } : {}} />
            {user?.name || user?.email}
            <span className="adm-role-badge" style={isSuperAdmin ? {
              background: "linear-gradient(90deg,rgba(124,58,237,0.3),rgba(167,139,250,0.2))",
              color: "#c084fc", border: "1px solid rgba(167,139,250,0.4)",
            } : {}}>{user?.role}</span>
          </div>
          <button className="btn-nav" onClick={() => navigate("/choose-services")}>← Services</button>
          <button className="btn-nav" onClick={handleLogout}>Déconnexion</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="adm-hero" style={isSuperAdmin ? {
        background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, transparent 60%)",
        borderBottom: "1px solid rgba(167,139,250,0.1)",
      } : {}}>
        <p className="adm-hero-eyebrow" style={isSuperAdmin ? { color: "#a78bfa" } : {}}>
          {isSuperAdmin ? "👑 Super Administration" : "🛡 Panneau d'administration"}
        </p>
        <h1 className="adm-hero-title" style={isSuperAdmin ? {
          background: "linear-gradient(135deg, #a78bfa 0%, #c084fc 50%, #e879f9 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        } : {}}>
          {isSuperAdmin ? "SuperAdmin Dashboard" : "Dashboard Admin"}
        </h1>
        <p className="adm-hero-sub">
          {isSuperAdmin
            ? "Contrôle total — utilisateurs, rôles, réservations, inscriptions et statistiques."
            : "Gérez les utilisateurs, réservations et inscriptions de la plateforme."}
        </p>
        <div className="adm-hero-divider" style={isSuperAdmin ? { background: "linear-gradient(90deg, #7c3aed, transparent)" } : {}} />
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div className={`adm-toast adm-toast-${toast.type}`}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      {/* ── KPI CARDS ── */}
      <div className="adm-kpi-row">
        {[
          { icon: "👥", val: kpis.total,                   label: "Utilisateurs" },
          { icon: "🛡", val: kpis.admins,                   label: "Admins" },
          { icon: "✅", val: kpis.actifs,                   label: "Comptes actifs" },
          { icon: "📅", val: pendingReservations.length,    label: "Réservations en attente" },
          { icon: "🎓", val: pendingInscriptions.length,    label: "Inscriptions en attente" },
          { icon: "🏢", val: `${Math.round(tauxOccupationMoyen)}%`, label: `Occupation salles (${occupancyPeriod === "7j" ? "7j" : occupancyPeriod === "mois" ? "ce mois" : "30j"})` },
          { icon: "🕓", val: kpis.historyCount,             label: "Traitées (historique)" },
        ].map((k, i) => (
          <div className="adm-kpi" key={k.label} style={{ animationDelay: `${i * 0.07}s` }}>
            <div className="adm-kpi-icon">{k.icon}</div>
            <div className="adm-kpi-val">{k.val}</div>
            <div className="adm-kpi-label">{k.label}</div>
            <div className="adm-kpi-line" />
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div className="adm-tabs" style={isSuperAdmin ? {
        borderBottom: "1.5px solid rgba(167,139,250,0.15)",
      } : {}}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`adm-tab${activeTab === t.id ? " active" : ""}`}
            style={isSuperAdmin && activeTab === t.id ? {
              color: "#c084fc",
              borderBottomColor: "#7c3aed",
              background: "rgba(124,58,237,0.08)",
            } : {}}
            onClick={() => setActiveTab(t.id)}
          >
            {t.icon} {t.label}
            {t.count !== null && <span className="adm-tab-badge" style={isSuperAdmin ? { background: "rgba(124,58,237,0.3)", color: "#c084fc" } : {}}>{t.count}</span>}
            {t.pending > 0 && (
              <span className="adm-tab-badge" style={{ background: "#f59e0b", marginLeft: 2 }}>
                ⏳ {t.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════ CONTENT ════════════ */}
      <div className="adm-content">

        {/* ══ TAB: USERS ══ */}
        {activeTab === "users" && (
          <>
            <div className="adm-toolbar">
              <h2 className="adm-section-title">Gestion des utilisateurs</h2>
              <div className="adm-toolbar-right">
                <div className="adm-search">
                  <span className="adm-search-icon">🔍</span>
                  <input
                    type="text" placeholder="Rechercher..."
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select className="adm-filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="tous">Tous les rôles</option>
                  <option value="user">Utilisateur</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
                <select className="adm-filter-select" value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)}>
                  <option value="tous">Tous les statuts</option>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="suspendu">Suspendu</option>
                </select>
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="adm-empty">
                <div className="adm-empty-icon">🔍</div>
                <p>Aucun utilisateur trouvé.</p>
                <p className="adm-empty-sub">Modifiez vos filtres.</p>
              </div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Utilisateur</th><th>Rôle</th><th>Statut</th><th>Créé le</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, i) => (
                      <tr key={u.id} style={{ animationDelay: `${i * 0.04}s` }}>
                        <td>
                          <div className="adm-user-cell">
                            <div className="adm-avatar">{initials(u.name || u.email)}</div>
                            <div>
                              <p className="adm-user-name">{u.name || "—"}</p>
                              <p className="adm-user-email">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td><span className={`adm-badge ${roleBadge(u.role)}`}>{u.role || "user"}</span></td>
                        <td><span className={`adm-badge ${statutBadge(u.statut || "actif")}`}>{u.statut || "actif"}</span></td>
                        <td>{u.created_at ? new Date(u.created_at).toLocaleDateString("fr-TN") : "—"}</td>
                        <td>
                          <div className="adm-actions">
                            <button className="adm-btn-sm adm-btn-edit" onClick={() => openEdit(u)}>✏ Modifier</button>
                            {(u.statut === "actif" || !u.statut) ? (
                              <button className="adm-btn-sm adm-btn-warn" onClick={() => changeStatut(u, "suspendu")}>⏸ Suspendre</button>
                            ) : (
                              <button className="adm-btn-sm adm-btn-success" onClick={() => changeStatut(u, "actif")}>▶ Activer</button>
                            )}
                            {isSuperAdmin && (
                              <button className="adm-btn-sm adm-btn-del" onClick={() => setDeleteConfirm(u)}>🗑 Supprimer</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ══ TAB: RESERVATIONS (en_attente uniquement) ══ */}
        {activeTab === "reservations" && (
          <>
            <div className="adm-toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
              <h2 className="adm-section-title">
                Réservations en attente
                {pendingReservations.length > 0 && (
                  <span style={{ marginLeft: 10, fontSize: "0.78rem", background: "#f59e0b", color: "#fff", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>
                    ⏳ {pendingReservations.length} en attente
                  </span>
                )}
              </h2>
            </div>

            {pendingReservations.length === 0 ? (
              <div className="adm-empty">
                <div className="adm-empty-icon">🎉</div>
                <p>Aucune réservation en attente.</p>
                <p className="adm-empty-sub">Toutes les demandes ont été traitées — consultez l'historique.</p>
                <button
                  onClick={() => setActiveTab("historique")}
                  style={{ marginTop: 12, padding: "8px 20px", borderRadius: 20, border: "1.5px solid #1a6fc4", background: "transparent", color: "#1a6fc4", fontWeight: 600, cursor: "pointer" }}
                >
                  🕓 Voir l'historique
                </button>
              </div>
            ) : (
              <div className="adm-list">
                {pendingReservations.map((r, i) => (
                  <div className="adm-list-card" key={r.id} style={{
                    animationDelay: `${i * 0.06}s`,
                    borderLeft: "4px solid #f59e0b",
                  }}>
                    <div className="adm-list-left">
                      <div className="adm-list-icon">{r.type === "salle" ? "🏢" : "🪑"}</div>
                      <div>
                        <h3 className="adm-list-title">{r.item_nom}</h3>
                        <div className="adm-list-meta">
                          <span className={`adm-badge ${r.type === "salle" ? "badge-user" : "badge-admin"}`}>
                            {r.type === "salle" ? "Salle" : "Table"}
                          </span>
                          <span>📅 {r.date}</span>
                          <span>⏱ {r.heure_debut} – {r.heure_fin}</span>
                          <span>👤 {r.user_name || r.user_email || `ID ${r.user_id}`}</span>
                        </div>
                      </div>
                    </div>
                    <div className="adm-list-right">
                      <span className="adm-badge badge-suspendu">⏳ En attente</span>
                      <button className="adm-btn-sm adm-btn-edit" onClick={() => setResDetails(r)}>
                        🔍 Détails
                      </button>
                      <button className="adm-btn-sm adm-btn-success" onClick={() => updateStatutReservation(r.id, "acceptée")}>
                        ✅ Accepter
                      </button>
                      <button className="adm-btn-sm adm-btn-warn" onClick={() => updateStatutReservation(r.id, "refusée")}>
                        ❌ Refuser
                      </button>
                      {isSuperAdmin && (
                        <button className="adm-btn-sm adm-btn-del" onClick={() => deleteReservation(r.id)}>
                          🗑 Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ TAB: CALENDRIER ══ */}
        {activeTab === "calendrier" && (() => {
          const year = calCursor.getFullYear(), month = calCursor.getMonth();
          const monthLabel = calCursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
          const firstOfMonth = new Date(year, month, 1);
          const startOffset = (firstOfMonth.getDay() + 6) % 7; // lundi = 0
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const cells = [];
          for (let i = 0; i < startOffset; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
          const toStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          const todayStr = toStr(new Date());
          const selectedList = calSelectedDate ? (reservationsByDate[calSelectedDate] || []) : [];

          return (
            <>
              <div className="adm-toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
                <h2 className="adm-section-title">Calendrier des réservations</h2>
                <div className="adm-toolbar-right">
                  <select
                    className="adm-filter-select"
                    value={calUserFilter}
                    onChange={(e) => { setCalUserFilter(e.target.value); setCalSelectedDate(null); }}
                  >
                    <option value="tous">Tous les utilisateurs</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
                {/* ── Grille du mois ── */}
                <div style={{ flex: "1 1 380px", minWidth: 320, border: "1px solid #cce0f7", borderRadius: 12, padding: 16, background: "#fff" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <button
                      onClick={() => setCalCursor(new Date(year, month - 1, 1))}
                      style={{ border: "1.5px solid #1a6fc4", background: "transparent", color: "#1a6fc4", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: "1rem" }}
                    >‹</button>
                    <strong style={{ textTransform: "capitalize", color: "#0b3d78", fontSize: "1.05rem" }}>{monthLabel}</strong>
                    <button
                      onClick={() => setCalCursor(new Date(year, month + 1, 1))}
                      style={{ border: "1.5px solid #1a6fc4", background: "transparent", color: "#1a6fc4", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: "1rem" }}
                    >›</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, fontSize: "0.72rem", color: "#78b8f0", fontWeight: 700, marginBottom: 6, textAlign: "center" }}>
                    {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => <span key={d}>{d}</span>)}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
                    {cells.map((d, i) => {
                      if (!d) return <span key={i} />;
                      const dStr = toStr(d);
                      const dayReservs = reservationsByDate[dStr] || [];
                      const hasPending = dayReservs.some((r) => !r.statut || r.statut === "en_attente");
                      const hasAccepted = dayReservs.some((r) => r.statut === "acceptée");
                      const hasRefused = dayReservs.some((r) => r.statut === "refusée");
                      const hasCancelled = dayReservs.some((r) => r.statut === "annulée");
                      const isToday = dStr === todayStr;
                      const isSelected = dStr === calSelectedDate;

                      // Couleur de fond : vert si acceptée, rouge si refusée,
                      // dégradé si les deux sont présentes le même jour, orange si en attente uniquement,
                      // gris si seulement des réservations annulées.
                      let dayBg = "#fff";
                      if (hasAccepted && hasRefused) dayBg = "linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(34,197,94,0.18) 50%, rgba(239,68,68,0.18) 50%, rgba(239,68,68,0.18) 100%)";
                      else if (hasAccepted) dayBg = "rgba(34,197,94,0.16)";
                      else if (hasRefused) dayBg = "rgba(239,68,68,0.16)";
                      else if (hasPending) dayBg = "rgba(245,158,11,0.10)";
                      else if (hasCancelled) dayBg = "rgba(148,163,184,0.14)";

                      return (
                        <button
                          key={i}
                          onClick={() => setCalSelectedDate(dStr)}
                          style={{
                            aspectRatio: "1", borderRadius: 10, position: "relative",
                            border: isSelected ? "2px solid #1a6fc4" : isToday ? "1.5px solid #1a6fc4" : "1px solid #e3eefb",
                            background: isSelected ? "rgba(26,111,196,0.12)" : dayBg,
                            cursor: "pointer", fontSize: "0.82rem", color: "#0b3d78",
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
                          }}
                        >
                          <span style={{ fontWeight: isToday ? 800 : 500 }}>{d.getDate()}</span>
                          {dayReservs.length > 0 && (
                            <span style={{ display: "flex", gap: 2 }}>
                              {hasPending && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />}
                              {hasAccepted && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />}
                              {hasRefused && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />}
                              {hasCancelled && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8" }} />}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 14, marginTop: 14, fontSize: "0.75rem", color: "#5a7ba6", flexWrap: "wrap" }}>
                    <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", marginRight: 5 }} />En attente</span>
                    <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#22c55e", marginRight: 5 }} />Acceptée</span>
                    <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#ef4444", marginRight: 5 }} />Refusée</span>
                    <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#94a3b8", marginRight: 5 }} />Annulée</span>
                  </div>
                </div>

                {/* ── Détail du jour sélectionné ── */}
                <div style={{ flex: "1 1 320px", minWidth: 300 }}>
                  {!calSelectedDate ? (
                    <div className="adm-empty" style={{ padding: "30px 16px" }}>
                      <div className="adm-empty-icon">🗓</div>
                      <p>Sélectionnez un jour dans le calendrier.</p>
                      <p className="adm-empty-sub">Les réservations de ce jour s'afficheront ici.</p>
                    </div>
                  ) : selectedList.length === 0 ? (
                    <div className="adm-empty" style={{ padding: "30px 16px" }}>
                      <div className="adm-empty-icon">📭</div>
                      <p>Aucune réservation le {new Date(calSelectedDate).toLocaleDateString("fr-TN")}.</p>
                    </div>
                  ) : (
                    <div className="adm-list">
                      <h3 className="adm-section-title" style={{ fontSize: "1rem", marginBottom: 4 }}>
                        📅 {new Date(calSelectedDate).toLocaleDateString("fr-TN", { weekday: "long", day: "numeric", month: "long" })}
                      </h3>
                      {selectedList.map((r, i) => (
                        <div className="adm-list-card" key={r.id} style={{
                          animationDelay: `${i * 0.05}s`,
                          borderLeft: `4px solid ${
                            r.statut === "acceptée" ? "#22c55e" :
                            r.statut === "refusée"  ? "#ef4444" :
                            r.statut === "annulée"  ? "#94a3b8" :
                            "#f59e0b"
                          }`,
                        }}>
                          <div className="adm-list-left">
                            <div className="adm-list-icon">{r.type === "salle" ? "🏢" : "🪑"}</div>
                            <div>
                              <h3 className="adm-list-title">{r.item_nom}</h3>
                              <div className="adm-list-meta">
                                <span>👤 {r.user_name || r.user_email || `ID ${r.user_id}`}</span>
                                <span>⏱ {r.heure_debut} – {r.heure_fin}</span>
                              </div>
                            </div>
                          </div>
                          <div className="adm-list-right">
                            <span
                              className={`adm-badge ${
                                r.statut === "acceptée" ? "badge-actif" :
                                r.statut === "refusée"  ? "badge-inactif" :
                                r.statut === "annulée"  ? "badge-inactif" :
                                "badge-suspendu"
                              }`}
                              style={r.statut === "annulée" ? { background: "#94a3b8" } : undefined}
                            >
                              {r.statut === "acceptée" ? "✅ Acceptée" :
                               r.statut === "refusée"  ? "❌ Refusée" :
                               r.statut === "annulée"  ? "🚫 Annulée" :
                               "⏳ En attente"}
                            </span>
                            <button className="adm-btn-sm adm-btn-edit" onClick={() => setResDetails(r)}>🔍 Détails</button>
                            {(!r.statut || r.statut === "en_attente") && (
                              <>
                                <button className="adm-btn-sm adm-btn-success" onClick={() => updateStatutReservation(r.id, "acceptée")}>✅ Accepter</button>
                                <button className="adm-btn-sm adm-btn-warn" onClick={() => updateStatutReservation(r.id, "refusée")}>❌ Refuser</button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          );
        })()}

        {/* ══ TAB: FORMATIONS (gestion : participants, modules, prix) ══ */}
        {activeTab === "formations" && (
          <>
            <div className="adm-toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
              <h2 className="adm-section-title">Gestion des formations</h2>
              <div className="adm-toolbar-right">
                <div className="adm-search">
                  <span className="adm-search-icon">🔍</span>
                  <input
                    type="text" placeholder="Rechercher une formation..."
                    value={formationSearch} onChange={(e) => setFormationSearch(e.target.value)}
                  />
                </div>
                <button className="adm-btn-sm adm-btn-success" onClick={openAddFormation}>
                  ＋ Nouvelle formation
                </button>
              </div>
            </div>

            {filteredFormations.length === 0 ? (
              <div className="adm-empty">
                <div className="adm-empty-icon">📚</div>
                <p>Aucune formation trouvée.</p>
                <p className="adm-empty-sub">Créez une formation pour commencer.</p>
              </div>
            ) : (
              <div className="adm-list">
                {filteredFormations.map((f, i) => {
                  const minP = f.minParticipants ?? f.min_participants;
                  const maxP = f.maxParticipants ?? f.max_participants ?? f.places;
                  const nbModules = Array.isArray(f.modules) ? f.modules.length : 0;
                  const occ = getFormationOccupation(f.id);
                  const capacite = Number(maxP) || 0;
                  const pctOcc = capacite > 0 ? Math.min(100, Math.round((occ.total / capacite) * 100)) : 0;
                  const barColor = pctOcc >= 100 ? "#ef4444" : pctOcc >= 70 ? "#f59e0b" : "#22c55e";
                  const sessions = Array.isArray(f.sessions) ? f.sessions : [];
                  const sessionsTriees = [...sessions].sort((a, b) => (a.dateDebut || "").localeCompare(b.dateDebut || ""));
                  return (
                    <div className="adm-list-card" key={f.id} style={{ animationDelay: `${i * 0.05}s`, borderLeft: "4px solid #1a6fc4", flexDirection: "column", alignItems: "stretch", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div className="adm-list-left">
                          <div className="adm-list-icon">{f.icon || "📚"}</div>
                          <div>
                            <h3 className="adm-list-title">{f.titre}</h3>
                            <div className="adm-list-meta">
                              <span className="adm-badge badge-user">{f.tag || f.categorie}</span>
                              <span>💰 {Number(f.prix || 0).toLocaleString("fr-TN")} TND</span>
                              <span>👥 {minP != null ? minP : "—"}–{maxP != null ? maxP : "—"} participants</span>
                              <span>🧩 {nbModules} module{nbModules > 1 ? "s" : ""}</span>
                              {f.duree && <span>⏱ {f.duree}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="adm-list-right">
                          <button className="adm-btn-sm adm-btn-edit" onClick={() => openEditFormation(f)}>✏ Modifier</button>
                          <button className="adm-btn-sm adm-btn-del" onClick={() => setFormationDeleteConfirm(f)}>🗑 Supprimer</button>
                        </div>
                      </div>

                      {/* ── Occupation & sessions ── */}
                      <div style={{ borderTop: "1px solid rgba(148,163,184,0.15)", paddingTop: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: sessions.length ? 10 : 0 }}>
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", minWidth: 150, flexShrink: 0 }}>
                            🪑 Occupation : {occ.total}/{capacite || "—"}
                          </span>
                          <div style={{ flex: 1, height: 8, borderRadius: 6, background: "rgba(148,163,184,0.2)", overflow: "hidden" }}>
                            <div style={{ width: `${pctOcc}%`, height: "100%", background: barColor, borderRadius: 6, transition: "width .3s" }} />
                          </div>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: barColor, minWidth: 34, textAlign: "right" }}>{pctOcc}%</span>
                          {occ.parCours > 0 && (
                            <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                              (dont {occ.parCours} par module)
                            </span>
                          )}
                        </div>

                        {sessionsTriees.length === 0 ? (
                          <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>
                            Aucune session planifiée pour cette formation.
                          </p>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {sessionsTriees.map((s, si) => {
                              const st = sessionStatut(s);
                              const dDebut = s.dateDebut ? new Date(s.dateDebut).toLocaleDateString("fr-TN") : "?";
                              const dFin = s.dateFin ? new Date(s.dateFin).toLocaleDateString("fr-TN") : null;
                              return (
                                <span
                                  key={si}
                                  title={s.titre || ""}
                                  style={{
                                    fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                                    background: `${st.color}1a`, color: st.color, border: `1px solid ${st.color}55`,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  📅 {dDebut}{dFin && dFin !== dDebut ? ` → ${dFin}` : ""}
                                  {s.lieu ? ` · ${s.lieu}` : ""}
                                  {s.capacite != null ? ` · ${s.capacite} places` : ""} · {st.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══ TAB: INSCRIPTIONS (en_attente uniquement) ══ */}
        {activeTab === "inscriptions" && (
          <>
            <div className="adm-toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
              <h2 className="adm-section-title">
                Inscriptions en attente
                {pendingInscriptions.length > 0 && (
                  <span style={{ marginLeft: 10, fontSize: "0.78rem", background: "#f59e0b", color: "#fff", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>
                    ⏳ {pendingInscriptions.length} en attente
                  </span>
                )}
              </h2>
            </div>

            {pendingInscriptions.length === 0 ? (
              <div className="adm-empty">
                <div className="adm-empty-icon">🎉</div>
                <p>Aucune inscription en attente.</p>
                <p className="adm-empty-sub">Toutes les demandes ont été traitées — consultez l'historique.</p>
                <button
                  onClick={() => setActiveTab("historique")}
                  style={{ marginTop: 12, padding: "8px 20px", borderRadius: 20, border: "1.5px solid #1a6fc4", background: "transparent", color: "#1a6fc4", fontWeight: 600, cursor: "pointer" }}
                >
                  🕓 Voir l'historique
                </button>
              </div>
            ) : (
              <div className="adm-list">
                {pendingInscriptions.map((ins, i) => {
                  const isCours = ins.type === "cours";
                  const titre = isCours ? ins.cours_titre : (ins.formation_titre || `Formation #${ins.formation_id}`);
                  const prix = isCours ? ins.cours_prix : ins.formation_prix;
                  return (
                    <div className="adm-list-card" key={ins.id} style={{
                      animationDelay: `${i * 0.06}s`,
                      borderLeft: "4px solid #f59e0b",
                    }}>
                      <div className="adm-list-left">
                        <div className="adm-list-icon">{isCours ? "📘" : "🎓"}</div>
                        <div>
                          <h3 className="adm-list-title">{titre}</h3>
                          <div className="adm-list-meta">
                            <span className={`adm-badge ${isCours ? "badge-admin" : "badge-user"}`}>
                              {isCours ? "Cours individuel" : "Formation complète"}
                            </span>
                            {isCours && ins.formation_titre && <span>📚 dans {ins.formation_titre}</span>}
                            <span>👤 {ins.user_name || ins.user_email || `ID ${ins.user_id}`}</span>
                            {ins.created_at && <span>📅 {new Date(ins.created_at).toLocaleDateString("fr-TN")}</span>}
                            {prix != null && <span>💰 {Number(prix).toLocaleString("fr-TN")} TND</span>}
                          </div>
                        </div>
                      </div>
                      <div className="adm-list-right">
                        <span className="adm-badge badge-suspendu">⏳ En attente</span>
                        <button className="adm-btn-sm adm-btn-success" onClick={() => updateStatutInscription(ins.id, "acceptée")}>
                          ✅ Accepter
                        </button>
                        <button className="adm-btn-sm adm-btn-warn" onClick={() => updateStatutInscription(ins.id, "refusée")}>
                          ❌ Refuser
                        </button>
                        {isSuperAdmin && (
                          <button className="adm-btn-sm adm-btn-del" onClick={() => deleteInscription(ins.id)}>
                            🗑 Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══ TAB: TARIFS ══ */}
        {/* ══ TAB: HISTORIQUE ══ */}
        {activeTab === "historique" && (
          <>
            <div className="adm-toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
              <h2 className="adm-section-title">
                Historique des décisions
                <span style={{ marginLeft: 10, fontSize: "0.78rem", background: "#1a6fc4", color: "#fff", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>
                  {historyAll.length} entrées
                </span>
              </h2>
              <div className="adm-toolbar-right" style={{ gap: 4 }}>
                {/* Type filter */}
                {[
                  { key: "tous",          label: "🗂 Tous",          color: "#1a6fc4" },
                  { key: "reservations",  label: "📅 Demandes De Réservations",  color: "#8b5cf6" },
                  { key: "inscriptions",  label: "🎓 Inscriptions",  color: "#0ea5e9" },
                ].map((f) => (
                  <button key={f.key} onClick={() => setHistTypeFilter(f.key)} style={{
                    padding: "5px 13px", borderRadius: 20, border: `1.5px solid ${f.color}`,
                    fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                    background: histTypeFilter === f.key ? f.color : "transparent",
                    color: histTypeFilter === f.key ? "#fff" : f.color,
                    transition: "all .18s",
                  }}>{f.label}</button>
                ))}
                <span style={{ width: 1, background: "#cce0f7", alignSelf: "stretch", margin: "0 4px" }} />
                {/* Statut filter */}
                {[
                  { key: "tous",     label: "Tous",      color: "#64748b" },
                  { key: "acceptée", label: "✅ Acceptés", color: "#22c55e" },
                  { key: "refusée",  label: "❌ Refusés",  color: "#ef4444" },
                  { key: "annulée",  label: "🚫 Annulées", color: "#94a3b8" },
                ].map((f) => (
                  <button key={f.key} onClick={() => setHistStatutFilter(f.key)} style={{
                    padding: "5px 13px", borderRadius: 20, border: `1.5px solid ${f.color}`,
                    fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                    background: histStatutFilter === f.key ? f.color : "transparent",
                    color: histStatutFilter === f.key ? "#fff" : f.color,
                    transition: "all .18s",
                  }}>{f.label}</button>
                ))}
              </div>
            </div>

            {(() => {
              const filtered = historyAll.filter((item) => {
                const matchType =
                  histTypeFilter === "tous" ||
                  (histTypeFilter === "reservations" && item._kind === "reservation") ||
                  (histTypeFilter === "inscriptions" && item._kind === "inscription");
                const matchStatut =
                  histStatutFilter === "tous" || item.statut === histStatutFilter;
                return matchType && matchStatut;
              });

              if (filtered.length === 0) return (
                <div className="adm-empty">
                  <div className="adm-empty-icon">🕓</div>
                  <p>Aucun élément dans l'historique.</p>
                  <p className="adm-empty-sub">Les demandes acceptées ou refusées apparaîtront ici.</p>
                </div>
              );

              return (
                <div className="adm-list">
                  {filtered.map((item, i) => {
                    const isReserv  = item._kind === "reservation";
                    const isCoursItem = !isReserv && item.type === "cours";
                    const histTitre = isReserv
                      ? item.item_nom
                      : (isCoursItem ? item.cours_titre : (item.formation_titre || `Formation #${item.formation_id}`));
                    const histPrix = isReserv ? null : (isCoursItem ? item.cours_prix : item.formation_prix);
                    const isAccepted = item.statut === "acceptée";
                    const isCancelled = item.statut === "annulée";
                    const borderColor = isAccepted ? "#22c55e" : isCancelled ? "#94a3b8" : "#ef4444";

                    return (
                      <div className="adm-list-card" key={`${item._kind}-${item.id}`} style={{
                        animationDelay: `${i * 0.05}s`,
                        borderLeft: `4px solid ${borderColor}`,
                        opacity: 0.92,
                      }}>
                        <div className="adm-list-left">
                          <div className="adm-list-icon">
                            {isReserv ? (item.type === "salle" ? "🏢" : "🪑") : (isCoursItem ? "📘" : "🎓")}
                          </div>
                          <div>
                            <h3 className="adm-list-title">{histTitre}</h3>
                            <div className="adm-list-meta">
                              {/* Type pill */}
                              <span className={`adm-badge ${isReserv ? "badge-admin" : "badge-user"}`}>
                                {isReserv ? "Réservation" : (isCoursItem ? "Cours individuel" : "Formation complète")}
                              </span>
                              {isCoursItem && item.formation_titre && <span>📚 dans {item.formation_titre}</span>}
                              <span>👤 {item.user_name || item.user_email || `ID ${item.user_id}`}</span>
                              {isReserv && item.date && <span>📅 {item.date}</span>}
                              {isReserv && item.heure_debut && (
                                <span>⏱ {item.heure_debut} – {item.heure_fin}</span>
                              )}
                              {!isReserv && histPrix != null && (
                                <span>💰 {Number(histPrix).toLocaleString("fr-TN")} TND</span>
                              )}
                              {item.created_at && (
                                <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                                  🕓 {new Date(item.created_at).toLocaleDateString("fr-TN")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="adm-list-right">
                          {/* Statut badge (read-only in history) */}
                          {isAccepted ? (
                            <span className="adm-badge badge-actif">✅ Accepté(e)</span>
                          ) : isCancelled ? (
                            <span className="adm-badge badge-inactif" style={{ background: "#94a3b8" }}>
                              🚫 Annulée par l'utilisateur
                            </span>
                          ) : (
                            <span className="adm-badge badge-inactif">❌ Refusé(e)</span>
                          )}
                          {isReserv && (
                            <button className="adm-btn-sm adm-btn-edit" onClick={() => setResDetails(item)}>🔍 Détails</button>
                          )}
                          {/* Suppression libre depuis l'historique */}
                          <button
                            className="adm-btn-sm adm-btn-del"
                            onClick={() =>
                              isReserv
                                ? deleteReservation(item.id)
                                : deleteInscription(item.id)
                            }
                          >
                            🗑 Supprimer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}

        {/* ══ TAB: STATS ══ */}
        {activeTab === "stats" && (
          <>
            <div className="adm-toolbar">
              <h2 className="adm-section-title">Statistiques</h2>
            </div>

            {/* ── Taux d'occupation des salles ── */}
            <div className="adm-toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
              <h2 className="adm-section-title">🏢 Taux d'occupation des salles</h2>
              <div className="adm-toolbar-right">
                {[
                  { id: "7j",   label: "7 derniers jours" },
                  { id: "30j",  label: "30 derniers jours" },
                  { id: "mois", label: "Ce mois-ci" },
                ].map((p) => (
                  <button
                    key={p.id}
                    className="adm-btn-sm"
                    onClick={() => setOccupancyPeriod(p.id)}
                    style={{
                      border: "1.5px solid #1a6fc4",
                      background: occupancyPeriod === p.id ? "#1a6fc4" : "transparent",
                      color: occupancyPeriod === p.id ? "#fff" : "#1a6fc4",
                      fontWeight: 600,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="adm-stats-row">
              <div className="adm-stats-card">
                <h3 className="adm-stats-card-title">📐 Occupation moyenne</h3>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "10px 0" }}>
                  <span style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0b3d78" }}>
                    {Math.round(tauxOccupationMoyen)}%
                  </span>
                  <span style={{ color: "#78b8f0", fontSize: "0.85rem" }}>
                    sur {occupancyRange.days} jour{occupancyRange.days > 1 ? "s" : ""} · {HOURS_PER_DAY}h/jour ouvrées
                  </span>
                </div>
                <div className="adm-bar-track" style={{ height: 10 }}>
                  <div className="adm-bar-fill" style={{ width: `${Math.min(100, tauxOccupationMoyen)}%` }} />
                </div>
              </div>

              <div className="adm-stats-card">
                <h3 className="adm-stats-card-title">⏱ Heures réservées</h3>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "10px 0" }}>
                  <span style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0b3d78" }}>
                    {Math.round(totalHeuresReservees)}h
                  </span>
                  <span style={{ color: "#78b8f0", fontSize: "0.85rem" }}>
                    sur {salleOccupancy.length} salle{salleOccupancy.length > 1 ? "s" : ""} réservée{salleOccupancy.length > 1 ? "s" : ""}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#5a7ea8" }}>
                  Calculé à partir des réservations <strong>acceptées</strong> uniquement.
                </p>
              </div>

              <div className="adm-stats-card">
                <h3 className="adm-stats-card-title">🏆 Salle la plus demandée</h3>
                {salleLaPlusDemandee ? (
                  <>
                    <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#0b3d78", margin: "10px 0 4px" }}>
                      {salleLaPlusDemandee.nom}
                    </div>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#5a7ea8" }}>
                      {Math.round(salleLaPlusDemandee.taux)}% d'occupation · {salleLaPlusDemandee.reservations} réservation{salleLaPlusDemandee.reservations > 1 ? "s" : ""} · {Math.round(salleLaPlusDemandee.heures)}h
                    </p>
                  </>
                ) : (
                  <p style={{ color: "#94a3b8", marginTop: 10 }}>Aucune réservation de salle sur cette période.</p>
                )}
              </div>
            </div>

            {salleOccupancy.length > 0 && (
              <div className="adm-stats-row" style={{ gridTemplateColumns: "1fr" }}>
                <div className="adm-stats-card">
                  <h3 className="adm-stats-card-title">📊 Détail par salle</h3>
                  <div className="adm-bar-chart">
                    {salleOccupancy.map((s) => (
                      <div className="adm-bar-row" key={s.nom}>
                        <span className="adm-bar-label" title={s.nom}>{s.nom}</span>
                        <div className="adm-bar-track">
                          <div
                            className="adm-bar-fill"
                            style={{
                              width: `${Math.min(100, s.taux)}%`,
                              background: s.taux >= 75 ? "#ef4444" : s.taux >= 40 ? "#f59e0b" : "#22c55e",
                            }}
                          />
                        </div>
                        <span className="adm-bar-val">{Math.round(s.taux)}%</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ margin: "10px 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
                    🟢 &lt;40% (sous-utilisée) · 🟠 40–75% (équilibrée) · 🔴 ≥75% (forte demande — envisager d'ajouter des créneaux)
                  </p>
                </div>
              </div>
            )}

            <div className="adm-toolbar" style={{ marginTop: 8 }}>
              <h2 className="adm-section-title">Vue d'ensemble</h2>
            </div>
            <div className="adm-stats-row">

              <div className="adm-stats-card">
                <h3 className="adm-stats-card-title">👥 Rôles des utilisateurs</h3>
                <div className="adm-bar-chart">
                  {roleStats.map((r) => (
                    <div className="adm-bar-row" key={r.label}>
                      <span className="adm-bar-label">{r.label}</span>
                      <div className="adm-bar-track">
                        <div className="adm-bar-fill" style={{ width: `${(r.val / maxRole) * 100}%` }} />
                      </div>
                      <span className="adm-bar-val">{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="adm-stats-card">
                <h3 className="adm-stats-card-title">📊 Statuts des comptes</h3>
                <div className="adm-donut-wrap">
                  <div className="adm-donut" style={{ background: donutGradient }} />
                  <div className="adm-donut-legend">
                    {statutStats.map((s) => (
                      <div className="adm-donut-item" key={s.label}>
                        <div className="adm-dot" style={{ background: s.color }} />
                        <span>{s.label}</span>
                        <strong style={{ marginLeft: 4, color: "#0b3d78" }}>{s.val}</strong>
                        <span style={{ color: "#78b8f0" }}>({Math.round((s.val / totalStatut) * 100)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="adm-stats-card">
                <h3 className="adm-stats-card-title">📈 Activité plateforme</h3>
                <div className="adm-bar-chart">
                  {[
                    { label: "Utilisateurs",          val: kpis.total },
                    { label: "Réserv. en attente",    val: pendingReservations.length },
                    { label: "Inscript. en attente",  val: pendingInscriptions.length },
                    { label: "Traitées (historique)", val: kpis.historyCount },
                  ].map((r) => {
                    const max = Math.max(kpis.total, kpis.reservations, kpis.inscriptions, kpis.historyCount, 1);
                    return (
                      <div className="adm-bar-row" key={r.label}>
                        <span className="adm-bar-label">{r.label}</span>
                        <div className="adm-bar-track">
                          <div className="adm-bar-fill" style={{ width: `${(r.val / max) * 100}%` }} />
                        </div>
                        <span className="adm-bar-val">{r.val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            <div className="adm-toolbar" style={{ marginTop: 8 }}>
              <h2 className="adm-section-title">Derniers inscrits</h2>
            </div>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr><th>Utilisateur</th><th>Rôle</th><th>Statut</th><th>Date d'inscription</th></tr>
                </thead>
                <tbody>
                  {[...users]
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 8)
                    .map((u, i) => (
                      <tr key={u.id} style={{ animationDelay: `${i * 0.04}s` }}>
                        <td>
                          <div className="adm-user-cell">
                            <div className="adm-avatar">{initials(u.name || u.email)}</div>
                            <div>
                              <p className="adm-user-name">{u.name || "—"}</p>
                              <p className="adm-user-email">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td><span className={`adm-badge ${roleBadge(u.role)}`}>{u.role || "user"}</span></td>
                        <td><span className={`adm-badge ${statutBadge(u.statut || "actif")}`}>{u.statut || "actif"}</span></td>
                        <td>{u.created_at ? new Date(u.created_at).toLocaleDateString("fr-TN") : "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ════ MODALS ════ */}
      {modal && (
        <Modal
          title={modal.mode === "add" ? "Ajouter un utilisateur" : "Modifier l'utilisateur"}
          onClose={closeModal}
        >
          <div className="adm-form">
            <span className="adm-form-label">Nom complet</span>
            <input className="adm-form-input" type="text" placeholder="Ex: Ahmed Ben Ali"
              value={form.name || ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <span className="adm-form-label">Adresse email</span>
            <input className="adm-form-input" type="email" placeholder="exemple@mail.com"
              value={form.email || ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <span className="adm-form-label">
              {modal.mode === "add" ? "Mot de passe" : "Nouveau mot de passe (laisser vide = inchangé)"}
            </span>
            <input className="adm-form-input" type="password"
              placeholder={modal.mode === "add" ? "6 caractères minimum" : "Laisser vide pour ne pas changer"}
              value={form.password || ""} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            {isSuperAdmin && (
              <>
                <span className="adm-form-label">Rôle</span>
                <select className="adm-form-select" value={form.role || "user"}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                  <option value="user">Utilisateur</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </>
            )}
            <span className="adm-form-label">Statut</span>
            <select className="adm-form-select" value={form.statut || "actif"}
              onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}>
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
              <option value="suspendu">Suspendu</option>
            </select>
            <div className="adm-form-actions">
              <button className="adm-btn-cancel" onClick={closeModal}>Annuler</button>
              <button className="adm-btn-save" onClick={handleSave}>
                {modal.mode === "add" ? "Créer" : "Enregistrer"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {resDetails && (
        <Modal title="Détails de la réservation" onClose={() => setResDetails(null)}>
          <div className="adm-form" style={{ gap: 0 }}>
            {/* En-tête */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 12, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "1.4rem", background: "#eaf3fd", flexShrink: 0,
              }}>
                {resDetails.type === "salle" ? "🏢" : "🪑"}
              </div>
              <div>
                <h3 style={{ margin: 0, color: "#0b3d78", fontSize: "1.1rem" }}>{resDetails.item_nom || "—"}</h3>
                <span className={`adm-badge ${resDetails.type === "salle" ? "badge-user" : "badge-admin"}`} style={{ marginTop: 4, display: "inline-block" }}>
                  {resDetails.type === "salle" ? "Salle" : "Table"}
                </span>
              </div>
              <span
                className={`adm-badge ${
                  resDetails.statut === "acceptée" ? "badge-actif" :
                  resDetails.statut === "refusée"  ? "badge-inactif" :
                  resDetails.statut === "annulée"  ? "badge-inactif" :
                  "badge-suspendu"
                }`}
                style={{
                  marginLeft: "auto",
                  ...(resDetails.statut === "annulée" ? { background: "#94a3b8" } : {}),
                }}
              >
                {resDetails.statut === "acceptée" ? "✅ Acceptée" :
                 resDetails.statut === "refusée"  ? "❌ Refusée"  :
                 resDetails.statut === "annulée"  ? "🚫 Annulée"  :
                 "⏳ En attente"}
              </span>
            </div>

            {resDetails.statut === "annulée" && (
              <div style={{
                background: "rgba(148,163,184,0.15)",
                border: "1px solid rgba(148,163,184,0.4)",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 16,
                fontSize: "0.85rem",
                color: "#475569",
              }}>
                🚫 Cette réservation a été annulée par l'utilisateur.
              </div>
            )}

            {/* Détails en grille */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px",
              padding: "16px", background: "#f6faff", borderRadius: 12, marginBottom: 16,
            }}>
              <div>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "#78b8f0", fontWeight: 700, textTransform: "uppercase" }}>📅 Date</p>
                <p style={{ margin: "3px 0 0", color: "#0b3d78", fontWeight: 600 }}>{resDetails.date || "—"}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "#78b8f0", fontWeight: 700, textTransform: "uppercase" }}>⏱ Horaires</p>
                <p style={{ margin: "3px 0 0", color: "#0b3d78", fontWeight: 600 }}>
                  {resDetails.heure_debut && resDetails.heure_fin ? `${resDetails.heure_debut} – ${resDetails.heure_fin}` : "—"}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "#78b8f0", fontWeight: 700, textTransform: "uppercase" }}>⏳ Durée</p>
                <p style={{ margin: "3px 0 0", color: "#0b3d78", fontWeight: 600 }}>
                  {resDetails.nb_heures != null ? `${resDetails.nb_heures} h` : "—"}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "#78b8f0", fontWeight: 700, textTransform: "uppercase" }}>💰 Tarif</p>
                <p style={{ margin: "3px 0 0", color: "#0b3d78", fontWeight: 600 }}>
                  {resDetails.frais != null ? `${resDetails.frais} DT` : "—"}
                </p>
              </div>
              {resDetails.type === "salle" && Array.isArray(resDetails.table_ids) && resDetails.table_ids.length > 0 && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <p style={{ margin: 0, fontSize: "0.72rem", color: "#78b8f0", fontWeight: 700, textTransform: "uppercase" }}>🪑 Tables associées</p>
                  <p style={{ margin: "3px 0 0", color: "#0b3d78", fontWeight: 600 }}>
                    {resDetails.table_ids.map((id) => `#${id}`).join(", ")}
                  </p>
                </div>
              )}
              <div style={{ gridColumn: "1 / -1" }}>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "#78b8f0", fontWeight: 700, textTransform: "uppercase" }}>👤 Réservé par</p>
                <p style={{ margin: "3px 0 0", color: "#0b3d78", fontWeight: 600 }}>
                  {resDetails.user_name || "—"}
                  {resDetails.user_email && (
                    <span style={{ color: "#5a7ba6", fontWeight: 400 }}> — {resDetails.user_email}</span>
                  )}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "#78b8f0", fontWeight: 700, textTransform: "uppercase" }}>🆔 ID réservation</p>
                <p style={{ margin: "3px 0 0", color: "#0b3d78", fontWeight: 600 }}>#{resDetails.id}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "#78b8f0", fontWeight: 700, textTransform: "uppercase" }}>🕓 Demande créée le</p>
                <p style={{ margin: "3px 0 0", color: "#0b3d78", fontWeight: 600 }}>
                  {resDetails.created_at ? new Date(resDetails.created_at).toLocaleString("fr-TN") : "—"}
                </p>
              </div>
            </div>

            <div className="adm-form-actions">
              <button className="adm-btn-cancel" onClick={() => setResDetails(null)}>Fermer</button>
              {(!resDetails.statut || resDetails.statut === "en_attente") && (
                <>
                  <button
                    className="adm-btn-save"
                    style={{ background: "#22c55e" }}
                    onClick={() => { updateStatutReservation(resDetails.id, "acceptée"); setResDetails(null); }}
                  >
                    ✅ Accepter
                  </button>
                  <button
                    className="adm-btn-save"
                    style={{ background: "#ef4444" }}
                    onClick={() => { updateStatutReservation(resDetails.id, "refusée"); setResDetails(null); }}
                  >
                    ❌ Refuser
                  </button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Confirmer la suppression" onClose={() => setDeleteConfirm(null)}>
          <div className="adm-form">
            <p className="adm-delete-msg">
              Voulez-vous vraiment supprimer <strong>{deleteConfirm.name || deleteConfirm.email}</strong> ?
              <br />
              <span style={{ fontSize: 12, color: "#c0392b" }}>Cette action est irréversible.</span>
            </p>
            <div className="adm-form-actions">
              <button className="adm-btn-cancel" onClick={() => setDeleteConfirm(null)}>Annuler</button>
              <button className="adm-btn-del-confirm" onClick={handleDelete}>Supprimer</button>
            </div>
          </div>
        </Modal>
      )}

      {formationModal && (
        <Modal
          title={formationModal.mode === "add" ? "Nouvelle formation" : "Modifier la formation"}
          onClose={closeFormationModal}
        >
          <div className="adm-form">
            <span className="adm-form-label">Titre</span>
            <input
              className="adm-form-input" type="text" placeholder="Ex: Data Science avec Python"
              value={formationForm.titre || ""}
              onChange={(e) => setFormationForm((f) => ({ ...f, titre: e.target.value }))}
            />

            <span className="adm-form-label">Description</span>
            <textarea
              className="adm-form-input" rows={3} placeholder="Courte description de la formation"
              style={{ resize: "vertical", fontFamily: "inherit" }}
              value={formationForm.description || ""}
              onChange={(e) => setFormationForm((f) => ({ ...f, description: e.target.value }))}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
              <div>
                <span className="adm-form-label">Catégorie</span>
                <select
                  className="adm-form-select"
                  value={formationForm.tag || "Tech"}
                  onChange={(e) => setFormationForm((f) => ({ ...f, tag: e.target.value, categorie: e.target.value }))}
                >
                  {FORMATION_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <span className="adm-form-label">Durée</span>
                <input
                  className="adm-form-input" type="text" placeholder="Ex: 6 semaines"
                  value={formationForm.duree || ""}
                  onChange={(e) => setFormationForm((f) => ({ ...f, duree: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 14px" }}>
              <div>
                <span className="adm-form-label">Prix (TND)</span>
                <input
                  className="adm-form-input" type="number" min="0" placeholder="Ex: 250"
                  value={formationForm.prix ?? ""}
                  onChange={(e) => setFormationForm((f) => ({ ...f, prix: e.target.value }))}
                />
              </div>
              <div>
                <span className="adm-form-label">Min. participants</span>
                <input
                  className="adm-form-input" type="number" min="0" placeholder="Ex: 5"
                  value={formationForm.minParticipants ?? ""}
                  onChange={(e) => setFormationForm((f) => ({ ...f, minParticipants: e.target.value }))}
                />
              </div>
              <div>
                <span className="adm-form-label">Max. participants</span>
                <input
                  className="adm-form-input" type="number" min="0" placeholder="Ex: 20"
                  value={formationForm.maxParticipants ?? ""}
                  onChange={(e) => setFormationForm((f) => ({ ...f, maxParticipants: e.target.value }))}
                />
              </div>
            </div>

            {/* ── Modules ── */}
            <div style={{ marginTop: 6, marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="adm-form-label" style={{ margin: 0 }}>Modules ({(formationForm.modules || []).length})</span>
              <button
                type="button"
                className="adm-btn-sm adm-btn-edit"
                onClick={addModuleRow}
              >
                ＋ Ajouter un module
              </button>
            </div>

            {(formationForm.modules || []).length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "2px 0 8px" }}>
                Aucun module — la formation apparaîtra sans programme détaillé.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                {formationForm.modules.map((m, idx) => (
                  <div key={idx} style={{
                    display: "grid", gridTemplateColumns: "1fr 110px 100px auto",
                    gap: 8, alignItems: "center",
                    background: "rgba(148,163,184,0.08)", borderRadius: 10, padding: "8px 10px",
                  }}>
                    <input
                      className="adm-form-input" type="text" placeholder="Titre du module"
                      style={{ margin: 0 }}
                      value={m.titre || ""}
                      onChange={(e) => updateModuleRow(idx, "titre", e.target.value)}
                    />
                    <input
                      className="adm-form-input" type="text" placeholder="Durée"
                      style={{ margin: 0 }}
                      value={m.duree || ""}
                      onChange={(e) => updateModuleRow(idx, "duree", e.target.value)}
                    />
                    <input
                      className="adm-form-input" type="number" min="0" placeholder="Prix"
                      style={{ margin: 0 }}
                      value={m.prix ?? ""}
                      onChange={(e) => updateModuleRow(idx, "prix", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeModuleRow(idx)}
                      title="Retirer ce module"
                      style={{
                        background: "none", border: "none", color: "#ef4444",
                        cursor: "pointer", fontSize: "1.1rem", padding: "0 4px",
                      }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* ── Sessions ── */}
            <div style={{ marginTop: 6, marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="adm-form-label" style={{ margin: 0 }}>Sessions ({(formationForm.sessions || []).length})</span>
              <button
                type="button"
                className="adm-btn-sm adm-btn-edit"
                onClick={addSessionRow}
              >
                ＋ Ajouter une session
              </button>
            </div>

            {(formationForm.sessions || []).length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "2px 0 8px" }}>
                Aucune session planifiée — ajoutez une date pour proposer une session concrète aux participants.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 }}>
                {formationForm.sessions.map((s, idx) => (
                  <div key={idx} style={{
                    display: "flex", flexDirection: "column", gap: 6,
                    background: "rgba(148,163,184,0.08)", borderRadius: 10, padding: "10px 12px",
                  }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        className="adm-form-input" type="text" placeholder="Ex: Session Janvier 2027"
                        style={{ margin: 0, flex: 1 }}
                        value={s.titre || ""}
                        onChange={(e) => updateSessionRow(idx, "titre", e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeSessionRow(idx)}
                        title="Retirer cette session"
                        style={{
                          background: "none", border: "none", color: "#ef4444",
                          cursor: "pointer", fontSize: "1.1rem", padding: "0 4px",
                        }}
                      >✕</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 90px", gap: 8 }}>
                      <div>
                        <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Début</span>
                        <input
                          className="adm-form-input" type="date" style={{ margin: 0 }}
                          value={s.dateDebut || ""}
                          onChange={(e) => updateSessionRow(idx, "dateDebut", e.target.value)}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Fin</span>
                        <input
                          className="adm-form-input" type="date" style={{ margin: 0 }}
                          value={s.dateFin || ""}
                          onChange={(e) => updateSessionRow(idx, "dateFin", e.target.value)}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Lieu</span>
                        <input
                          className="adm-form-input" type="text" placeholder="Ex: Salle A / En ligne"
                          style={{ margin: 0 }}
                          value={s.lieu || ""}
                          onChange={(e) => updateSessionRow(idx, "lieu", e.target.value)}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Places</span>
                        <input
                          className="adm-form-input" type="number" min="0"
                          placeholder={String(formationForm.maxParticipants ?? "")}
                          style={{ margin: 0 }}
                          value={s.capacite ?? ""}
                          onChange={(e) => updateSessionRow(idx, "capacite", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="adm-form-actions">
              <button className="adm-btn-cancel" onClick={closeFormationModal}>Annuler</button>
              <button className="adm-btn-save" onClick={handleSaveFormation}>
                {formationModal.mode === "add" ? "Créer" : "Enregistrer"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {formationDeleteConfirm && (
        <Modal title="Confirmer la suppression" onClose={() => setFormationDeleteConfirm(null)}>
          <div className="adm-form">
            <p className="adm-delete-msg">
              Voulez-vous vraiment supprimer la formation <strong>{formationDeleteConfirm.titre}</strong> ?
              <br />
              <span style={{ fontSize: 12, color: "#c0392b" }}>
                Cette action est irréversible et supprimera aussi ses modules associés.
              </span>
            </p>
            <div className="adm-form-actions">
              <button className="adm-btn-cancel" onClick={() => setFormationDeleteConfirm(null)}>Annuler</button>
              <button className="adm-btn-del-confirm" onClick={handleDeleteFormation}>Supprimer</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default AdminDashboard;