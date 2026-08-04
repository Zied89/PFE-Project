const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middleware/Authmiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// ⚠️ TOUTES les routes statiques AVANT les routes paramétrées /:id

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
      `SELECT i.*, u.name AS user_name, u.email AS user_email,
              f.titre AS formation_titre, f.prix AS formation_prix
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
  if (!["en_attente", "acceptée", "refusée"].includes(statut))
    return res.status(400).json({ message: "Statut invalide." });

  try {
    const { rows } = await db.query(
      "SELECT id FROM inscriptions WHERE id = $1",
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Inscription introuvable." });

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

// DELETE /api/formations/inscriptions/:id (superadmin)
router.delete("/inscriptions/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id FROM inscriptions WHERE id = $1",
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Inscription introuvable." });

    await db.query("DELETE FROM inscriptions WHERE id = $1", [req.params.id]);
    return res.json({ message: "Inscription supprimée." });
  } catch (err) {
    console.error("[inscriptions/:id DELETE]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// ✅ POST /api/formations/inscrire-multiple — REMONTÉ ICI avant /:id
router.post("/inscrire-multiple", authMiddleware, async (req, res) => {
  const { formationIds } = req.body;
  if (!Array.isArray(formationIds) || formationIds.length === 0)
    return res.status(400).json({ message: "Aucune formation sélectionnée." });

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const added = [];
    const already = [];

    for (const id of formationIds) {
      const formCheck = await client.query(
        "SELECT id, titre FROM formations WHERE id = $1", [id]
      );
      if (!formCheck.rows.length) continue;

      const isExist = await client.query(
        "SELECT id FROM inscriptions WHERE user_id = $1 AND formation_id = $2",
        [req.user.id, id]
      );
      if (isExist.rows.length) {
        already.push(id);
        continue;
      }

      await client.query(
        "INSERT INTO inscriptions (user_id, formation_id, statut) VALUES ($1, $2, $3)",
        [req.user.id, id, "en_attente"]
      );
      added.push(id);
    }

    await client.query("COMMIT");

    if (added.length === 0 && already.length > 0)
      return res.status(409).json({ message: "Vous êtes déjà inscrit à toutes ces formations." });

    return res.status(201).json({
      message: `Inscription réussie pour ${added.length} formation(s).`,
      added,
      already,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[inscrire-multiple POST]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  } finally {
    client.release();
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
  const {
    titre, categorie, description, duree, prix, places, tag, icon, accent,
    minParticipants, maxParticipants, modules,
  } = req.body;
  if (!titre || !categorie || !description)
    return res.status(400).json({ message: "Titre, catégorie et description sont obligatoires." });

  const minP = minParticipants !== undefined && minParticipants !== null && minParticipants !== ""
    ? Number(minParticipants) : 5;
  const maxP = maxParticipants !== undefined && maxParticipants !== null && maxParticipants !== ""
    ? Number(maxParticipants) : (places || 20);

  if (Number.isNaN(minP) || Number.isNaN(maxP) || minP < 0 || maxP < 0)
    return res.status(400).json({ message: "Nombre de participants invalide." });
  if (maxP < minP)
    return res.status(400).json({ message: "Le maximum de participants doit être ≥ au minimum." });

  try {
    const { rows } = await db.query(
      `INSERT INTO formations
         (titre, categorie, description, duree, prix, places, tag, icon, accent,
          min_participants, max_participants, modules)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        titre, categorie, description,
        duree  || "3 mois",
        prix   || 0,
        maxP,
        tag    || "Tech",
        icon   || "📚",
        accent || "gold",
        minP,
        maxP,
        JSON.stringify(Array.isArray(modules) ? modules : []),
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
      "SELECT * FROM formations WHERE id = $1", [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Formation introuvable." });
    return res.json({ formation: rows[0] });
  } catch (err) {
    console.error("[formations GET/:id]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// PUT /api/formations/:id (admin)
router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const {
    titre, categorie, description, duree, prix, places, tag, icon, accent,
    minParticipants, maxParticipants, modules,
  } = req.body;

  const minP = minParticipants !== undefined && minParticipants !== null && minParticipants !== ""
    ? Number(minParticipants) : 5;
  const maxP = maxParticipants !== undefined && maxParticipants !== null && maxParticipants !== ""
    ? Number(maxParticipants) : (places || 20);

  if (Number.isNaN(minP) || Number.isNaN(maxP) || minP < 0 || maxP < 0)
    return res.status(400).json({ message: "Nombre de participants invalide." });
  if (maxP < minP)
    return res.status(400).json({ message: "Le maximum de participants doit être ≥ au minimum." });

  try {
    const check = await db.query("SELECT id FROM formations WHERE id = $1", [id]);
    if (!check.rows.length)
      return res.status(404).json({ message: "Formation introuvable." });

    const { rows } = await db.query(
      `UPDATE formations
       SET titre=$1, categorie=$2, description=$3, duree=$4, prix=$5,
           places=$6, tag=$7, icon=$8, accent=$9,
           min_participants=$10, max_participants=$11, modules=$12
       WHERE id=$13 RETURNING *`,
      [
        titre, categorie, description, duree, prix, maxP, tag, icon, accent,
        minP, maxP, JSON.stringify(Array.isArray(modules) ? modules : []),
        id,
      ]
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
    if (!check.rows.length)
      return res.status(404).json({ message: "Formation introuvable." });

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
    if (!formCheck.rows.length)
      return res.status(404).json({ message: "Formation introuvable." });
    const formation = formCheck.rows[0];

    const existing = await db.query(
      "SELECT id FROM inscriptions WHERE user_id = $1 AND formation_id = $2",
      [req.user.id, id]
    );
    if (existing.rows.length)
      return res.status(409).json({ message: "Vous êtes déjà inscrit à cette formation." });

    const { rows } = await db.query(
      "INSERT INTO inscriptions (user_id, formation_id, statut) VALUES ($1, $2, $3) RETURNING *",
      [req.user.id, id, "en_attente"]
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

// POST /api/formations/:id/cours/inscrire (auth)
// Inscription à un cours individuel au sein d'une formation. Les cours sont
// un catalogue statique côté frontend (pas de table dédiée en base), donc le
// titre/durée/prix du cours sont transmis dans le corps de la requête et
// stockés directement sur la ligne d'inscription (type = "cours").
router.post("/:id/cours/inscrire", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { titre, duree, prix } = req.body;

  if (!titre || !titre.trim())
    return res.status(400).json({ message: "Titre du cours requis." });

  try {
    const formCheck = await db.query("SELECT id, titre FROM formations WHERE id = $1", [id]);
    if (!formCheck.rows.length)
      return res.status(404).json({ message: "Formation introuvable." });

    const existing = await db.query(
      `SELECT id FROM inscriptions
       WHERE user_id = $1 AND formation_id = $2 AND type = 'cours' AND cours_titre = $3`,
      [req.user.id, id, titre.trim()]
    );
    if (existing.rows.length)
      return res.status(409).json({ message: "Vous êtes déjà inscrit à ce cours." });

    const { rows } = await db.query(
      `INSERT INTO inscriptions (user_id, formation_id, statut, type, cours_titre, cours_duree, cours_prix)
       VALUES ($1, $2, 'en_attente', 'cours', $3, $4, $5) RETURNING *`,
      [req.user.id, id, titre.trim(), duree || null, prix != null ? Number(prix) : 0]
    );
    return res.status(201).json({
      inscription: rows[0],
      message: `Inscription au cours "${titre}" confirmée !`,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Vous êtes déjà inscrit à ce cours ou à cette formation." });
    }
    console.error("[cours inscrire POST]", err);
    return res.status(500).json({ message: "Erreur serveur." });
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
    if (!rows.length)
      return res.status(404).json({ message: "Inscription introuvable." });

    await db.query("DELETE FROM inscriptions WHERE id = $1", [rows[0].id]);
    return res.json({ message: "Désinscription effectuée." });
  } catch (err) {
    console.error("[desinscrire DELETE]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;