const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middleware/Authmiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// ⚠️ TOUTES les routes statiques AVANT les routes paramétrées /:id (même logique que formations.js)

// ─────────────────────────────────────────────
// INSCRIPTIONS AUX MODULES
// ─────────────────────────────────────────────

// GET /api/modules/inscriptions/me — mes inscriptions à des modules (auth)
router.get("/inscriptions/me", authMiddleware, async (req, res) => {
  try {
    const { rows: inscriptions } = await db.query(
      `SELECT im.*, m.titre AS module_titre, m.description AS module_description,
              m.duree AS module_duree, m.prix AS module_prix,
              f.id AS formation_id, f.titre AS formation_titre
       FROM inscriptions_modules im
       LEFT JOIN modules m ON m.id = im.module_id
       LEFT JOIN formations f ON f.id = m.formation_id
       WHERE im.user_id = $1
       ORDER BY im.created_at DESC`,
      [req.user.id]
    );
    return res.json({ inscriptions });
  } catch (err) {
    console.error("[modules inscriptions/me]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// GET /api/modules/inscriptions/all — toutes les inscriptions aux modules (admin)
router.get("/inscriptions/all", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { rows: inscriptions } = await db.query(
      `SELECT im.*, u.name AS user_name, u.email AS user_email,
              m.titre AS module_titre, m.prix AS module_prix,
              f.id AS formation_id, f.titre AS formation_titre
       FROM inscriptions_modules im
       LEFT JOIN users u ON u.id = im.user_id
       LEFT JOIN modules m ON m.id = im.module_id
       LEFT JOIN formations f ON f.id = m.formation_id
       ORDER BY im.created_at DESC`
    );
    return res.json({ inscriptions });
  } catch (err) {
    console.error("[modules inscriptions/all]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// PUT /api/modules/inscriptions/:id/statut — changer le statut d'une inscription (admin)
router.put("/inscriptions/:id/statut", authMiddleware, adminMiddleware, async (req, res) => {
  const { statut } = req.body;
  if (!["en_attente", "acceptée", "refusée"].includes(statut))
    return res.status(400).json({ message: "Statut invalide." });

  try {
    const { rows } = await db.query(
      "SELECT id FROM inscriptions_modules WHERE id = $1",
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Inscription introuvable." });

    await db.query(
      "UPDATE inscriptions_modules SET statut = $1 WHERE id = $2",
      [statut, req.params.id]
    );
    return res.json({ message: "Statut mis à jour." });
  } catch (err) {
    console.error("[modules inscriptions/:id/statut]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/modules/inscriptions/:id — supprimer une inscription (admin)
router.delete("/inscriptions/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id FROM inscriptions_modules WHERE id = $1",
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Inscription introuvable." });

    await db.query("DELETE FROM inscriptions_modules WHERE id = $1", [req.params.id]);
    return res.json({ message: "Inscription supprimée." });
  } catch (err) {
    console.error("[modules inscriptions/:id DELETE]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// ─────────────────────────────────────────────
// MODULES (rattachés à une formation)
// ─────────────────────────────────────────────

// GET /api/modules/formation/:formationId — liste des modules d'une formation (auth)
router.get("/formation/:formationId", authMiddleware, async (req, res) => {
  try {
    const { rows: modules } = await db.query(
      "SELECT * FROM modules WHERE formation_id = $1 ORDER BY ordre, id",
      [req.params.formationId]
    );
    return res.json({ modules });
  } catch (err) {
    console.error("[modules formation GET]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/modules/formation/:formationId — créer un module (admin)
router.post("/formation/:formationId", authMiddleware, adminMiddleware, async (req, res) => {
  const { formationId } = req.params;
  const { titre, description, duree, prix, ordre } = req.body;

  if (!titre)
    return res.status(400).json({ message: "Le titre est obligatoire." });

  try {
    const formCheck = await db.query("SELECT id FROM formations WHERE id = $1", [formationId]);
    if (!formCheck.rows.length)
      return res.status(404).json({ message: "Formation introuvable." });

    const { rows } = await db.query(
      `INSERT INTO modules (formation_id, titre, description, duree, prix, ordre)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [formationId, titre, description || "", duree || "2 semaines", prix || 0, ordre || 0]
    );
    return res.status(201).json({ module: rows[0] });
  } catch (err) {
    console.error("[modules formation POST]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// GET /api/modules/:id — détail d'un module (auth)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM modules WHERE id = $1", [req.params.id]);
    if (!rows.length)
      return res.status(404).json({ message: "Module introuvable." });
    return res.json({ module: rows[0] });
  } catch (err) {
    console.error("[modules GET/:id]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// PUT /api/modules/:id — modifier un module (admin)
router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { titre, description, duree, prix, ordre } = req.body;

  try {
    const check = await db.query("SELECT id FROM modules WHERE id = $1", [id]);
    if (!check.rows.length)
      return res.status(404).json({ message: "Module introuvable." });

    const { rows } = await db.query(
      `UPDATE modules SET titre=$1, description=$2, duree=$3, prix=$4, ordre=$5
       WHERE id=$6 RETURNING *`,
      [titre, description, duree, prix, ordre, id]
    );
    return res.json({ module: rows[0] });
  } catch (err) {
    console.error("[modules PUT/:id]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/modules/:id — supprimer un module (admin)
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const check = await db.query("SELECT id FROM modules WHERE id = $1", [req.params.id]);
    if (!check.rows.length)
      return res.status(404).json({ message: "Module introuvable." });

    await db.query("DELETE FROM modules WHERE id = $1", [req.params.id]);
    return res.json({ message: "Module supprimé." });
  } catch (err) {
    console.error("[modules DELETE/:id]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/modules/:id/inscrire — s'inscrire à un module (auth)
router.post("/:id/inscrire", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const modCheck = await db.query("SELECT * FROM modules WHERE id = $1", [id]);
    if (!modCheck.rows.length)
      return res.status(404).json({ message: "Module introuvable." });
    const module = modCheck.rows[0];

    const existing = await db.query(
      "SELECT id FROM inscriptions_modules WHERE user_id = $1 AND module_id = $2",
      [req.user.id, id]
    );
    if (existing.rows.length)
      return res.status(409).json({ message: "Vous êtes déjà inscrit(e) à ce module." });

    const { rows } = await db.query(
      "INSERT INTO inscriptions_modules (user_id, module_id, statut) VALUES ($1, $2, $3) RETURNING *",
      [req.user.id, id, "en_attente"]
    );
    return res.status(201).json({
      inscription: rows[0],
      message: `Inscription au module "${module.titre}" confirmée !`,
    });
  } catch (err) {
    console.error("[modules :id/inscrire POST]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/modules/:id/desinscrire — se désinscrire d'un module (auth)
router.delete("/:id/desinscrire", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await db.query(
      "SELECT * FROM inscriptions_modules WHERE user_id = $1 AND module_id = $2",
      [req.user.id, id]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Inscription introuvable." });

    await db.query("DELETE FROM inscriptions_modules WHERE id = $1", [rows[0].id]);
    return res.json({ message: "Désinscription effectuée." });
  } catch (err) {
    console.error("[modules :id/desinscrire DELETE]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;