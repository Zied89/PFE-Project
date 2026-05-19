const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middleware/Authmiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// ⚠️ Les routes statiques AVANT les routes paramétrées /:id

// GET /api/formations/inscriptions/me (auth)
router.get("/inscriptions/me", authMiddleware, async (req, res) => {
  try {
    const { rows: inscriptions } = await db.query(
      `SELECT i.*, f.titre, f.categorie, f.duree, f.prix, f.icon, f.accent, f.tag
       FROM inscriptions i LEFT JOIN formations f ON f.id = i.formation_id
       WHERE i.user_id = $1 ORDER BY i.created_at DESC`,
      [req.user.id]
    );
    return res.json({ inscriptions });
  } catch (err) {
    console.error("[inscriptions/me]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// GET /api/formations/inscriptions/all (admin)
router.get("/inscriptions/all", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { rows: inscriptions } = await db.query(
      `SELECT i.*, u.name AS user_name, u.email AS user_email, f.titre AS formation_titre
       FROM inscriptions i
       LEFT JOIN users u ON u.id = i.user_id
       LEFT JOIN formations f ON f.id = i.formation_id
       ORDER BY i.created_at DESC`
    );
    return res.json({ inscriptions });
  } catch (err) {
    console.error("[inscriptions/all]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// PUT /api/formations/inscriptions/:id/statut (admin)
router.put("/inscriptions/:id/statut", authMiddleware, adminMiddleware, async (req, res) => {
  const { statut } = req.body;
  if (!["En attente", "Validée", "Refusée"].includes(statut))
    return res.status(400).json({ message: "Statut invalide." });

  try {
    const { rows } = await db.query(
      "SELECT id FROM inscriptions WHERE id = $1",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Inscription introuvable." });

    await db.query(
      "UPDATE inscriptions SET statut = $1 WHERE id = $2",
      [statut, req.params.id]
    );
    return res.json({ message: "Statut mis à jour." });
  } catch (err) {
    console.error("[inscriptions/:id/statut]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// GET /api/formations — liste (auth)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { rows: formations } = await db.query("SELECT * FROM formations ORDER BY id");
    return res.json({ formations });
  } catch (err) {
    console.error("[formations GET]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/formations (admin)
router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  const { titre, categorie, description, duree, prix, places, tag, icon, accent } = req.body;
  if (!titre || !categorie || !description)
    return res.status(400).json({ message: "Titre, catégorie et description sont obligatoires." });

  try {
    const { rows } = await db.query(
      `INSERT INTO formations (titre, categorie, description, duree, prix, places, tag, icon, accent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        titre, categorie, description,
        duree || "3 mois",
        prix || 0,
        places || 20,
        tag || "Tech",
        icon || "📚",
        accent || "gold",
      ]
    );
    return res.status(201).json({ formation: rows[0] });
  } catch (err) {
    console.error("[formations POST]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// GET /api/formations/:id — détail (auth)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM formations WHERE id = $1",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Formation introuvable." });
    return res.json({ formation: rows[0] });
  } catch (err) {
    console.error("[formations GET/:id]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// PUT /api/formations/:id (admin)
router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { titre, categorie, description, duree, prix, places, tag, icon, accent } = req.body;

  try {
    const check = await db.query("SELECT id FROM formations WHERE id = $1", [id]);
    if (!check.rows.length) return res.status(404).json({ message: "Formation introuvable." });

    const { rows } = await db.query(
      `UPDATE formations
       SET titre=$1, categorie=$2, description=$3, duree=$4, prix=$5,
           places=$6, tag=$7, icon=$8, accent=$9
       WHERE id=$10
       RETURNING *`,
      [titre, categorie, description, duree, prix, places, tag, icon, accent, id]
    );
    return res.json({ formation: rows[0] });
  } catch (err) {
    console.error("[formations PUT/:id]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/formations/:id (admin)
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const check = await db.query("SELECT id FROM formations WHERE id = $1", [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ message: "Formation introuvable." });

    await db.query("DELETE FROM formations WHERE id = $1", [req.params.id]);
    return res.json({ message: "Formation supprimée." });
  } catch (err) {
    console.error("[formations DELETE/:id]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/formations/:id/inscrire (auth)
router.post("/:id/inscrire", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const formCheck = await db.query("SELECT * FROM formations WHERE id = $1", [id]);
    if (!formCheck.rows.length) return res.status(404).json({ message: "Formation introuvable." });
    const formation = formCheck.rows[0];

    const existing = await db.query(
      "SELECT id FROM inscriptions WHERE user_id = $1 AND formation_id = $2",
      [req.user.id, id]
    );
    if (existing.rows.length)
      return res.status(409).json({ message: "Vous êtes déjà inscrit à cette formation." });

    const { rows } = await db.query(
      "INSERT INTO inscriptions (user_id, formation_id, statut) VALUES ($1, $2, $3) RETURNING *",
      [req.user.id, id, "En attente"]
    );
    return res.status(201).json({
      inscription: rows[0],
      message: `Inscription à "${formation.titre}" confirmée !`,
    });
  } catch (err) {
    console.error("[inscrire POST]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/formations/inscrire-multiple (auth)
router.post("/inscrire-multiple", authMiddleware, async (req, res) => {
  const { formationIds } = req.body;
  if (!Array.isArray(formationIds) || formationIds.length === 0)
    return res.status(400).json({ message: "Aucune formation sélectionnée." });

  const client = await db.connect(); // transaction manuelle
  try {
    await client.query("BEGIN");
    const added = [];

    for (const id of formationIds) {
      const formCheck = await client.query(
        "SELECT id FROM formations WHERE id = $1", [id]
      );
      if (!formCheck.rows.length) continue;

      const isExist = await client.query(
        "SELECT id FROM inscriptions WHERE user_id = $1 AND formation_id = $2",
        [req.user.id, id]
      );
      if (!isExist.rows.length) {
        await client.query(
          "INSERT INTO inscriptions (user_id, formation_id, statut) VALUES ($1, $2, $3)",
          [req.user.id, id, "En attente"]
        );
        added.push(id);
      }
    }

    await client.query("COMMIT");
    return res.status(201).json({
      message: `Inscription réussie pour ${added.length} formation(s).`,
      added,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[inscrire-multiple POST]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  } finally {
    client.release();
  }
});

// DELETE /api/formations/:id/desinscrire (auth)
router.delete("/:id/desinscrire", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await db.query(
      "SELECT * FROM inscriptions WHERE user_id = $1 AND formation_id = $2",
      [req.user.id, id]
    );
    if (!rows.length) return res.status(404).json({ message: "Inscription introuvable." });

    await db.query("DELETE FROM inscriptions WHERE id = $1", [rows[0].id]);
    return res.json({ message: "Désinscription effectuée." });
  } catch (err) {
    console.error("[desinscrire DELETE]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;