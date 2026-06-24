const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middleware/Authmiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// ─── SALLES ───────────────────────────────────────────────────────────────────

// GET /api/coworking/salles
router.get("/salles", authMiddleware, async (req, res) => {
  try {
    const { rows: salles } = await db.query("SELECT * FROM salles ORDER BY id");
    return res.json({ salles });
  } catch (err) {
    console.error("[salles GET]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/coworking/salles (admin)
router.post("/salles", authMiddleware, adminMiddleware, async (req, res) => {
  const { nom, capacite, disponible } = req.body;
  if (!nom || !capacite)
    return res.status(400).json({ message: "Nom et capacité sont obligatoires." });
  try {
    const { rows } = await db.query(
      "INSERT INTO salles (nom, capacite, disponible) VALUES ($1, $2, $3) RETURNING *",
      [nom, Number(capacite), disponible !== false]
    );
    return res.status(201).json({ salle: rows[0] });
  } catch (err) {
    console.error("[salles POST]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// PUT /api/coworking/salles/:id (admin)
router.put("/salles/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { nom, capacite, disponible } = req.body;
  const { id } = req.params;
  try {
    const check = await db.query("SELECT id FROM salles WHERE id = $1", [id]);
    if (!check.rows.length)
      return res.status(404).json({ message: "Salle introuvable." });
    const { rows } = await db.query(
      "UPDATE salles SET nom=$1, capacite=$2, disponible=$3 WHERE id=$4 RETURNING *",
      [nom, Number(capacite), Boolean(disponible), id]
    );
    return res.json({ salle: rows[0] });
  } catch (err) {
    console.error("[salles PUT]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/coworking/salles/:id (admin)
router.delete("/salles/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const check = await db.query("SELECT id FROM salles WHERE id = $1", [req.params.id]);
    if (!check.rows.length)
      return res.status(404).json({ message: "Salle introuvable." });
    await db.query("DELETE FROM salles WHERE id = $1", [req.params.id]);
    return res.json({ message: "Salle supprimée." });
  } catch (err) {
    console.error("[salles DELETE]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// ─── EMPLACEMENTS ─────────────────────────────────────────────────────────────

// GET /api/coworking/emplacements
router.get("/emplacements", authMiddleware, async (req, res) => {
  try {
    const { rows: emplacements } = await db.query(`
      SELECT e.*, s.nom AS salle_nom FROM emplacements e
      LEFT JOIN salles s ON s.id = e.salle_id ORDER BY e.id
    `);
    return res.json({ emplacements });
  } catch (err) {
    console.error("[emplacements GET]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/coworking/emplacements (admin)
router.post("/emplacements", authMiddleware, adminMiddleware, async (req, res) => {
  const { nom, salle_id, places } = req.body;
  if (!nom || !salle_id || !places)
    return res.status(400).json({ message: "Tous les champs sont obligatoires." });
  try {
    const { rows } = await db.query(
      "INSERT INTO emplacements (nom, salle_id, places) VALUES ($1, $2, $3) RETURNING *",
      [nom, Number(salle_id), Number(places)]
    );
    return res.status(201).json({ emplacement: rows[0] });
  } catch (err) {
    console.error("[emplacements POST]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// PUT /api/coworking/emplacements/:id (admin)
router.put("/emplacements/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { nom, salle_id, places } = req.body;
  const { id } = req.params;
  try {
    const check = await db.query("SELECT id FROM emplacements WHERE id = $1", [id]);
    if (!check.rows.length)
      return res.status(404).json({ message: "Emplacement introuvable." });
    const { rows } = await db.query(
      "UPDATE emplacements SET nom=$1, salle_id=$2, places=$3 WHERE id=$4 RETURNING *",
      [nom, Number(salle_id), Number(places), id]
    );
    return res.json({ emplacement: rows[0] });
  } catch (err) {
    console.error("[emplacements PUT]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/coworking/emplacements/:id (admin)
router.delete("/emplacements/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const check = await db.query("SELECT id FROM emplacements WHERE id = $1", [req.params.id]);
    if (!check.rows.length)
      return res.status(404).json({ message: "Emplacement introuvable." });
    await db.query("DELETE FROM emplacements WHERE id = $1", [req.params.id]);
    return res.json({ message: "Emplacement supprimé." });
  } catch (err) {
    console.error("[emplacements DELETE]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// ─── TABLES ───────────────────────────────────────────────────────────────────

// GET /api/coworking/tables
router.get("/tables", authMiddleware, async (req, res) => {
  try {
    const { rows: tables } = await db.query(`
      SELECT t.*, e.nom AS emplacement_nom, s.nom AS salle_nom
      FROM tables_cw t
      LEFT JOIN emplacements e ON e.id = t.emplacement_id
      LEFT JOIN salles s ON s.id = e.salle_id ORDER BY t.id
    `);
    return res.json({ tables });
  } catch (err) {
    console.error("[tables GET]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/coworking/tables (admin)
router.post("/tables", authMiddleware, adminMiddleware, async (req, res) => {
  const { nom, emplacement_id, statut } = req.body;
  if (!nom || !emplacement_id)
    return res.status(400).json({ message: "Nom et emplacement sont obligatoires." });
  try {
    const { rows } = await db.query(
      "INSERT INTO tables_cw (nom, emplacement_id, statut) VALUES ($1, $2, $3) RETURNING *",
      [nom, Number(emplacement_id), statut || "Libre"]
    );
    return res.status(201).json({ table: rows[0] });
  } catch (err) {
    console.error("[tables POST]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// PUT /api/coworking/tables/:id (admin)
router.put("/tables/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { nom, emplacement_id, statut } = req.body;
  const { id } = req.params;
  try {
    const check = await db.query("SELECT id FROM tables_cw WHERE id = $1", [id]);
    if (!check.rows.length)
      return res.status(404).json({ message: "Table introuvable." });
    const { rows } = await db.query(
      "UPDATE tables_cw SET nom=$1, emplacement_id=$2, statut=$3 WHERE id=$4 RETURNING *",
      [nom, Number(emplacement_id), statut, id]
    );
    return res.json({ table: rows[0] });
  } catch (err) {
    console.error("[tables PUT]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/coworking/tables/:id (admin)
router.delete("/tables/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const check = await db.query("SELECT id FROM tables_cw WHERE id = $1", [req.params.id]);
    if (!check.rows.length)
      return res.status(404).json({ message: "Table introuvable." });
    await db.query("DELETE FROM tables_cw WHERE id = $1", [req.params.id]);
    return res.json({ message: "Table supprimée." });
  } catch (err) {
    console.error("[tables DELETE]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// ─── RESERVATIONS ─────────────────────────────────────────────────────────────

// POST /api/coworking/reservations (auth)
router.post("/reservations", authMiddleware, async (req, res) => {
  const { type, item_id, item_nom, date, heure_debut, heure_fin, table_ids } = req.body;
  if (!type || !item_id || !date || !heure_debut || !heure_fin)
    return res.status(400).json({ message: "Tous les champs sont obligatoires." });
  if (!["salle", "table"].includes(type))
    return res.status(400).json({ message: "Type invalide." });

  // table_ids n'a de sens que pour une réservation de type "salle"
  const tableIds = type === "salle" && Array.isArray(table_ids) ? table_ids.map(Number) : [];

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `INSERT INTO reservations (user_id, type, item_id, item_nom, date, heure_debut, heure_fin, statut, table_ids)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.user.id, type, item_id, item_nom || "", date, heure_debut, heure_fin, "en_attente", JSON.stringify(tableIds)]
    );

    // La table/salle est marquée comme réservée immédiatement pour bloquer le créneau
    // pendant que l'admin valide ou refuse la demande.
    if (type === "table")
      await client.query("UPDATE tables_cw SET statut='Réservée' WHERE id=$1", [item_id]);
    if (type === "salle") {
      await client.query("UPDATE salles SET disponible=false WHERE id=$1", [item_id]);
      if (tableIds.length > 0)
        await client.query("UPDATE tables_cw SET statut='Réservée' WHERE id = ANY($1::int[])", [tableIds]);
    }

    await client.query("COMMIT");
    return res.status(201).json({ reservation: rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[reservations POST]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  } finally {
    client.release();
  }
});

// GET /api/coworking/reservations/me (auth)
router.get("/reservations/me", authMiddleware, async (req, res) => {
  try {
    const { rows: reservations } = await db.query(
      "SELECT * FROM reservations WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );
    return res.json({ reservations });
  } catch (err) {
    console.error("[reservations/me GET]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// GET /api/coworking/reservations — toutes (admin)
router.get("/reservations", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { rows: reservations } = await db.query(`
      SELECT r.*, u.name AS user_name, u.email AS user_email
      FROM reservations r LEFT JOIN users u ON u.id = r.user_id
      ORDER BY r.created_at DESC
    `);
    return res.json({ reservations });
  } catch (err) {
    console.error("[reservations GET]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// ✅ PUT /api/coworking/reservations/:id/statut (admin)
router.put("/reservations/:id/statut", authMiddleware, adminMiddleware, async (req, res) => {
  const { statut } = req.body;
  const { id } = req.params;

  if (!["acceptée", "refusée"].includes(statut))
    return res.status(400).json({ message: "Statut invalide. Valeurs acceptées: acceptée, refusée." });

  const client = await db.connect();
  try {
    const { rows } = await client.query("SELECT * FROM reservations WHERE id = $1", [id]);
    if (!rows.length)
      return res.status(404).json({ message: "Réservation introuvable." });

    const reservation = rows[0];
    const linkedTableIds = Array.isArray(reservation.table_ids)
      ? reservation.table_ids
      : (() => { try { return JSON.parse(reservation.table_ids || "[]"); } catch { return []; } })();

    await client.query("BEGIN");
    await client.query("UPDATE reservations SET statut=$1 WHERE id=$2", [statut, id]);

    if (statut === "refusée") {
      if (reservation.type === "table")
        await client.query("UPDATE tables_cw SET statut='Libre' WHERE id=$1", [reservation.item_id]);
      if (reservation.type === "salle") {
        await client.query("UPDATE salles SET disponible=true WHERE id=$1", [reservation.item_id]);
        if (linkedTableIds.length > 0)
          await client.query("UPDATE tables_cw SET statut='Libre' WHERE id = ANY($1::int[])", [linkedTableIds]);
      }
    } else if (statut === "acceptée") {
      if (reservation.type === "table")
        await client.query("UPDATE tables_cw SET statut='Réservée' WHERE id=$1", [reservation.item_id]);
      if (reservation.type === "salle") {
        await client.query("UPDATE salles SET disponible=false WHERE id=$1", [reservation.item_id]);
        if (linkedTableIds.length > 0)
          await client.query("UPDATE tables_cw SET statut='Réservée' WHERE id = ANY($1::int[])", [linkedTableIds]);
      }
    }

    await client.query("COMMIT");
    return res.json({ message: `Réservation ${statut} avec succès.` });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[reservations PUT statut]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  } finally {
    client.release();
  }
});

// DELETE /api/coworking/reservations/:id (auth)
router.delete("/reservations/:id", authMiddleware, async (req, res) => {
  const client = await db.connect();
  try {
    const { rows } = await client.query(
      "SELECT * FROM reservations WHERE id = $1", [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Réservation introuvable." });

    const reservation = rows[0];

    if (reservation.user_id !== req.user.id &&
        req.user.role !== "admin" &&
        req.user.role !== "superadmin")
      return res.status(403).json({ message: "Accès refusé." });

    const linkedTableIds = Array.isArray(reservation.table_ids)
      ? reservation.table_ids
      : (() => { try { return JSON.parse(reservation.table_ids || "[]"); } catch { return []; } })();

    await client.query("BEGIN");
    await client.query("DELETE FROM reservations WHERE id = $1", [req.params.id]);

    if (reservation.type === "table")
      await client.query("UPDATE tables_cw SET statut='Libre' WHERE id=$1", [reservation.item_id]);
    if (reservation.type === "salle") {
      await client.query("UPDATE salles SET disponible=true WHERE id=$1", [reservation.item_id]);
      if (linkedTableIds.length > 0)
        await client.query("UPDATE tables_cw SET statut='Libre' WHERE id = ANY($1::int[])", [linkedTableIds]);
    }

    await client.query("COMMIT");
    return res.json({ message: "Réservation annulée." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[reservations DELETE]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  } finally {
    client.release();
  }
});

module.exports = router;