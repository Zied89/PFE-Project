import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const API = "http://localhost:5000/api";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
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

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
function AdminDashboard({ user, setUser }) {
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === "superadmin";

  /* ── State ── */
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("tous");
  const [statutFilter, setStatutFilter] = useState("tous");

  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  /* ── Toast helper ── */
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
        fetch(`${API}/admin/reservations`, { headers: authHeaders() }),
        fetch(`${API}/admin/inscriptions`, { headers: authHeaders() }),
      ]);

      // Graceful fallback: if endpoint doesn't exist yet, use empty array
      const uData = uRes.ok ? await uRes.json() : { users: [] };
      const rData = rRes.ok ? await rRes.json() : { reservations: [] };
      const iData = iRes.ok ? await iRes.json() : { inscriptions: [] };

      setUsers(uData.users || []);
      setReservations(rData.reservations || []);
      setInscriptions(iData.inscriptions || []);
    } catch (err) {
      showToast("Impossible de charger les données.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Filtered users ── */
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      searchTerm === "" ||
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === "tous" || u.role === roleFilter;
    const matchStatut = statutFilter === "tous" || u.statut === statutFilter;
    return matchSearch && matchRole && matchStatut;
  });

  /* ── KPI calculations ── */
  const kpis = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin" || u.role === "superadmin").length,
    actifs: users.filter((u) => u.statut === "actif").length,
    reservations: reservations.length,
    inscriptions: inscriptions.length,
  };

  /* ── User CRUD ── */
  const openAdd = () => {
    setForm({ name: "", email: "", password: "", role: "user", statut: "actif" });
    setModal({ mode: "add" });
  };

  const openEdit = (u) => {
    setForm({ ...u, password: "" });
    setModal({ mode: "edit", data: u });
  };

  const closeModal = () => { setModal(null); setForm({}); };

  const handleSave = async () => {
    if (!form.name || !form.email) return showToast("Nom et email requis.", "error");
    const isEdit = modal.mode === "edit";
    const url = isEdit
      ? `${API}/admin/users/${modal.data.id}`
      : `${API}/admin/users`;
    const body = { ...form };
    if (isEdit && !body.password) delete body.password;

    try {
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        return showToast(d.message || "Erreur serveur.", "error");
      }
      closeModal();
      fetchAll();
      showToast(isEdit ? "Utilisateur mis à jour." : "Utilisateur créé avec succès.");
    } catch {
      showToast("Erreur de connexion au serveur.", "error");
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API}/admin/users/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) return showToast("Erreur lors de la suppression.", "error");
      setDeleteConfirm(null);
      fetchAll();
      showToast("Utilisateur supprimé.");
    } catch {
      showToast("Erreur de connexion au serveur.", "error");
    }
  };

  const changeStatut = async (u, newStatut) => {
    try {
      await fetch(`${API}/admin/users/${u.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ ...u, statut: newStatut }),
      });
      fetchAll();
      showToast(`Statut de ${u.name} → ${newStatut}.`);
    } catch {
      showToast("Erreur lors du changement de statut.", "error");
    }
  };

  const changeRole = async (u, newRole) => {
    if (!isSuperAdmin) return showToast("Seul le superadmin peut changer les rôles.", "error");
    try {
      await fetch(`${API}/admin/users/${u.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ ...u, role: newRole }),
      });
      fetchAll();
      showToast(`Rôle de ${u.name} → ${newRole}.`);
    } catch {
      showToast("Erreur lors du changement de rôle.", "error");
    }
  };

  const cancelReservation = async (id) => {
    try {
      await fetch(`${API}/coworking/reservations/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      fetchAll();
      showToast("Réservation annulée.");
    } catch {
      showToast("Erreur lors de l'annulation.", "error");
    }
  };

  /* ── Stats data ── */
  const roleStats = [
    { label: "Utilisateurs", val: users.filter((u) => u.role === "user").length },
    { label: "Admins", val: users.filter((u) => u.role === "admin").length },
    { label: "Superadmins", val: users.filter((u) => u.role === "superadmin").length },
  ];
  const maxRole = Math.max(...roleStats.map((r) => r.val), 1);

  const statutStats = [
    { label: "Actifs", val: users.filter((u) => u.statut === "actif").length, color: "#4dd6a0" },
    { label: "Inactifs", val: users.filter((u) => u.statut === "inactif").length, color: "#5ab4ff" },
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
    { id: "users", label: "Utilisateurs", icon: "👥", count: kpis.total },
    { id: "reservations", label: "Réservations", icon: "📅", count: kpis.reservations },
    { id: "inscriptions", label: "Inscriptions", icon: "🎓", count: kpis.inscriptions },
    { id: "stats", label: "Statistiques", icon: "📊", count: null },
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
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="brand-icon">⚡</div>
          <span className="brand-name">TZ Prime Solutions</span>
        </div>
        <div className="navbar-links">
          <div className="navbar-user">
            <span className="user-dot" />
            {user?.name || user?.email}
            <span className="adm-role-badge">{user?.role}</span>
          </div>
          <button className="btn-nav" onClick={() => navigate("/choose-services")}>
            ← Services
          </button>
          <button className="btn-nav" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="adm-hero">
        <p className="adm-hero-eyebrow">🛡 Panneau d'administration</p>
        <h1 className="adm-hero-title">Dashboard Admin</h1>
        <p className="adm-hero-sub">
          Gérez les utilisateurs, réservations et inscriptions de la plateforme.
        </p>
        <div className="adm-hero-divider" />
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
          { icon: "👥", val: kpis.total, label: "Utilisateurs" },
          { icon: "🛡", val: kpis.admins, label: "Admins" },
          { icon: "✅", val: kpis.actifs, label: "Comptes actifs" },
          { icon: "📅", val: kpis.reservations, label: "Réservations" },
          { icon: "🎓", val: kpis.inscriptions, label: "Inscriptions" },
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
      <div className="adm-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`adm-tab${activeTab === t.id ? " active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.icon} {t.label}
            {t.count !== null && (
              <span className="adm-tab-badge">{t.count}</span>
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
                {/* Search */}
                <div className="adm-search">
                  <span className="adm-search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {/* Role filter */}
                <select
                  className="adm-filter-select"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="tous">Tous les rôles</option>
                  <option value="user">Utilisateur</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
                {/* Statut filter */}
                <select
                  className="adm-filter-select"
                  value={statutFilter}
                  onChange={(e) => setStatutFilter(e.target.value)}
                >
                  <option value="tous">Tous les statuts</option>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="suspendu">Suspendu</option>
                </select>
                {/* Add user */}
                {isSuperAdmin && (
                  <button className="adm-btn-add" onClick={openAdd}>
                    ＋ Ajouter
                  </button>
                )}
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="adm-empty">
                <div className="adm-empty-icon">🔍</div>
                <p>Aucun utilisateur trouvé.</p>
                <p className="adm-empty-sub">Modifiez vos filtres ou ajoutez un utilisateur.</p>
              </div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Utilisateur</th>
                      <th>Rôle</th>
                      <th>Statut</th>
                      <th>Créé le</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, i) => (
                      <tr key={u.id} style={{ animationDelay: `${i * 0.04}s` }}>
                        {/* User info */}
                        <td>
                          <div className="adm-user-cell">
                            <div className="adm-avatar">{initials(u.name || u.email)}</div>
                            <div>
                              <p className="adm-user-name">{u.name || "—"}</p>
                              <p className="adm-user-email">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td>
                          <span className={`adm-badge ${roleBadge(u.role)}`}>
                            {u.role || "user"}
                          </span>
                        </td>

                        {/* Statut */}
                        <td>
                          <span className={`adm-badge ${statutBadge(u.statut || "actif")}`}>
                            {u.statut || "actif"}
                          </span>
                        </td>

                        {/* Date */}
                        <td>
                          {u.created_at
                            ? new Date(u.created_at).toLocaleDateString("fr-TN")
                            : "—"}
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="adm-actions">
                            {/* Edit */}
                            <button className="adm-btn-sm adm-btn-edit" onClick={() => openEdit(u)}>
                              ✏ Modifier
                            </button>

                            {/* Role change (superadmin only) */}
                            {isSuperAdmin && u.role !== "superadmin" && (
                              <button
                                className="adm-btn-sm adm-btn-role"
                                onClick={() =>
                                  changeRole(u, u.role === "admin" ? "user" : "admin")
                                }
                              >
                                {u.role === "admin" ? "⬇ User" : "⬆ Admin"}
                              </button>
                            )}

                            {/* Suspend / Activate */}
                            {u.statut === "actif" ? (
                              <button
                                className="adm-btn-sm adm-btn-warn"
                                onClick={() => changeStatut(u, "suspendu")}
                              >
                                ⏸ Suspendre
                              </button>
                            ) : (
                              <button
                                className="adm-btn-sm adm-btn-success"
                                onClick={() => changeStatut(u, "actif")}
                              >
                                ▶ Activer
                              </button>
                            )}

                            {/* Delete (superadmin only, can't delete self) */}
                            {isSuperAdmin && u.id !== user?.id && (
                              <button
                                className="adm-btn-sm adm-btn-danger"
                                onClick={() => setDeleteConfirm(u)}
                              >
                                🗑 Supprimer
                              </button>
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

        {/* ══ TAB: RESERVATIONS ══ */}
        {activeTab === "reservations" && (
          <>
            <div className="adm-toolbar">
              <h2 className="adm-section-title">Toutes les réservations</h2>
            </div>
            {reservations.length === 0 ? (
              <div className="adm-empty">
                <div className="adm-empty-icon">📭</div>
                <p>Aucune réservation enregistrée.</p>
                <p className="adm-empty-sub">Les réservations des utilisateurs apparaîtront ici.</p>
              </div>
            ) : (
              <div className="adm-list">
                {reservations.map((r, i) => (
                  <div className="adm-list-card" key={r.id} style={{ animationDelay: `${i * 0.06}s` }}>
                    <div className="adm-list-left">
                      <div className="adm-list-icon">
                        {r.type === "salle" ? "🏢" : "🪑"}
                      </div>
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
                      <span className={`adm-badge ${statutBadge(r.statut || "actif")}`}>
                        {r.statut || "confirmée"}
                      </span>
                      <button
                        className="adm-btn-sm adm-btn-danger"
                        onClick={() => cancelReservation(r.id)}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ TAB: INSCRIPTIONS ══ */}
        {activeTab === "inscriptions" && (
          <>
            <div className="adm-toolbar">
              <h2 className="adm-section-title">Toutes les inscriptions</h2>
            </div>
            {inscriptions.length === 0 ? (
              <div className="adm-empty">
                <div className="adm-empty-icon">🎓</div>
                <p>Aucune inscription enregistrée.</p>
                <p className="adm-empty-sub">Les inscriptions aux formations apparaîtront ici.</p>
              </div>
            ) : (
              <div className="adm-list">
                {inscriptions.map((ins, i) => (
                  <div className="adm-list-card" key={ins.id} style={{ animationDelay: `${i * 0.06}s` }}>
                    <div className="adm-list-left">
                      <div className="adm-list-icon">🎓</div>
                      <div>
                        <h3 className="adm-list-title">{ins.formation_titre || `Formation #${ins.formation_id}`}</h3>
                        <div className="adm-list-meta">
                          <span>👤 {ins.user_name || ins.user_email || `ID ${ins.user_id}`}</span>
                          {ins.created_at && (
                            <span>📅 {new Date(ins.created_at).toLocaleDateString("fr-TN")}</span>
                          )}
                          {ins.prix && (
                            <span>💰 {Number(ins.prix).toLocaleString("fr-TN")} TND</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="adm-list-right">
                      <span className="adm-badge badge-actif">Inscrit</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ TAB: STATS ══ */}
        {activeTab === "stats" && (
          <>
            <div className="adm-toolbar">
              <h2 className="adm-section-title">Statistiques</h2>
            </div>
            <div className="adm-stats-row">

              {/* Répartition par rôle */}
              <div className="adm-stats-card">
                <h3 className="adm-stats-card-title">👥 Rôles des utilisateurs</h3>
                <div className="adm-bar-chart">
                  {roleStats.map((r) => (
                    <div className="adm-bar-row" key={r.label}>
                      <span className="adm-bar-label">{r.label}</span>
                      <div className="adm-bar-track">
                        <div
                          className="adm-bar-fill"
                          style={{ width: `${(r.val / maxRole) * 100}%` }}
                        />
                      </div>
                      <span className="adm-bar-val">{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Répartition par statut (donut) */}
              <div className="adm-stats-card">
                <h3 className="adm-stats-card-title">📊 Statuts des comptes</h3>
                <div className="adm-donut-wrap">
                  <div
                    className="adm-donut"
                    style={{ background: donutGradient }}
                  />
                  <div className="adm-donut-legend">
                    {statutStats.map((s) => (
                      <div className="adm-donut-item" key={s.label}>
                        <div className="adm-dot" style={{ background: s.color }} />
                        <span>{s.label}</span>
                        <strong style={{ marginLeft: 4, color: "#0b3d78" }}>{s.val}</strong>
                        <span style={{ color: "#78b8f0" }}>
                          ({Math.round((s.val / totalStatut) * 100)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Activité récente */}
              <div className="adm-stats-card">
                <h3 className="adm-stats-card-title">📈 Activité plateforme</h3>
                <div className="adm-bar-chart">
                  {[
                    { label: "Utilisateurs", val: kpis.total },
                    { label: "Réservations", val: kpis.reservations },
                    { label: "Inscriptions", val: kpis.inscriptions },
                  ].map((r) => {
                    const max = Math.max(kpis.total, kpis.reservations, kpis.inscriptions, 1);
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

            {/* Recent users table */}
            <div className="adm-toolbar" style={{ marginTop: 8 }}>
              <h2 className="adm-section-title">Derniers inscrits</h2>
            </div>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Date d'inscription</th>
                  </tr>
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

      {/* Edit / Add user modal */}
      {modal && (
        <Modal
          title={modal.mode === "add" ? "Ajouter un utilisateur" : "Modifier l'utilisateur"}
          onClose={closeModal}
        >
          <div className="adm-form">
            <span className="adm-form-label">Nom complet</span>
            <input
              className="adm-form-input"
              type="text"
              placeholder="Ex: Ahmed Ben Ali"
              value={form.name || ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />

            <span className="adm-form-label">Adresse email</span>
            <input
              className="adm-form-input"
              type="email"
              placeholder="exemple@mail.com"
              value={form.email || ""}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />

            <span className="adm-form-label">
              {modal.mode === "add" ? "Mot de passe" : "Nouveau mot de passe (laisser vide = inchangé)"}
            </span>
            <input
              className="adm-form-input"
              type="password"
              placeholder={modal.mode === "add" ? "6 caractères minimum" : "Laisser vide pour ne pas changer"}
              value={form.password || ""}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />

            {isSuperAdmin && (
              <>
                <span className="adm-form-label">Rôle</span>
                <select
                  className="adm-form-select"
                  value={form.role || "user"}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="user">Utilisateur</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </>
            )}

            <span className="adm-form-label">Statut</span>
            <select
              className="adm-form-select"
              value={form.statut || "actif"}
              onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}
            >
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

      {/* Delete confirm modal */}
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