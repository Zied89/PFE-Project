const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middleware/Authmiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// GET /api/coworking/salles
router.get("/salles", authMiddleware, (req, res) => {
  try {
    const salles = db.prepare("SELECT * FROM salles ORDER BY id").all();
    return res.json({ salles });
  } catch (err) {
    console.error("[salles GET]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/coworking/salles (admin)
router.post("/salles", authMiddleware, adminMiddleware, (req, res) => {
  const { nom, capacite, disponible } = req.body;
  if (!nom || !capacite)
    return res.status(400).json({ message: "Nom et capacité sont obligatoires." });
  try {
    const r = db.prepare("INSERT INTO salles (nom, capacite, disponible) VALUES (?, ?, ?)")
      .run(nom, Number(capacite), disponible !== false ? 1 : 0);
    return res.status(201).json({ salle: db.prepare("SELECT * FROM salles WHERE id = ?").get(r.lastInsertRowid) });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// PUT /api/coworking/salles/:id (admin)
router.put("/salles/:id", authMiddleware, adminMiddleware, (req, res) => {
  const { nom, capacite, disponible } = req.body;
  const { id } = req.params;
  if (!db.prepare("SELECT id FROM salles WHERE id = ?").get(id))
    return res.status(404).json({ message: "Salle introuvable." });
  try {
    db.prepare("UPDATE salles SET nom=?, capacite=?, disponible=? WHERE id=?")
      .run(nom, Number(capacite), disponible ? 1 : 0, id);
    return res.json({ salle: db.prepare("SELECT * FROM salles WHERE id = ?").get(id) });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/coworking/salles/:id (admin)
router.delete("/salles/:id", authMiddleware, adminMiddleware, (req, res) => {
  if (!db.prepare("SELECT id FROM salles WHERE id = ?").get(req.params.id))
    return res.status(404).json({ message: "Salle introuvable." });
  db.prepare("DELETE FROM salles WHERE id = ?").run(req.params.id);
  return res.json({ message: "Salle supprimée." });
});

// GET /api/coworking/emplacements
router.get("/emplacements", authMiddleware, (req, res) => {
  try {
    const emplacements = db.prepare(`
      SELECT e.*, s.nom AS salle_nom FROM emplacements e
      LEFT JOIN salles s ON s.id = e.salle_id ORDER BY e.id
    `).all();
    return res.json({ emplacements });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/coworking/emplacements (admin)
router.post("/emplacements", authMiddleware, adminMiddleware, (req, res) => {
  const { nom, salle_id, places } = req.body;
  if (!nom || !salle_id || !places)
    return res.status(400).json({ message: "Tous les champs sont obligatoires." });
  const r = db.prepare("INSERT INTO emplacements (nom, salle_id, places) VALUES (?, ?, ?)")
    .run(nom, Number(salle_id), Number(places));
  return res.status(201).json({ emplacement: db.prepare("SELECT * FROM emplacements WHERE id = ?").get(r.lastInsertRowid) });
});

// PUT /api/coworking/emplacements/:id (admin)
router.put("/emplacements/:id", authMiddleware, adminMiddleware, (req, res) => {
  const { nom, salle_id, places } = req.body;
  const { id } = req.params;
  if (!db.prepare("SELECT id FROM emplacements WHERE id = ?").get(id))
    return res.status(404).json({ message: "Emplacement introuvable." });
  db.prepare("UPDATE emplacements SET nom=?, salle_id=?, places=? WHERE id=?")
    .run(nom, Number(salle_id), Number(places), id);
  return res.json({ emplacement: db.prepare("SELECT * FROM emplacements WHERE id = ?").get(id) });
});

// DELETE /api/coworking/emplacements/:id (admin)
router.delete("/emplacements/:id", authMiddleware, adminMiddleware, (req, res) => {
  if (!db.prepare("SELECT id FROM emplacements WHERE id = ?").get(req.params.id))
    return res.status(404).json({ message: "Emplacement introuvable." });
  db.prepare("DELETE FROM emplacements WHERE id = ?").run(req.params.id);
  return res.json({ message: "Emplacement supprimé." });
});

// GET /api/coworking/tables
router.get("/tables", authMiddleware, (req, res) => {
  try {
    const tables = db.prepare(`
      SELECT t.*, e.nom AS emplacement_nom, s.nom AS salle_nom
      FROM tables_cw t
      LEFT JOIN emplacements e ON e.id = t.emplacement_id
      LEFT JOIN salles s ON s.id = e.salle_id ORDER BY t.id
    `).all();
    return res.json({ tables });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/coworking/tables (admin)
router.post("/tables", authMiddleware, adminMiddleware, (req, res) => {
  const { nom, emplacement_id, statut } = req.body;
  if (!nom || !emplacement_id)
    return res.status(400).json({ message: "Nom et emplacement sont obligatoires." });
  const r = db.prepare("INSERT INTO tables_cw (nom, emplacement_id, statut) VALUES (?, ?, ?)")
    .run(nom, Number(emplacement_id), statut || "Libre");
  return res.status(201).json({ table: db.prepare("SELECT * FROM tables_cw WHERE id = ?").get(r.lastInsertRowid) });
});

// PUT /api/coworking/tables/:id (admin)
router.put("/tables/:id", authMiddleware, adminMiddleware, (req, res) => {
  const { nom, emplacement_id, statut } = req.body;
  const { id } = req.params;
  if (!db.prepare("SELECT id FROM tables_cw WHERE id = ?").get(id))
    return res.status(404).json({ message: "Table introuvable." });
  db.prepare("UPDATE tables_cw SET nom=?, emplacement_id=?, statut=? WHERE id=?")
    .run(nom, Number(emplacement_id), statut, id);
  return res.json({ table: db.prepare("SELECT * FROM tables_cw WHERE id = ?").get(id) });
});

// DELETE /api/coworking/tables/:id (admin)
router.delete("/tables/:id", authMiddleware, adminMiddleware, (req, res) => {
  if (!db.prepare("SELECT id FROM tables_cw WHERE id = ?").get(req.params.id))
    return res.status(404).json({ message: "Table introuvable." });
  db.prepare("DELETE FROM tables_cw WHERE id = ?").run(req.params.id);
  return res.json({ message: "Table supprimée." });
});

// POST /api/coworking/reservations (auth)
router.post("/reservations", authMiddleware, (req, res) => {
  const { type, item_id, item_nom, date, heure_debut, heure_fin } = req.body;
  if (!type || !item_id || !date || !heure_debut || !heure_fin)
    return res.status(400).json({ message: "Tous les champs sont obligatoires." });
  if (!["salle", "table"].includes(type))
    return res.status(400).json({ message: "Type invalide." });
  try {
    const r = db.prepare(`
      INSERT INTO reservations (user_id, type, item_id, item_nom, date, heure_debut, heure_fin, statut)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, type, item_id, item_nom || "", date, heure_debut, heure_fin, "Confirmée");
    if (type === "table")
      db.prepare("UPDATE tables_cw SET statut='Réservée' WHERE id=?").run(item_id);
    if (type === "salle")
      db.prepare("UPDATE salles SET disponible=0 WHERE id=?").run(item_id);
    return res.status(201).json({ reservation: db.prepare("SELECT * FROM reservations WHERE id = ?").get(r.lastInsertRowid) });
  } catch (err) {
    console.error("[reservations POST]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// GET /api/coworking/reservations/me (auth)
router.get("/reservations/me", authMiddleware, (req, res) => {
  const reservations = db.prepare(
    "SELECT * FROM reservations WHERE user_id = ? ORDER BY created_at DESC"
  ).all(req.user.id);
  return res.json({ reservations });
});

// GET /api/coworking/reservations — toutes (admin)
router.get("/reservations", authMiddleware, adminMiddleware, (req, res) => {
  const reservations = db.prepare(`
    SELECT r.*, u.name AS user_name, u.email AS user_email
    FROM reservations r LEFT JOIN users u ON u.id = r.user_id
    ORDER BY r.created_at DESC
  `).all();
  return res.json({ reservations });
});

// DELETE /api/coworking/reservations/:id (auth)
router.delete("/reservations/:id", authMiddleware, (req, res) => {
  const reservation = db.prepare("SELECT * FROM reservations WHERE id = ?").get(req.params.id);
  if (!reservation) return res.status(404).json({ message: "Réservation introuvable." });
  if (reservation.user_id !== req.user.id && req.user.role !== "admin" && req.user.role !== "superadmin")
    return res.status(403).json({ message: "Accès refusé." });
  try {
    db.prepare("DELETE FROM reservations WHERE id = ?").run(req.params.id);
    if (reservation.type === "table")
      db.prepare("UPDATE tables_cw SET statut='Libre' WHERE id=?").run(reservation.item_id);
    if (reservation.type === "salle")
      db.prepare("UPDATE salles SET disponible=1 WHERE id=?").run(reservation.item_id);
    return res.json({ message: "Réservation annulée." });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
