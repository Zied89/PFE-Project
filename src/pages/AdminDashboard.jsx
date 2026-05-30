import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

// ✅ Port corrigé : 5000
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

function AdminDashboard({ user, setUser }) {
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === "superadmin";


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
  const [reservFilter, setReservFilter] = useState("tous");
  const [inscFilter, setInscFilter] = useState("tous");


  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Fetch all data ── */
  // ✅ Routes corrigées : /coworking/reservations et /formations/inscriptions/all
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
  const pendingReservations = reservations.filter(r => r.statut === "en_attente" || !r.statut || r.statut === "confirmée").length;
  const pendingInscriptions = inscriptions.filter(i => i.statut === "en_attente" || !i.statut || i.statut === "Inscrit").length;

  const kpis = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin" || u.role === "superadmin").length,
    actifs: users.filter((u) => u.statut === "actif").length,
    reservations: reservations.length,
    inscriptions: inscriptions.length,
    pendingReservations,
    pendingInscriptions,
  };

  /* ── User CRUD ── */
  const openEdit = (u) => {
    setForm({ ...u, password: "" });
    setModal({ mode: "edit", data: u });
  };

  const closeModal = () => { setModal(null); setForm({}); };

  // ✅ Création : POST /auth/register | Modification : PUT /admin/users/:id/role
  const handleSave = async () => {
    if (!form.name || !form.email) return showToast("Nom et email requis.", "error");
    const isEdit = modal.mode === "edit";

    try {
      if (isEdit) {
        // Changer le rôle si superadmin
        if (isSuperAdmin && form.role !== modal.data.role) {
          const roleRes = await fetch(`${API}/admin/users/${modal.data.id}/role`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify({ role: form.role }),
          });
          if (!roleRes.ok) {
            const d = await roleRes.json();
            return showToast(d.message || "Erreur changement de rôle.", "error");
          }
        }
      } else {
        // Créer un utilisateur via /auth/register
        if (!form.password || form.password.length < 6)
          return showToast("Mot de passe de 6 caractères minimum.", "error");
        const res = await fetch(`${API}/auth/register`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
        });
        if (!res.ok) {
          const d = await res.json();
          return showToast(d.message || "Erreur serveur.", "error");
        }
        // Si superadmin veut donner un rôle différent de "user"
        if (isSuperAdmin && form.role !== "user") {
          const regData = await res.json().catch(() => null);
          if (regData?.user?.id) {
            await fetch(`${API}/admin/users/${regData.user.id}/role`, {
              method: "PUT",
              headers: authHeaders(),
              body: JSON.stringify({ role: form.role }),
            });
          }
        }
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
      const res = await fetch(`${API}/admin/users/${u.id}/statut`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ statut: newStatut }),
      });
      if (!res.ok) {
        const d = await res.json();
        return showToast(d.message || "Erreur changement de statut.", "error");
      }
      fetchAll();
      showToast(`Statut de ${u.name} → ${newStatut}.`);
    } catch {
      showToast("Erreur de connexion au serveur.", "error");
    }
  };

  const updateStatutReservation = async (id, statut) => {
    try {
      const res = await fetch(`${API}/coworking/reservations/${id}/statut`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) return showToast("Erreur lors de la mise à jour.", "error");
      fetchAll();
      showToast(statut === "acceptée" ? "✅ Réservation acceptée." : "❌ Réservation refusée.");
    } catch {
      showToast("Erreur de connexion au serveur.", "error");
    }
  };

  const updateStatutInscription = async (id, statut) => {
    try {
      const res = await fetch(`${API}/formations/inscriptions/${id}/statut`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) return showToast("Erreur lors de la mise à jour.", "error");
      fetchAll();
      showToast(statut === "acceptée" ? "✅ Inscription acceptée." : "❌ Inscription refusée.");
    } catch {
      showToast("Erreur de connexion au serveur.", "error");
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
    { id: "reservations", label: "Réservations", icon: "📅", count: kpis.reservations, pending: kpis.pendingReservations },
    { id: "inscriptions", label: "Inscriptions", icon: "🎓", count: kpis.inscriptions, pending: kpis.pendingInscriptions },
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
          { icon: "📅", val: kpis.reservations, label: "Réservations", pending: kpis.pendingReservations },
          { icon: "🎓", val: kpis.inscriptions, label: "Inscriptions", pending: kpis.pendingInscriptions },
        ].map((k, i) => (
          <div className="adm-kpi" key={k.label} style={{ animationDelay: `${i * 0.07}s` }}>
            <div className="adm-kpi-icon">{k.icon}</div>
            <div className="adm-kpi-val">{k.val}</div>
            <div className="adm-kpi-label">{k.label}</div>
            {k.pending > 0 && (
              <div style={{ fontSize: "0.7rem", color: "#f59e0b", fontWeight: 700, marginTop: 2 }}>
                ⏳ {k.pending} en attente
              </div>
            )}
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
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
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
                {/* Ajout réservé au superadmin */}
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
                        <td>
                          <div className="adm-user-cell">
                            <div className="adm-avatar">{initials(u.name || u.email)}</div>
                            <div>
                              <p className="adm-user-name">{u.name || "—"}</p>
                              <p className="adm-user-email">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`adm-badge ${roleBadge(u.role)}`}>
                            {u.role || "user"}
                          </span>
                        </td>
                        <td>
                          <span className={`adm-badge ${statutBadge(u.statut || "actif")}`}>
                            {u.statut || "actif"}
                          </span>
                        </td>
                        <td>
                          {u.created_at
                            ? new Date(u.created_at).toLocaleDateString("fr-TN")
                            : "—"}
                        </td>
                        <td>
                          <div className="adm-actions">
                            <button className="adm-btn-sm adm-btn-edit" onClick={() => openEdit(u)}>
                              ✏ Modifier
                            </button>
                            {/* Changement de rôle réservé au superadmin */}
                            {(u.statut === "actif" || !u.statut) ? (
                          <button className="adm-btn-sm adm-btn-warn" onClick={() => changeStatut(u, "suspendu")}>
                            ⏸ Suspendre
                          </button>
                        ) : (
                          <button className="adm-btn-sm adm-btn-success" onClick={() => changeStatut(u, "actif")}>
                            ▶ Activer
                          </button>
                        )}
                            {/* Suppression réservée au superadmin */}
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
            <div className="adm-toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
              <h2 className="adm-section-title">
                Réservations Coworking
                {kpis.pendingReservations > 0 && (
                  <span style={{ marginLeft: 10, fontSize: "0.78rem", background: "#f59e0b", color: "#fff", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>
                    ⏳ {kpis.pendingReservations} en attente
                  </span>
                )}
              </h2>
              <div className="adm-toolbar-right" style={{ gap: 4 }}>
                {[
                  { key: "tous",       label: "🗂 Tous",        color: "#1a6fc4" },
                  { key: "en_attente", label: "⏳ En attente", color: "#f59e0b" },
                  { key: "acceptée",   label: "✅ Acceptées",  color: "#22c55e" },
                  { key: "refusée",    label: "❌ Refusées",   color: "#ef4444" },
                ].map(f => (
                  <button key={f.key} onClick={() => setReservFilter(f.key)} style={{
                    padding: "5px 13px", borderRadius: 20, border: `1.5px solid ${f.color}`,
                    fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                    background: reservFilter === f.key ? f.color : "transparent",
                    color: reservFilter === f.key ? "#fff" : f.color,
                    transition: "all .18s",
                  }}>{f.label}</button>
                ))}
              </div>
            </div>

            {(() => {
              const filtered = reservations.filter(r => {
                if (reservFilter === "tous") return true;
                if (reservFilter === "en_attente") return !r.statut || r.statut === "en_attente" || r.statut === "confirmée";
                return r.statut === reservFilter;
              });
              if (filtered.length === 0) return (
                <div className="adm-empty">
                  <div className="adm-empty-icon">📭</div>
                  <p>Aucune réservation pour ce filtre.</p>
                </div>
              );
              return (
                <div className="adm-list">
                  {filtered.map((r, i) => {
                    const isPending = !r.statut || r.statut === "en_attente" || r.statut === "confirmée";
                    return (
                      <div className="adm-list-card" key={r.id} style={{
                        animationDelay: `${i * 0.06}s`,
                        borderLeft: `4px solid ${isPending ? "#f59e0b" : r.statut === "acceptée" ? "#22c55e" : "#ef4444"}`,
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
                          <span className={`adm-badge ${isPending ? "badge-suspendu" : r.statut === "acceptée" ? "badge-actif" : "badge-inactif"}`}>
                            {isPending ? "⏳ En attente" : r.statut === "acceptée" ? "✅ Acceptée" : "❌ Refusée"}
                          </span>
                          {isPending && (
                            <>
                              <button className="adm-btn-sm adm-btn-success" onClick={() => updateStatutReservation(r.id, "acceptée")}>
                                ✅ Accepter
                              </button>
                              <button className="adm-btn-sm adm-btn-warn" onClick={() => updateStatutReservation(r.id, "refusée")}>
                                ❌ Refuser
                              </button>
                            </>
                          )}
                          {/* Suppression réservée au superadmin */}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}

        {/* ══ TAB: INSCRIPTIONS ══ */}
        {activeTab === "inscriptions" && (
          <>
            <div className="adm-toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
              <h2 className="adm-section-title">
                Inscriptions aux formations
                {kpis.pendingInscriptions > 0 && (
                  <span style={{ marginLeft: 10, fontSize: "0.78rem", background: "#f59e0b", color: "#fff", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>
                    ⏳ {kpis.pendingInscriptions} en attente
                  </span>
                )}
              </h2>
              <div className="adm-toolbar-right" style={{ gap: 4 }}>
                {[
                  { key: "tous",       label: "🗂 Tous",        color: "#1a6fc4" },
                  { key: "en_attente", label: "⏳ En attente", color: "#f59e0b" },
                  { key: "acceptée",   label: "✅ Acceptées",  color: "#22c55e" },
                  { key: "refusée",    label: "❌ Refusées",   color: "#ef4444" },
                ].map(f => (
                  <button key={f.key} onClick={() => setInscFilter(f.key)} style={{
                    padding: "5px 13px", borderRadius: 20, border: `1.5px solid ${f.color}`,
                    fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                    background: inscFilter === f.key ? f.color : "transparent",
                    color: inscFilter === f.key ? "#fff" : f.color,
                    transition: "all .18s",
                  }}>{f.label}</button>
                ))}
              </div>
            </div>

            {(() => {
              const filtered = inscriptions.filter(ins => {
                if (inscFilter === "tous") return true;
                if (inscFilter === "en_attente") return !ins.statut || ins.statut === "en_attente" || ins.statut === "Inscrit";
                return ins.statut === inscFilter;
              });
              if (filtered.length === 0) return (
                <div className="adm-empty">
                  <div className="adm-empty-icon">🎓</div>
                  <p>Aucune inscription pour ce filtre.</p>
                </div>
              );
              return (
                <div className="adm-list">
                  {filtered.map((ins, i) => {
                    const isPending = !ins.statut || ins.statut === "en_attente" || ins.statut === "Inscrit";
                    return (
                      <div className="adm-list-card" key={ins.id} style={{
                        animationDelay: `${i * 0.06}s`,
                        borderLeft: `4px solid ${isPending ? "#f59e0b" : ins.statut === "acceptée" ? "#22c55e" : "#ef4444"}`,
                      }}>
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
                          <span className={`adm-badge ${isPending ? "badge-suspendu" : ins.statut === "acceptée" ? "badge-actif" : "badge-inactif"}`}>
                            {isPending ? "⏳ En attente" : ins.statut === "acceptée" ? "✅ Acceptée" : "❌ Refusée"}
                          </span>
                          {isPending && (
                            <>
                              <button className="adm-btn-sm adm-btn-success" onClick={() => updateStatutInscription(ins.id, "acceptée")}>
                                ✅ Accepter
                              </button>
                              <button className="adm-btn-sm adm-btn-warn" onClick={() => updateStatutInscription(ins.id, "refusée")}>
                                ❌ Refuser
                              </button>
                            </>
                          )}
                          {/* Suppression réservée au superadmin */}
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
                        <span style={{ color: "#78b8f0" }}>
                          ({Math.round((s.val / totalStatut) * 100)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

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