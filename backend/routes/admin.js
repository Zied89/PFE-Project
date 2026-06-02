const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middleware/Authmiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const superAdminMiddleware = require("../middleware/superAdminMiddleware");

// GET /api/admin/users — liste des utilisateurs (admin)
router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { rows: users } = await db.query(
      "SELECT id, name, email, role, statut, created_at FROM users ORDER BY created_at DESC"
    );
    return res.json({ users });
  } catch (err) {
    console.error("[admin users GET]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// PUT /api/admin/users/:id/statut — changer le statut (admin)
router.put("/users/:id/statut", authMiddleware, adminMiddleware, async (req, res) => {
  const { statut } = req.body;
  const { id } = req.params;

  if (!["actif", "inactif", "suspendu"].includes(statut))
    return res.status(400).json({ message: "Statut invalide." });

  if (Number(id) === req.user.id)
    return res.status(400).json({ message: "Vous ne pouvez pas modifier votre propre statut." });

  try {
    const { rows } = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    if (!rows.length)
      return res.status(404).json({ message: "Utilisateur introuvable." });

    await db.query("UPDATE users SET statut = $1 WHERE id = $2", [statut, id]);

    const { rows: updated } = await db.query(
      "SELECT id, name, email, role, statut FROM users WHERE id = $1", [id]
    );
    return res.json({ user: updated[0], message: "Statut mis à jour." });
  } catch (err) {
    console.error("[admin users statut PUT]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// PUT /api/admin/users/:id/role — changer le rôle (superadmin seulement)
router.put("/users/:id/role", authMiddleware, superAdminMiddleware, async (req, res) => {
  const { role } = req.body;
  const { id } = req.params;

  if (!["user", "admin", "superadmin"].includes(role))
    return res.status(400).json({ message: "Rôle invalide." });

  if (Number(id) === req.user.id)
    return res.status(400).json({ message: "Vous ne pouvez pas modifier votre propre rôle." });

  try {
    if (role !== "superadmin") {
      const { rows: countRows } = await db.query(
        "SELECT COUNT(*) AS c FROM users WHERE role = 'superadmin'"
      );
      const { rows: targetRows } = await db.query(
        "SELECT role FROM users WHERE id = $1", [id]
      );
      if (!targetRows.length)
        return res.status(404).json({ message: "Utilisateur introuvable." });
      if (targetRows[0].role === "superadmin" && Number(countRows[0].c) <= 1)
        return res.status(400).json({ message: "Impossible de rétrograder le seul super administrateur." });
    }

    await db.query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);

    const { rows } = await db.query(
      "SELECT id, name, email, role, statut FROM users WHERE id = $1", [id]
    );
    return res.json({ user: rows[0], message: "Rôle mis à jour." });
  } catch (err) {
    console.error("[admin users role PUT]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/admin/users/:id — supprimer un utilisateur (superadmin)
router.delete("/users/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
  const { id } = req.params;

  if (Number(id) === req.user.id)
    return res.status(400).json({ message: "Vous ne pouvez pas supprimer votre propre compte." });

  try {
    const { rows } = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    if (!rows.length)
      return res.status(404).json({ message: "Utilisateur introuvable." });

    const user = rows[0];

    if (user.role === "superadmin") {
      const { rows: countRows } = await db.query(
        "SELECT COUNT(*) AS c FROM users WHERE role = 'superadmin'"
      );
      if (Number(countRows[0].c) <= 1)
        return res.status(400).json({ message: "Impossible de supprimer le seul super administrateur." });
    }

    await db.query("DELETE FROM users WHERE id = $1", [id]);
    return res.json({ message: "Utilisateur supprimé." });
  } catch (err) {
    console.error("[admin users DELETE]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// GET /api/admin/stats — statistiques globales (admin)
router.get("/stats", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const queries = await Promise.all([
      db.query("SELECT COUNT(*) AS c FROM users WHERE role = 'user'"),
      db.query("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'"),
      db.query("SELECT COUNT(*) AS c FROM formations"),
      db.query("SELECT COUNT(*) AS c FROM salles"),
      db.query("SELECT COUNT(*) AS c FROM tables_cw"),
      db.query("SELECT COUNT(*) AS c FROM reservations"),
      db.query("SELECT COUNT(*) AS c FROM inscriptions"),
      db.query("SELECT COUNT(*) AS c FROM salles WHERE disponible = true"),
      db.query("SELECT COUNT(*) AS c FROM tables_cw WHERE statut = 'Libre'"),
      db.query(`
        SELECT r.*, u.name AS user_name FROM reservations r
        LEFT JOIN users u ON u.id = r.user_id
        ORDER BY r.created_at DESC LIMIT 5
      `),
      db.query(`
        SELECT i.*, u.name AS user_name, f.titre AS formation_titre FROM inscriptions i
        LEFT JOIN users u ON u.id = i.user_id
        LEFT JOIN formations f ON f.id = i.formation_id
        ORDER BY i.created_at DESC LIMIT 5
      `),
    ]);

    return res.json({
      stats: {
        totalUsers:        Number(queries[0].rows[0].c),
        totalAdmins:       Number(queries[1].rows[0].c),
        totalFormations:   Number(queries[2].rows[0].c),
        totalSalles:       Number(queries[3].rows[0].c),
        totalTables:       Number(queries[4].rows[0].c),
        totalReservations: Number(queries[5].rows[0].c),
        totalInscriptions: Number(queries[6].rows[0].c),
        sallesDispos:      Number(queries[7].rows[0].c),
        tablesLibres:      Number(queries[8].rows[0].c),
      },
      recentReservations: queries[9].rows,
      recentInscriptions: queries[10].rows,
    });
  } catch (err) {
    console.error("[admin stats]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;