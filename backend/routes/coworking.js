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
  const { nom, capacite, disponible, tarif_horaire } = req.body;
  if (!nom || !capacite)
    return res.status(400).json({ message: "Nom et capacité sont obligatoires." });
  try {
    const { rows } = await db.query(
      "INSERT INTO salles (nom, capacite, disponible, tarif_horaire) VALUES ($1, $2, $3, $4) RETURNING *",
      [nom, Number(capacite), disponible !== false, Number(tarif_horaire) || 0]
    );
    return res.status(201).json({ salle: rows[0] });
  } catch (err) {
    console.error("[salles POST]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// PUT /api/coworking/salles/:id (admin)
router.put("/salles/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { nom, capacite, disponible, tarif_horaire } = req.body;
  const { id } = req.params;
  try {
    const check = await db.query("SELECT id FROM salles WHERE id = $1", [id]);
    if (!check.rows.length)
      return res.status(404).json({ message: "Salle introuvable." });
    const { rows } = await db.query(
      "UPDATE salles SET nom=$1, capacite=$2, disponible=$3, tarif_horaire=$4 WHERE id=$5 RETURNING *",
      [nom, Number(capacite), Boolean(disponible), Number(tarif_horaire) || 0, id]
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
  const { nom, salle_id, places, tarif_horaire } = req.body;
  if (!nom || !salle_id || !places)
    return res.status(400).json({ message: "Tous les champs sont obligatoires." });
  try {
    const { rows } = await db.query(
      "INSERT INTO emplacements (nom, salle_id, places, tarif_horaire) VALUES ($1, $2, $3, $4) RETURNING *",
      [nom, Number(salle_id), Number(places), Number(tarif_horaire) || 0]
    );
    return res.status(201).json({ emplacement: rows[0] });
  } catch (err) {
    console.error("[emplacements POST]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// PUT /api/coworking/emplacements/:id (admin)
router.put("/emplacements/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { nom, salle_id, places, tarif_horaire } = req.body;
  const { id } = req.params;
  try {
    const check = await db.query("SELECT id FROM emplacements WHERE id = $1", [id]);
    if (!check.rows.length)
      return res.status(404).json({ message: "Emplacement introuvable." });
    const { rows } = await db.query(
      "UPDATE emplacements SET nom=$1, salle_id=$2, places=$3, tarif_horaire=$4 WHERE id=$5 RETURNING *",
      [nom, Number(salle_id), Number(places), Number(tarif_horaire) || 0, id]
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
  const { nom, emplacement_id, statut, tarif_horaire, capacite } = req.body;
  if (!nom || !emplacement_id)
    return res.status(400).json({ message: "Nom et emplacement sont obligatoires." });
  try {
    const { rows } = await db.query(
      "INSERT INTO tables_cw (nom, emplacement_id, statut, tarif_horaire, capacite) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [nom, Number(emplacement_id), statut || "Libre", Number(tarif_horaire) || 0, Number(capacite) || 1]
    );
    return res.status(201).json({ table: rows[0] });
  } catch (err) {
    console.error("[tables POST]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// PUT /api/coworking/tables/:id (admin)
router.put("/tables/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { nom, emplacement_id, statut, tarif_horaire, capacite } = req.body;
  const { id } = req.params;
  try {
    const check = await db.query("SELECT id FROM tables_cw WHERE id = $1", [id]);
    if (!check.rows.length)
      return res.status(404).json({ message: "Table introuvable." });
    const { rows } = await db.query(
      "UPDATE tables_cw SET nom=$1, emplacement_id=$2, statut=$3, tarif_horaire=$4, capacite=$5 WHERE id=$6 RETURNING *",
      [nom, Number(emplacement_id), statut, Number(tarif_horaire) || 0, Number(capacite) || 1, id]
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

// Helper: durée en heures entre deux horaires "HH:MM"
const calculerNbHeures = (heureDebut, heureFin) => {
  const [h1, m1] = (heureDebut || "").split(":").map(Number);
  const [h2, m2] = (heureFin || "").split(":").map(Number);
  if ([h1, m1, h2, m2].some((n) => Number.isNaN(n))) return 0;
  const minutes = (h2 * 60 + m2) - (h1 * 60 + m1);
  return minutes > 0 ? minutes / 60 : 0;
};

// POST /api/coworking/reservations (auth)
router.post("/reservations", authMiddleware, async (req, res) => {
  const { type, item_id, item_nom, date, heure_debut, heure_fin, table_ids } = req.body;
  if (!type || !item_id || !date || !heure_debut || !heure_fin)
    return res.status(400).json({ message: "Tous les champs sont obligatoires." });
  if (!["salle", "table"].includes(type))
    return res.status(400).json({ message: "Type invalide." });

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Durée en heures (calculée côté serveur, source de vérité)
    const nbHeures = calculerNbHeures(heure_debut, heure_fin);

    // Tarif horaire réel en base (on ne fait pas confiance au tarif envoyé par le client)
    const tableIdsArr = Array.isArray(table_ids) ? table_ids.map(Number) : [];
    let tarifHoraire = 0;

    if (type === "salle") {
      const { rows: salleRows } = await client.query(
        "SELECT tarif_horaire FROM salles WHERE id = $1", [item_id]
      );
      tarifHoraire = Number(salleRows[0]?.tarif_horaire) || 0;

      if (tableIdsArr.length) {
        const { rows: tablesRows } = await client.query(
          "SELECT tarif_horaire FROM tables_cw WHERE id = ANY($1::int[])", [tableIdsArr]
        );
        tarifHoraire += tablesRows.reduce((sum, t) => sum + (Number(t.tarif_horaire) || 0), 0);
      }
    } else {
      const { rows: tableRows } = await client.query(
        "SELECT tarif_horaire, emplacement_id FROM tables_cw WHERE id = $1", [item_id]
      );
      const tarifTable = Number(tableRows[0]?.tarif_horaire) || 0;
      if (tarifTable) {
        tarifHoraire = tarifTable;
      } else {
        // Pas de tarif propre à la table → on retombe sur le tarif de sa salle
        const { rows: emplRows } = await client.query(
          "SELECT salle_id FROM emplacements WHERE id = $1", [tableRows[0]?.emplacement_id]
        );
        const { rows: salleRows } = await client.query(
          "SELECT tarif_horaire FROM salles WHERE id = $1", [emplRows[0]?.salle_id]
        );
        tarifHoraire = Number(salleRows[0]?.tarif_horaire) || 0;
      }
    }

    const frais = +(tarifHoraire * nbHeures).toFixed(2);

    const { rows } = await client.query(
      `INSERT INTO reservations
         (user_id, type, item_id, item_nom, date, heure_debut, heure_fin, statut, nb_heures, frais, table_ids)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, user_id, type, item_id, item_nom,
                 to_char(date, 'YYYY-MM-DD') AS date,
                 heure_debut, heure_fin, statut, nb_heures, frais, table_ids, created_at`,
      [req.user.id, type, item_id, item_nom || "", date, heure_debut, heure_fin, "en_attente", nbHeures, frais, JSON.stringify(tableIdsArr)]
    );

    // La table/salle sera bloquée uniquement après acceptation par l'admin (PUT /statut)

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

// GET /api/coworking/reservations/disponibilite?type=salle|table&item_id=ID (auth)
// Renvoie, pour CET item, tous utilisateurs confondus, les créneaux non refusés
// (donc "en_attente" et "acceptée") afin que le calendrier front puisse colorer
// les jours réservés et afficher les heures déjà prises.
router.get("/reservations/disponibilite", authMiddleware, async (req, res) => {
  const { type, item_id } = req.query;
  if (!type || !item_id)
    return res.status(400).json({ message: "Paramètres 'type' et 'item_id' obligatoires." });
  if (!["salle", "table"].includes(type))
    return res.status(400).json({ message: "Type invalide." });

  try {
    const { rows: creneaux } = await db.query(
      `SELECT to_char(date, 'YYYY-MM-DD') AS date, heure_debut, heure_fin, statut
       FROM reservations
       WHERE type = $1 AND item_id = $2 AND statut NOT IN ('refusée', 'annulée')
       ORDER BY date, heure_debut`,
      [type, Number(item_id)]
    );
    return res.json({ creneaux });
  } catch (err) {
    console.error("[reservations disponibilite GET]", err);
    return res.status(500).json({ message: err.message || "Erreur serveur." });
  }
});

// GET /api/coworking/reservations/me (auth)
router.get("/reservations/me", authMiddleware, async (req, res) => {
  try {
    const { rows: reservations } = await db.query(
      `SELECT id, user_id, type, item_id, item_nom,
              to_char(date, 'YYYY-MM-DD') AS date,
              heure_debut, heure_fin, statut, nb_heures, frais, table_ids, created_at
       FROM reservations WHERE user_id = $1 ORDER BY created_at DESC`,
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
      SELECT r.id, r.user_id, r.type, r.item_id, r.item_nom,
             to_char(r.date, 'YYYY-MM-DD') AS date,
             r.heure_debut, r.heure_fin, r.statut, r.nb_heures, r.frais, r.table_ids, r.created_at,
             u.name AS user_name, u.email AS user_email
      FROM reservations r LEFT JOIN users u ON u.id = r.user_id
      ORDER BY r.created_at DESC
    `);
    return res.json({ reservations });
  } catch (err) {
    console.error("[reservations GET]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// ✅ PUT /api/coworking/reservations/:id/statut
// - "acceptée" / "refusée" : réservé aux admins.
// - "annulée" : l'utilisateur propriétaire de la réservation peut l'annuler
//   lui-même, à tout moment (quel que soit le statut actuel), sans passer
//   par un admin. Les admins peuvent également annuler n'importe quelle
//   réservation.
router.put("/reservations/:id/statut", authMiddleware, async (req, res) => {
  const { statut } = req.body;
  const { id } = req.params;
  const isAdmin = req.user.role === "admin" || req.user.role === "superadmin";

  if (!["acceptée", "refusée", "annulée"].includes(statut))
    return res.status(400).json({ message: "Statut invalide. Valeurs acceptées: acceptée, refusée, annulée." });

  if ((statut === "acceptée" || statut === "refusée") && !isAdmin)
    return res.status(403).json({ message: "Accès refusé." });

  const client = await db.connect();
  try {
    const { rows } = await client.query("SELECT * FROM reservations WHERE id = $1", [id]);
    if (!rows.length)
      return res.status(404).json({ message: "Réservation introuvable." });

    const reservation = rows[0];

    // Un utilisateur non-admin ne peut annuler que SA PROPRE réservation.
    if (statut === "annulée" && !isAdmin && reservation.user_id !== req.user.id)
      return res.status(403).json({ message: "Accès refusé." });

    if (reservation.statut === "annulée")
      return res.status(400).json({ message: "Cette réservation est déjà annulée." });

    await client.query("BEGIN");
    await client.query("UPDATE reservations SET statut=$1 WHERE id=$2", [statut, id]);

    if (statut === "refusée" || statut === "annulée") {
      // Une réservation refusée ou annulée libère la table/salle si elle
      // avait été bloquée (cas d'une réservation "acceptée" annulée après coup).
      if (reservation.type === "table")
        await client.query("UPDATE tables_cw SET statut='Libre' WHERE id=$1", [reservation.item_id]);
      if (reservation.type === "salle")
        await client.query("UPDATE salles SET disponible=true WHERE id=$1", [reservation.item_id]);
    } else if (statut === "acceptée") {
      if (reservation.type === "table")
        await client.query("UPDATE tables_cw SET statut='Réservée' WHERE id=$1", [reservation.item_id]);
      if (reservation.type === "salle")
        await client.query("UPDATE salles SET disponible=false WHERE id=$1", [reservation.item_id]);
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

    await client.query("BEGIN");
    await client.query("DELETE FROM reservations WHERE id = $1", [req.params.id]);

    if (reservation.type === "table")
      await client.query("UPDATE tables_cw SET statut='Libre' WHERE id=$1", [reservation.item_id]);
    if (reservation.type === "salle")
      await client.query("UPDATE salles SET disponible=true WHERE id=$1", [reservation.item_id]);

    await client.query("COMMIT");
    return res.json({ message: "Réservation supprimée." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[reservations DELETE]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  } finally {
    client.release();
  }
});

module.exports = router;