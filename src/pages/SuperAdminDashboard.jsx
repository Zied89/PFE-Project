import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./SuperAdminDashboard.css";

const API = "http://localhost:5000/api";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

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

function Modal({ title, onClose, children }) {
  return (
    <div className="sa-overlay">
      <div className="sa-modal">
        <div className="sa-modal-header">
          <h2 className="sa-modal-title">{title}</h2>
          <button className="sa-modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SuperAdminDashboard({ user, setUser }) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("tous");
  const [statutFilter, setStatutFilter] = useState("tous");
  const [reservFilter, setReservFilter] = useState("tous");
  const [inscFilter, setInscFilter] = useState("tous");

  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

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
    } catch {
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

  /* ── KPIs ── */
  const pendingReservations = reservations.filter(r => !r.statut || r.statut === "en_attente" || r.statut === "confirmée").length;
  const pendingInscriptions = inscriptions.filter(i => !i.statut || i.statut === "en_attente" || i.statut === "Inscrit").length;

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
  const openAdd = () => {
    setForm({ name: "", email: "", password: "", role: "user", statut: "actif" });
    setModal({ mode: "add" });
  };
  const openEdit = (u) => { setForm({ ...u, password: "" }); setModal({ mode: "edit", data: u }); };
  const closeModal = () => { setModal(null); setForm({}); };

  const handleSave = async () => {
    if (!form.name || !form.email) return showToast("Nom et email requis.", "error");
    const isEdit = modal.mode === "edit";
    try {
      if (isEdit) {
        if (form.role !== modal.data.role) {
          const roleRes = await fetch(`${API}/admin/users/${modal.data.id}/role`, {
            method: "PUT", headers: authHeaders(),
            body: JSON.stringify({ role: form.role }),
          });
          if (!roleRes.ok) {
            const d = await roleRes.json();
            return showToast(d.message || "Erreur changement de rôle.", "error");
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
        if (form.role !== "user") {
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
      showToast(isEdit ? "Utilisateur mis à jour." : "Utilisateur créé.");
    } catch { showToast("Erreur de connexion au serveur.", "error"); }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API}/admin/users/${deleteConfirm.id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) return showToast("Erreur lors de la suppression.", "error");
      setDeleteConfirm(null); fetchAll(); showToast("Utilisateur supprimé.");
    } catch { showToast("Erreur de connexion au serveur.", "error"); }
  };

  const changeStatut = async (u, newStatut) => {
    try {
      const res = await fetch(`${API}/admin/users/${u.id}/statut`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ statut: newStatut }),
      });
      if (!res.ok) return showToast("Erreur changement de statut.", "error");
      fetchAll(); showToast(`Statut de ${u.name} → ${newStatut}.`);
    } catch { showToast("Erreur de connexion au serveur.", "error"); }
  };

  const changeRole = async (u, newRole) => {
    try {
      const res = await fetch(`${API}/admin/users/${u.id}/role`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) return showToast("Erreur changement de rôle.", "error");
      fetchAll(); showToast(`Rôle de ${u.name} → ${newRole}.`);
    } catch { showToast("Erreur de connexion.", "error"); }
  };

  const cancelReservation = async (id) => {
    try {
      const res = await fetch(`${API}/coworking/reservations/${id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) return showToast("Erreur lors de l'annulation.", "error");
      fetchAll(); showToast("Réservation supprimée.");
    } catch { showToast("Erreur de connexion.", "error"); }
  };

  const updateStatutReservation = async (id, statut) => {
    try {
      const res = await fetch(`${API}/coworking/reservations/${id}/statut`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) return showToast("Erreur mise à jour.", "error");
      fetchAll(); showToast(statut === "acceptée" ? "✅ Réservation acceptée." : "❌ Réservation refusée.");
    } catch { showToast("Erreur de connexion.", "error"); }
  };

  const updateStatutInscription = async (id, statut) => {
    try {
      const res = await fetch(`${API}/formations/inscriptions/${id}/statut`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) return showToast("Erreur mise à jour.", "error");
      fetchAll(); showToast(statut === "acceptée" ? "✅ Inscription acceptée." : "❌ Inscription refusée.");
    } catch { showToast("Erreur de connexion.", "error"); }
  };

  const deleteInscription = async (id) => {
    try {
      const res = await fetch(`${API}/formations/inscriptions/${id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) return showToast("Erreur suppression.", "error");
      fetchAll(); showToast("Inscription supprimée.");
    } catch { showToast("Erreur de connexion.", "error"); }
  };

  /* ── Stats ── */
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

  const TABS = [
    { id: "users", label: "Utilisateurs", icon: "👥", count: kpis.total },
    { id: "reservations", label: "Réservations", icon: "📅", count: kpis.reservations, pending: kpis.pendingReservations },
    { id: "inscriptions", label: "Inscriptions", icon: "🎓", count: kpis.inscriptions, pending: kpis.pendingInscriptions },
    { id: "stats", label: "Statistiques", icon: "📊", count: null },
  ];

  if (loading) return (
    <div className="sa-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="sa-bg-glow" /><div className="sa-bg-glow2" />
      <p style={{ color: "#c084fc", fontSize: "1.2rem", fontWeight: 700 }}>⏳ Chargement...</p>
    </div>
  );

  return (
    <div className="sa-page">
      <div className="sa-bg-glow" />
      <div className="sa-bg-glow2" />

      {/* ── NAVBAR ── */}
      <nav className="sa-navbar">
        <div className="sa-navbar-brand">
          <div className="sa-brand-icon">👑</div>
          <span className="sa-brand-name">TZ Prime Solutions</span>
          <span className="sa-brand-badge">Super Admin</span>
        </div>
        <div className="sa-navbar-links">
          <div className="sa-navbar-user">
            <span className="sa-user-dot" />
            {user?.name || user?.email}
            <span className="sa-role-badge">superadmin</span>
          </div>
          <button className="sa-btn-nav" onClick={() => navigate("/choose-services")}>← Services</button>
          <button className="sa-btn-nav sa-btn-logout" onClick={handleLogout}>Déconnexion</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="sa-hero">
        <p className="sa-hero-eyebrow">👑 Super Administration</p>
        <h1 className="sa-hero-title">SuperAdmin Dashboard</h1>
        <p className="sa-hero-sub">Contrôle total — utilisateurs, rôles, réservations, inscriptions et statistiques.</p>
        <div className="sa-hero-divider" />
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div className={`sa-toast sa-toast-${toast.type}`}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      {/* ── KPI CARDS ── */}
      <div className="sa-kpi-row">
        {[
          { icon: "👥", val: kpis.total, label: "Utilisateurs" },
          { icon: "🛡", val: kpis.admins, label: "Admins" },
          { icon: "✅", val: kpis.actifs, label: "Comptes actifs" },
          { icon: "📅", val: kpis.reservations, label: "Réservations", pending: kpis.pendingReservations },
          { icon: "🎓", val: kpis.inscriptions, label: "Inscriptions", pending: kpis.pendingInscriptions },
        ].map((k, i) => (
          <div className="sa-kpi" key={k.label} style={{ animationDelay: `${i * 0.07}s` }}>
            <div className="sa-kpi-icon">{k.icon}</div>
            <div className="sa-kpi-val">{k.val}</div>
            <div className="sa-kpi-label">{k.label}</div>
            {k.pending > 0 && (
              <div style={{ fontSize: "0.7rem", color: "#f59e0b", fontWeight: 700, marginTop: 2 }}>
                ⏳ {k.pending} en attente
              </div>
            )}
            <div className="sa-kpi-line" />
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div className="sa-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`sa-tab${activeTab === t.id ? " active" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.icon} {t.label}
            {t.count !== null && <span className="sa-tab-badge">{t.count}</span>}
            {t.pending > 0 && (
              <span className="sa-tab-badge" style={{ background: "#f59e0b", marginLeft: 2 }}>⏳ {t.pending}</span>
            )}
          </button>
        ))}
      </div>

      {/* ════ CONTENT ════ */}
      <div className="sa-content">

        {/* ══ USERS ══ */}
        {activeTab === "users" && (
          <>
            <div className="sa-toolbar">
              <h2 className="sa-section-title">Gestion des utilisateurs</h2>
              <div className="sa-toolbar-right">
                <div className="sa-search">
                  <span className="sa-search-icon">🔍</span>
                  <input type="text" placeholder="Rechercher..." value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <select className="sa-filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="tous">Tous les rôles</option>
                  <option value="user">Utilisateur</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
                <select className="sa-filter-select" value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)}>
                  <option value="tous">Tous les statuts</option>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="suspendu">Suspendu</option>
                </select>
                <button className="sa-btn-add" onClick={openAdd}>＋ Ajouter</button>
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="sa-empty">
                <div className="sa-empty-icon">🔍</div>
                <p>Aucun utilisateur trouvé.</p>
              </div>
            ) : (
              <div className="sa-table-wrap">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Utilisateur</th><th>Rôle</th><th>Statut</th><th>Créé le</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, i) => (
                      <tr key={u.id} style={{ animationDelay: `${i * 0.04}s` }}>
                        <td>
                          <div className="sa-user-cell">
                            <div className="sa-avatar">{initials(u.name || u.email)}</div>
                            <div>
                              <p className="sa-user-name">{u.name || "—"}</p>
                              <p className="sa-user-email">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td><span className={`sa-badge ${roleBadge(u.role)}`}>{u.role || "user"}</span></td>
                        <td><span className={`sa-badge ${statutBadge(u.statut || "actif")}`}>{u.statut || "actif"}</span></td>
                        <td>{u.created_at ? new Date(u.created_at).toLocaleDateString("fr-TN") : "—"}</td>
                        <td>
                          <div className="sa-actions">
                            <button className="sa-btn-sm sa-btn-edit" onClick={() => openEdit(u)}>✏ Modifier</button>
                            {u.role !== "superadmin" && (
                              <button className="sa-btn-sm sa-btn-role"
                                onClick={() => changeRole(u, u.role === "admin" ? "user" : "admin")}>
                                {u.role === "admin" ? "⬇ User" : "⬆ Admin"}
                              </button>
                            )}
                            {(u.statut === "actif" || !u.statut) ? (
                              <button className="sa-btn-sm sa-btn-warn" onClick={() => changeStatut(u, "suspendu")}>⏸ Suspendre</button>
                            ) : (
                              <button className="sa-btn-sm sa-btn-success" onClick={() => changeStatut(u, "actif")}>▶ Activer</button>
                            )}
                            {u.id !== user?.id && (
                              <button className="sa-btn-sm sa-btn-danger" onClick={() => setDeleteConfirm(u)}>🗑 Supprimer</button>
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

        {/* ══ RESERVATIONS ══ */}
        {activeTab === "reservations" && (
          <>
            <div className="sa-toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
              <h2 className="sa-section-title">
                Réservations Coworking
                {kpis.pendingReservations > 0 && (
                  <span className="sa-pending-badge">⏳ {kpis.pendingReservations} en attente</span>
                )}
              </h2>
              <div className="sa-toolbar-right" style={{ gap: 4 }}>
                {[
                  { key: "tous", label: "🗂 Tous", color: "#7c3aed" },
                  { key: "en_attente", label: "⏳ En attente", color: "#f59e0b" },
                  { key: "acceptée", label: "✅ Acceptées", color: "#22c55e" },
                  { key: "refusée", label: "❌ Refusées", color: "#ef4444" },
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
                <div className="sa-empty"><div className="sa-empty-icon">📭</div><p>Aucune réservation.</p></div>
              );
              return (
                <div className="sa-list">
                  {filtered.map((r, i) => {
                    const isPending = !r.statut || r.statut === "en_attente" || r.statut === "confirmée";
                    return (
                      <div className="sa-list-card" key={r.id} style={{
                        animationDelay: `${i * 0.06}s`,
                        borderLeft: `4px solid ${isPending ? "#f59e0b" : r.statut === "acceptée" ? "#22c55e" : "#ef4444"}`,
                      }}>
                        <div className="sa-list-left">
                          <div className="sa-list-icon">{r.type === "salle" ? "🏢" : "🪑"}</div>
                          <div>
                            <h3 className="sa-list-title">{r.item_nom}</h3>
                            <div className="sa-list-meta">
                              <span className={`sa-badge ${r.type === "salle" ? "badge-user" : "badge-admin"}`}>
                                {r.type === "salle" ? "Salle" : "Table"}
                              </span>
                              <span>📅 {r.date}</span>
                              <span>⏱ {r.heure_debut} – {r.heure_fin}</span>
                              <span>👤 {r.user_name || r.user_email || `ID ${r.user_id}`}</span>
                            </div>
                          </div>
                        </div>
                        <div className="sa-list-right">
                          <span className={`sa-badge ${isPending ? "badge-suspendu" : r.statut === "acceptée" ? "badge-actif" : "badge-inactif"}`}>
                            {isPending ? "⏳ En attente" : r.statut === "acceptée" ? "✅ Acceptée" : "❌ Refusée"}
                          </span>
                          {isPending && (
                            <>
                              <button className="sa-btn-sm sa-btn-success" onClick={() => updateStatutReservation(r.id, "acceptée")}>✅ Accepter</button>
                              <button className="sa-btn-sm sa-btn-warn" onClick={() => updateStatutReservation(r.id, "refusée")}>❌ Refuser</button>
                            </>
                          )}
                          <button className="sa-btn-sm sa-btn-danger" onClick={() => cancelReservation(r.id)}>🗑 Supprimer</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}

        {/* ══ INSCRIPTIONS ══ */}
        {activeTab === "inscriptions" && (
          <>
            <div className="sa-toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
              <h2 className="sa-section-title">
                Inscriptions aux formations
                {kpis.pendingInscriptions > 0 && (
                  <span className="sa-pending-badge">⏳ {kpis.pendingInscriptions} en attente</span>
                )}
              </h2>
              <div className="sa-toolbar-right" style={{ gap: 4 }}>
                {[
                  { key: "tous", label: "🗂 Tous", color: "#7c3aed" },
                  { key: "en_attente", label: "⏳ En attente", color: "#f59e0b" },
                  { key: "acceptée", label: "✅ Acceptées", color: "#22c55e" },
                  { key: "refusée", label: "❌ Refusées", color: "#ef4444" },
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
                <div className="sa-empty"><div className="sa-empty-icon">🎓</div><p>Aucune inscription.</p></div>
              );
              return (
                <div className="sa-list">
                  {filtered.map((ins, i) => {
                    const isPending = !ins.statut || ins.statut === "en_attente" || ins.statut === "Inscrit";
                    return (
                      <div className="sa-list-card" key={ins.id} style={{
                        animationDelay: `${i * 0.06}s`,
                        borderLeft: `4px solid ${isPending ? "#f59e0b" : ins.statut === "acceptée" ? "#22c55e" : "#ef4444"}`,
                      }}>
                        <div className="sa-list-left">
                          <div className="sa-list-icon">🎓</div>
                          <div>
                            <h3 className="sa-list-title">{ins.formation_titre || `Formation #${ins.formation_id}`}</h3>
                            <div className="sa-list-meta">
                              <span>👤 {ins.user_name || ins.user_email || `ID ${ins.user_id}`}</span>
                              {ins.created_at && <span>📅 {new Date(ins.created_at).toLocaleDateString("fr-TN")}</span>}
                              {ins.prix && <span>💰 {Number(ins.prix).toLocaleString("fr-TN")} TND</span>}
                            </div>
                          </div>
                        </div>
                        <div className="sa-list-right">
                          <span className={`sa-badge ${isPending ? "badge-suspendu" : ins.statut === "acceptée" ? "badge-actif" : "badge-inactif"}`}>
                            {isPending ? "⏳ En attente" : ins.statut === "acceptée" ? "✅ Acceptée" : "❌ Refusée"}
                          </span>
                          {isPending && (
                            <>
                              <button className="sa-btn-sm sa-btn-success" onClick={() => updateStatutInscription(ins.id, "acceptée")}>✅ Accepter</button>
                              <button className="sa-btn-sm sa-btn-warn" onClick={() => updateStatutInscription(ins.id, "refusée")}>❌ Refuser</button>
                            </>
                          )}
                          <button className="sa-btn-sm sa-btn-danger" onClick={() => deleteInscription(ins.id)}>🗑 Supprimer</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}

        {/* ══ STATS ══ */}
        {activeTab === "stats" && (
          <>
            <div className="sa-toolbar">
              <h2 className="sa-section-title">Statistiques</h2>
            </div>
            <div className="sa-stats-row">
              <div className="sa-stats-card">
                <h3 className="sa-stats-card-title">👥 Rôles des utilisateurs</h3>
                <div className="sa-bar-chart">
                  {roleStats.map((r) => (
                    <div className="sa-bar-row" key={r.label}>
                      <span className="sa-bar-label">{r.label}</span>
                      <div className="sa-bar-track">
                        <div className="sa-bar-fill" style={{ width: `${(r.val / maxRole) * 100}%` }} />
                      </div>
                      <span className="sa-bar-val">{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="sa-stats-card">
                <h3 className="sa-stats-card-title">📊 Statuts des comptes</h3>
                <div className="sa-donut-wrap">
                  <div className="sa-donut" style={{ background: donutGradient }} />
                  <div className="sa-donut-legend">
                    {statutStats.map((s) => (
                      <div className="sa-donut-item" key={s.label}>
                        <div className="sa-dot" style={{ background: s.color }} />
                        <span>{s.label}</span>
                        <strong style={{ marginLeft: 4, color: "#c084fc" }}>{s.val}</strong>
                        <span style={{ color: "#a78bfa" }}>({Math.round((s.val / totalStatut) * 100)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="sa-stats-card">
                <h3 className="sa-stats-card-title">📈 Activité plateforme</h3>
                <div className="sa-bar-chart">
                  {[
                    { label: "Utilisateurs", val: kpis.total },
                    { label: "Réservations", val: kpis.reservations },
                    { label: "Inscriptions", val: kpis.inscriptions },
                  ].map((r) => {
                    const max = Math.max(kpis.total, kpis.reservations, kpis.inscriptions, 1);
                    return (
                      <div className="sa-bar-row" key={r.label}>
                        <span className="sa-bar-label">{r.label}</span>
                        <div className="sa-bar-track">
                          <div className="sa-bar-fill" style={{ width: `${(r.val / max) * 100}%` }} />
                        </div>
                        <span className="sa-bar-val">{r.val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="sa-toolbar" style={{ marginTop: 8 }}>
              <h2 className="sa-section-title">Derniers inscrits</h2>
            </div>
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr><th>Utilisateur</th><th>Rôle</th><th>Statut</th><th>Date d'inscription</th></tr>
                </thead>
                <tbody>
                  {[...users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8).map((u, i) => (
                    <tr key={u.id} style={{ animationDelay: `${i * 0.04}s` }}>
                      <td>
                        <div className="sa-user-cell">
                          <div className="sa-avatar">{initials(u.name || u.email)}</div>
                          <div>
                            <p className="sa-user-name">{u.name || "—"}</p>
                            <p className="sa-user-email">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className={`sa-badge ${roleBadge(u.role)}`}>{u.role || "user"}</span></td>
                      <td><span className={`sa-badge ${statutBadge(u.statut || "actif")}`}>{u.statut || "actif"}</span></td>
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
        <Modal title={modal.mode === "add" ? "Ajouter un utilisateur" : "Modifier l'utilisateur"} onClose={closeModal}>
          <div className="sa-form">
            <span className="sa-form-label">Nom complet</span>
            <input className="sa-form-input" type="text" placeholder="Ex: Ahmed Ben Ali"
              value={form.name || ""} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            <span className="sa-form-label">Adresse email</span>
            <input className="sa-form-input" type="email" placeholder="exemple@mail.com"
              value={form.email || ""} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
            <span className="sa-form-label">
              {modal.mode === "add" ? "Mot de passe" : "Nouveau mot de passe (laisser vide = inchangé)"}
            </span>
            <input className="sa-form-input" type="password"
              placeholder={modal.mode === "add" ? "6 caractères minimum" : "Laisser vide pour ne pas changer"}
              value={form.password || ""} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
            <span className="sa-form-label">Rôle</span>
            <select className="sa-form-select" value={form.role || "user"}
              onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="user">Utilisateur</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
            <span className="sa-form-label">Statut</span>
            <select className="sa-form-select" value={form.statut || "actif"}
              onChange={(e) => setForm(f => ({ ...f, statut: e.target.value }))}>
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
              <option value="suspendu">Suspendu</option>
            </select>
            <div className="sa-form-actions">
              <button className="sa-btn-cancel" onClick={closeModal}>Annuler</button>
              <button className="sa-btn-save" onClick={handleSave}>{modal.mode === "add" ? "Créer" : "Enregistrer"}</button>
            </div>
          </div>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Confirmer la suppression" onClose={() => setDeleteConfirm(null)}>
          <div className="sa-form">
            <p className="sa-delete-msg">
              Voulez-vous vraiment supprimer <strong>{deleteConfirm.name || deleteConfirm.email}</strong> ?
              <br /><span style={{ fontSize: 12, color: "#ef4444" }}>Cette action est irréversible.</span>
            </p>
            <div className="sa-form-actions">
              <button className="sa-btn-cancel" onClick={() => setDeleteConfirm(null)}>Annuler</button>
              <button className="sa-btn-del-confirm" onClick={handleDelete}>Supprimer</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default SuperAdminDashboard;