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
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("tous");
  const [statutFilter, setStatutFilter] = useState("tous");

  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // ── History filters
  const [histTypeFilter, setHistTypeFilter] = useState("tous");   // "tous" | "reservations" | "inscriptions"
  const [histStatutFilter, setHistStatutFilter] = useState("tous"); // "tous" | "acceptée" | "refusée"

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Fetch all data ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, rRes, iRes] = await Promise.all([
        fetch(`${API}/admin/users`, { headers: authHeaders() }),
        fetch(`${API}/coworking/reservations`, { headers: authHeaders() }),
        fetch(`${API}/formations/inscriptions/all`, { headers: authHeaders() }),
      ]);

      const uData = uRes.ok ? await uRes.json() : { users: [] };
      const rData = rRes.ok ? await rRes.json() : { reservations: [] };
      const iData = iRes.ok ? await iRes.json() : { inscriptions: [] };

      setUsers(uData.users || []);
      setReservations(rData.reservations || []);
      setInscriptions(iData.inscriptions || []);

      // Charger l'historique des achats depuis localStorage
      try {
        const stored = JSON.parse(localStorage.getItem("tz_purchases_history") || "[]");
        setPurchases(stored);
      } catch { setPurchases([]); }
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

  // History = acceptée or refusée
  const historyReservations = reservations.filter(
    (r) => r.statut === "acceptée" || r.statut === "refusée"
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
  const updateStatutReservation = async (id, statut) => {
    try {
      const res = await fetch(`${API}/coworking/reservations/${id}/statut`, {
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
          ? "✅ Réservation acceptée — déplacée dans l'historique."
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

  const handleLogout = () => { setUser(null); navigate("/login"); };

  /* ── TABS config ── */
  const TABS = [
    { id: "users",        label: "Utilisateurs", icon: "👥", count: kpis.total,               pending: 0 },
    { id: "reservations", label: "Réservations",  icon: "📅", count: pendingReservations.length, pending: pendingReservations.length },
    { id: "inscriptions", label: "Inscriptions",  icon: "🎓", count: pendingInscriptions.length,  pending: pendingInscriptions.length },
    { id: "achats",       label: "Achats",         icon: "🛒", count: purchases.length,           pending: purchases.filter(p => p.statut === "en_attente").length },
    { id: "historique",   label: "Historique",    icon: "🕓", count: kpis.historyCount,          pending: 0 },
    { id: "stats",        label: "Statistiques",  icon: "📊", count: null,                       pending: 0 },
  ];

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
                {pendingInscriptions.map((ins, i) => (
                  <div className="adm-list-card" key={ins.id} style={{
                    animationDelay: `${i * 0.06}s`,
                    borderLeft: "4px solid #f59e0b",
                  }}>
                    <div className="adm-list-left">
                      <div className="adm-list-icon">🎓</div>
                      <div>
                        <h3 className="adm-list-title">{ins.formation_titre || `Formation #${ins.formation_id}`}</h3>
                        <div className="adm-list-meta">
                          <span>👤 {ins.user_name || ins.user_email || `ID ${ins.user_id}`}</span>
                          {ins.created_at && <span>📅 {new Date(ins.created_at).toLocaleDateString("fr-TN")}</span>}
                          {ins.prix && <span>💰 {Number(ins.prix).toLocaleString("fr-TN")} TND</span>}
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
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ TAB: ACHATS (Formation purchases) ══ */}
        {activeTab === "achats" && (
          <>
            <div className="adm-toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
              <h2 className="adm-section-title">
                Historique des Achats Formation
                <span style={{ marginLeft: 10, fontSize: "0.78rem", background: "#d4a843", color: "#1a1206", borderRadius: 20, padding: "2px 10px", fontWeight: 800 }}>
                  🛒 {purchases.length} commande{purchases.length !== 1 ? "s" : ""}
                </span>
              </h2>
              <div className="adm-toolbar-right" style={{ gap: 4 }}>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", padding: "5px 10px" }}>
                  Données locales — mise à jour en temps réel
                </span>
                {purchases.length > 0 && isSuperAdmin && (
                  <button
                    onClick={() => { localStorage.removeItem("tz_purchases_history"); setPurchases([]); showToast("Historique d'achats vidé."); }}
                    style={{ padding: "5px 13px", borderRadius: 20, border: "1.5px solid #ef4444", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", background: "transparent", color: "#ef4444" }}
                  >🗑 Vider</button>
                )}
              </div>
            </div>

            {purchases.length === 0 ? (
              <div className="adm-empty">
                <div className="adm-empty-icon">🛒</div>
                <p>Aucun achat enregistré.</p>
                <p className="adm-empty-sub">Les achats effectués sur la page Formation apparaîtront ici.</p>
              </div>
            ) : (
              <div className="adm-list">
                {purchases.map((purchase, i) => {
                  const totalPurchase = purchase.total || purchase.items?.reduce((a, f) => a + Number(f.prix || 0), 0) || 0;
                  const dateStr = purchase.date ? new Date(purchase.date).toLocaleString("fr-TN") : "—";
                  const isAccepted = purchase.statut === "acceptée";
                  const isRefused  = purchase.statut === "refusée";
                  const isPending  = !isAccepted && !isRefused;

                  return (
                    <div className="adm-list-card" key={purchase.id} style={{
                      animationDelay: `${i * 0.05}s`,
                      borderLeft: `4px solid ${isPending ? "#d4a843" : isAccepted ? "#22c55e" : "#ef4444"}`,
                      background: "rgba(255,255,255,0.025)",
                    }}>
                      {/* Header de la commande */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%", flexWrap: "wrap", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            <div className="adm-list-icon">🛒</div>
                            <div>
                              <h3 className="adm-list-title" style={{ margin: 0 }}>
                                Commande #{purchase.id?.split("_")[1] || i + 1}
                              </h3>
                              <div className="adm-list-meta" style={{ marginTop: 4 }}>
                                <span>👤 {purchase.userName || `User #${purchase.userId}`}</span>
                                <span>🕓 {dateStr}</span>
                                <span style={{ color: "#d4a843", fontWeight: 700 }}>
                                  💰 {totalPurchase.toLocaleString("fr-TN")} TND
                                </span>
                                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                  {purchase.items?.length || 0} article{(purchase.items?.length || 0) > 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Items de la commande */}
                          <div style={{
                            marginLeft: 48, display: "flex", flexWrap: "wrap", gap: 6,
                          }}>
                            {(purchase.items || []).map((item, j) => (
                              <div key={j} style={{
                                display: "flex", alignItems: "center", gap: 6,
                                padding: "4px 10px",
                                background: "rgba(212,168,67,0.08)",
                                border: "1px solid rgba(212,168,67,0.2)",
                                borderRadius: 8,
                                fontSize: "0.78rem",
                              }}>
                                {item.icon && <span>{item.icon}</span>}
                                <span style={{ color: "#e2c97e" }}>{item.titre}</span>
                                {item.tag && (
                                  <span style={{
                                    fontSize: "0.65rem", padding: "1px 6px",
                                    background: "rgba(255,255,255,0.07)", borderRadius: 20,
                                    color: "#94a3b8",
                                  }}>{item.tag}</span>
                                )}
                                <span style={{ color: "#d4a843", fontWeight: 700 }}>
                                  {Number(item.prix).toLocaleString("fr-TN")} TND
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Statut + actions */}
                        <div className="adm-list-right" style={{ flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                          {isPending && (
                            <span className="adm-badge badge-suspendu">⏳ En attente</span>
                          )}
                          {isAccepted && (
                            <span className="adm-badge badge-actif">✅ Accepté</span>
                          )}
                          {isRefused && (
                            <span className="adm-badge badge-inactif">❌ Refusé</span>
                          )}

                          {/* Admin peut changer le statut de la commande */}
                          {isPending && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                className="adm-btn-sm adm-btn-success"
                                onClick={() => {
                                  const updated = purchases.map(p =>
                                    p.id === purchase.id ? { ...p, statut: "acceptée" } : p
                                  );
                                  setPurchases(updated);
                                  localStorage.setItem("tz_purchases_history", JSON.stringify(updated));
                                  showToast("✅ Commande acceptée.");
                                }}
                              >✅ Accepter</button>
                              <button
                                className="adm-btn-sm adm-btn-warn"
                                onClick={() => {
                                  const updated = purchases.map(p =>
                                    p.id === purchase.id ? { ...p, statut: "refusée" } : p
                                  );
                                  setPurchases(updated);
                                  localStorage.setItem("tz_purchases_history", JSON.stringify(updated));
                                  showToast("❌ Commande refusée.");
                                }}
                              >❌ Refuser</button>
                            </div>
                          )}

                          {isSuperAdmin && (
                            <button
                              className="adm-btn-sm adm-btn-del"
                              onClick={() => {
                                const updated = purchases.filter(p => p.id !== purchase.id);
                                setPurchases(updated);
                                localStorage.setItem("tz_purchases_history", JSON.stringify(updated));
                                showToast("🗑 Commande supprimée.");
                              }}
                            >🗑 Supprimer</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

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
                  { key: "reservations",  label: "📅 Réservations",  color: "#8b5cf6" },
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
                    const isAccepted = item.statut === "acceptée";
                    const borderColor = isAccepted ? "#22c55e" : "#ef4444";

                    return (
                      <div className="adm-list-card" key={`${item._kind}-${item.id}`} style={{
                        animationDelay: `${i * 0.05}s`,
                        borderLeft: `4px solid ${borderColor}`,
                        opacity: 0.92,
                      }}>
                        <div className="adm-list-left">
                          <div className="adm-list-icon">
                            {isReserv ? (item.type === "salle" ? "🏢" : "🪑") : "🎓"}
                          </div>
                          <div>
                            <h3 className="adm-list-title">
                              {isReserv
                                ? item.item_nom
                                : (item.formation_titre || `Formation #${item.formation_id}`)}
                            </h3>
                            <div className="adm-list-meta">
                              {/* Type pill */}
                              <span className={`adm-badge ${isReserv ? "badge-admin" : "badge-user"}`}>
                                {isReserv ? "Réservation" : "Inscription"}
                              </span>
                              <span>👤 {item.user_name || item.user_email || `ID ${item.user_id}`}</span>
                              {isReserv && item.date && <span>📅 {item.date}</span>}
                              {isReserv && item.heure_debut && (
                                <span>⏱ {item.heure_debut} – {item.heure_fin}</span>
                              )}
                              {!isReserv && item.prix && (
                                <span>💰 {Number(item.prix).toLocaleString("fr-TN")} TND</span>
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
                          ) : (
                            <span className="adm-badge badge-inactif">❌ Refusé(e)</span>
                          )}
                          {/* Superadmin can still delete from history */}
                          {isSuperAdmin && (
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
                          )}
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
    </div>
  );
}

export default AdminDashboard;