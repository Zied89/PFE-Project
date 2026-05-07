const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middleware/Authmiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// ⚠️  Les routes statiques AVANT les routes paramétrées /:id

// GET /api/formations/inscriptions/me (auth)
router.get("/inscriptions/me", authMiddleware, (req, res) => {
  try {
    const inscriptions = db.prepare(`
      SELECT i.*, f.titre, f.categorie, f.duree, f.prix, f.icon, f.accent, f.tag
      FROM inscriptions i LEFT JOIN formations f ON f.id = i.formation_id
      WHERE i.user_id = ? ORDER BY i.created_at DESC
    `).all(req.user.id);
    return res.json({ inscriptions });
  } catch (err) {
    console.error("[inscriptions/me]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// GET /api/formations/inscriptions/all (admin)
router.get("/inscriptions/all", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const inscriptions = db.prepare(`
      SELECT i.*, u.name AS user_name, u.email AS user_email, f.titre AS formation_titre
      FROM inscriptions i
      LEFT JOIN users u ON u.id = i.user_id
      LEFT JOIN formations f ON f.id = i.formation_id
      ORDER BY i.created_at DESC
    `).all();
    return res.json({ inscriptions });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// PUT /api/formations/inscriptions/:id/statut (admin)
router.put("/inscriptions/:id/statut", authMiddleware, adminMiddleware, (req, res) => {
  const { statut } = req.body;
  if (!["En attente", "Validée", "Refusée"].includes(statut))
    return res.status(400).json({ message: "Statut invalide." });
  const insc = db.prepare("SELECT id FROM inscriptions WHERE id = ?").get(req.params.id);
  if (!insc) return res.status(404).json({ message: "Inscription introuvable." });
  db.prepare("UPDATE inscriptions SET statut = ? WHERE id = ?").run(statut, req.params.id);
  return res.json({ message: "Statut mis à jour." });
});

// ══════════════════════════════════════════════════════════════
// GET /api/formations — liste (auth)
// ══════════════════════════════════════════════════════════════
router.get("/", authMiddleware, (req, res) => {
  try {
    const formations = db.prepare("SELECT * FROM formations ORDER BY id").all();
    return res.json({ formations });
  } catch (err) {
    console.error("[formations GET]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/formations (admin)
router.post("/", authMiddleware, adminMiddleware, (req, res) => {
  const { titre, categorie, description, duree, prix, places, tag, icon, accent } = req.body;
  if (!titre || !categorie || !description)
    return res.status(400).json({ message: "Titre, catégorie et description sont obligatoires." });
  try {
    const r = db.prepare(`
      INSERT INTO formations (titre, categorie, description, duree, prix, places, tag, icon, accent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(titre, categorie, description, duree || "3 mois", prix || 0, places || 20,
           tag || "Tech", icon || "📚", accent || "gold");
    return res.status(201).json({
      formation: db.prepare("SELECT * FROM formations WHERE id = ?").get(r.lastInsertRowid)
    });
  } catch (err) {
    console.error("[formations POST]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// GET /api/formations/:id — détail (auth)
router.get("/:id", authMiddleware, (req, res) => {
  const formation = db.prepare("SELECT * FROM formations WHERE id = ?").get(req.params.id);
  if (!formation) return res.status(404).json({ message: "Formation introuvable." });
  return res.json({ formation });
});

// PUT /api/formations/:id (admin)
router.put("/:id", authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  const { titre, categorie, description, duree, prix, places, tag, icon, accent } = req.body;
  if (!db.prepare("SELECT id FROM formations WHERE id = ?").get(id))
    return res.status(404).json({ message: "Formation introuvable." });
  try {
    db.prepare(`
      UPDATE formations
      SET titre=?, categorie=?, description=?, duree=?, prix=?, places=?, tag=?, icon=?, accent=?
      WHERE id=?
    `).run(titre, categorie, description, duree, prix, places, tag, icon, accent, id);
    return res.json({ formation: db.prepare("SELECT * FROM formations WHERE id = ?").get(id) });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/formations/:id (admin)
router.delete("/:id", authMiddleware, adminMiddleware, (req, res) => {
  if (!db.prepare("SELECT id FROM formations WHERE id = ?").get(req.params.id))
    return res.status(404).json({ message: "Formation introuvable." });
  db.prepare("DELETE FROM formations WHERE id = ?").run(req.params.id);
  return res.json({ message: "Formation supprimée." });
});

// POST /api/formations/:id/inscrire (auth)
router.post("/:id/inscrire", authMiddleware, (req, res) => {
  const { id } = req.params;
  const formation = db.prepare("SELECT * FROM formations WHERE id = ?").get(id);
  if (!formation) return res.status(404).json({ message: "Formation introuvable." });

  const existing = db.prepare(
    "SELECT id FROM inscriptions WHERE user_id = ? AND formation_id = ?"
  ).get(req.user.id, id);
  if (existing) return res.status(409).json({ message: "Vous êtes déjà inscrit à cette formation." });

  try {
    const r = db.prepare(
      "INSERT INTO inscriptions (user_id, formation_id, statut) VALUES (?, ?, ?)"
    ).run(req.user.id, id, "En attente");
    return res.status(201).json({
      inscription: db.prepare("SELECT * FROM inscriptions WHERE id = ?").get(r.lastInsertRowid),
      message: `Inscription à "${formation.titre}" confirmée !`
    });
  } catch (err) {
    console.error("[inscrire POST]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/formations/inscrire-multiple (auth)
router.post("/inscrire-multiple", authMiddleware, (req, res) => {
  const { formationIds } = req.body;
  if (!Array.isArray(formationIds) || formationIds.length === 0) {
    return res.status(400).json({ message: "Aucune formation sélectionnée." });
  }

  try {
    const added = [];
    const insertStmt = db.prepare("INSERT INTO inscriptions (user_id, formation_id, statut) VALUES (?, ?, ?)");
    const checkStmt = db.prepare("SELECT id FROM inscriptions WHERE user_id = ? AND formation_id = ?");

    const inscrireTransaction = db.transaction((ids) => {
      for (const id of ids) {
        const formation = db.prepare("SELECT * FROM formations WHERE id = ?").get(id);
        if (!formation) continue;

        const isExist = checkStmt.get(req.user.id, id);
        if (!isExist) {
          insertStmt.run(req.user.id, id, "En attente");
          added.push(id);
        }
      }
    });

    inscrireTransaction(formationIds);

    return res.status(201).json({
      message: `Inscription réussie pour ${added.length} formation(s).`,
      added
    });
  } catch (err) {
    console.error("[inscrire-multiple POST]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/formations/:id/desinscrire (auth)
router.delete("/:id/desinscrire", authMiddleware, (req, res) => {
  const { id } = req.params;
  const inscription = db.prepare(
    "SELECT * FROM inscriptions WHERE user_id = ? AND formation_id = ?"
  ).get(req.user.id, id);
  if (!inscription) return res.status(404).json({ message: "Inscription introuvable." });
  db.prepare("DELETE FROM inscriptions WHERE id = ?").run(inscription.id);
  return res.json({ message: "Désinscription effectuée." });
});

module.exports = router;
