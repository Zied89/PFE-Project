const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middleware/Authmiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const superAdminMiddleware = require("../middleware/superAdminMiddleware");

// GET /api/admin/users — liste des utilisateurs (admin)
router.get("/users", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const users = db.prepare(
      "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
    ).all();
    return res.json({ users });
  } catch (err) {
    console.error("[admin users GET]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// PUT /api/admin/users/:id/role — changer le rôle (superadmin seulement)
router.put("/users/:id/role", authMiddleware, superAdminMiddleware, (req, res) => {
  const { role } = req.body;
  const { id } = req.params;

  if (!["user", "admin", "superadmin"].includes(role))
    return res.status(400).json({ message: "Rôle invalide." });

  // Empêcher de rétrograder le dernier superadmin
  if (role !== "superadmin") {
    const superAdminCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'superadmin'").get().c;
    const targetUser = db.prepare("SELECT role FROM users WHERE id = ?").get(id);
    if (!targetUser) return res.status(404).json({ message: "Utilisateur introuvable." });
    if (targetUser.role === "superadmin" && superAdminCount <= 1)
      return res.status(400).json({ message: "Impossible de rétrograder le seul super administrateur." });
  }

  // Empêcher de se modifier soi-même
  if (Number(id) === req.user.id)
    return res.status(400).json({ message: "Vous ne pouvez pas modifier votre propre rôle." });

  try {
    db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
    const user = db.prepare("SELECT id, name, email, role FROM users WHERE id = ?").get(id);
    return res.json({ user, message: "Rôle mis à jour." });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/admin/users/:id — supprimer un utilisateur (superadmin)
router.delete("/users/:id", authMiddleware, superAdminMiddleware, (req, res) => {
  const { id } = req.params;

  if (Number(id) === req.user.id)
    return res.status(400).json({ message: "Vous ne pouvez pas supprimer votre propre compte." });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });

  if (user.role === "superadmin") {
    const count = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'superadmin'").get().c;
    if (count <= 1)
      return res.status(400).json({ message: "Impossible de supprimer le seul super administrateur." });
  }

  try {
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    return res.json({ message: "Utilisateur supprimé." });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// GET /api/admin/stats — statistiques globales (admin)
router.get("/stats", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const totalUsers        = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'user'").get().c;
    const totalAdmins       = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get().c;
    const totalFormations   = db.prepare("SELECT COUNT(*) as c FROM formations").get().c;
    const totalSalles       = db.prepare("SELECT COUNT(*) as c FROM salles").get().c;
    const totalTables       = db.prepare("SELECT COUNT(*) as c FROM tables_cw").get().c;
    const totalReservations = db.prepare("SELECT COUNT(*) as c FROM reservations").get().c;
    const totalInscriptions = db.prepare("SELECT COUNT(*) as c FROM inscriptions").get().c;
    const sallesDispos      = db.prepare("SELECT COUNT(*) as c FROM salles WHERE disponible = 1").get().c;
    const tablesLibres      = db.prepare("SELECT COUNT(*) as c FROM tables_cw WHERE statut = 'Libre'").get().c;
    const recentReservations = db.prepare(`
      SELECT r.*, u.name AS user_name FROM reservations r
      LEFT JOIN users u ON u.id = r.user_id
      ORDER BY r.created_at DESC LIMIT 5
    `).all();
    const recentInscriptions = db.prepare(`
      SELECT i.*, u.name AS user_name, f.titre AS formation_titre FROM inscriptions i
      LEFT JOIN users u ON u.id = i.user_id
      LEFT JOIN formations f ON f.id = i.formation_id
      ORDER BY i.created_at DESC LIMIT 5
    `).all();

    return res.json({
      stats: {
        totalUsers, totalAdmins, totalFormations, totalSalles,
        totalTables, totalReservations, totalInscriptions,
        sallesDispos, tablesLibres,
      },
      recentReservations,
      recentInscriptions,
    });
  } catch (err) {
    console.error("[admin stats]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
