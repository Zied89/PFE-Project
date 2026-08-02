const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middleware/Authmiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const STATUTS_VALIDES = ["en_attente", "acceptée", "refusée"];

/* Regroupe des lignes commandes + commande_items en objets { ...commande, items: [...] } */
function groupCommandes(commandeRows, itemRows) {
  const itemsByCommande = {};
  for (const item of itemRows) {
    if (!itemsByCommande[item.commande_id]) itemsByCommande[item.commande_id] = [];
    itemsByCommande[item.commande_id].push(item);
  }
  return commandeRows.map((c) => ({ ...c, items: itemsByCommande[c.id] || [] }));
}

// ✅ POST /api/commandes — enregistrer une commande au moment du checkout (auth)
router.post("/", authMiddleware, async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: "Le panier est vide." });

  for (const it of items) {
    if (!it.titre || it.prix == null || !["formation", "cours"].includes(it.type))
      return res.status(400).json({ message: "Article de commande invalide." });
  }

  const total = items.reduce((acc, it) => acc + Number(it.prix || 0), 0);

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { rows: cRows } = await client.query(
      `INSERT INTO commandes (user_id, total, statut) VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, total, "en_attente"]
    );
    const commande = cRows[0];

    const insertedItems = [];
    for (const it of items) {
      const { rows: iRows } = await client.query(
        `INSERT INTO commande_items (commande_id, type, formation_id, titre, prix, tag, icon)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          commande.id,
          it.type,
          it.formationId || null,
          it.titre,
          it.prix,
          it.tag || null,
          it.icon || null,
        ]
      );
      insertedItems.push(iRows[0]);
    }

    await client.query("COMMIT");
    return res.status(201).json({
      message: "Commande enregistrée. En attente de validation par l'admin.",
      commande: { ...commande, items: insertedItems },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[commandes POST]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  } finally {
    client.release();
  }
});

// GET /api/commandes/me — mes commandes (auth)
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const { rows: commandeRows } = await db.query(
      `SELECT * FROM commandes WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    if (!commandeRows.length) return res.json({ commandes: [] });

    const ids = commandeRows.map((c) => c.id);
    const { rows: itemRows } = await db.query(
      `SELECT * FROM commande_items WHERE commande_id = ANY($1::int[])`,
      [ids]
    );

    return res.json({ commandes: groupCommandes(commandeRows, itemRows) });
  } catch (err) {
    console.error("[commandes/me GET]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// GET /api/commandes/all — toutes les commandes, tous users (admin)
router.get("/all", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { rows: commandeRows } = await db.query(
      `SELECT c.*, u.name AS user_name, u.email AS user_email
       FROM commandes c
       LEFT JOIN users u ON u.id = c.user_id
       ORDER BY c.created_at DESC`
    );
    if (!commandeRows.length) return res.json({ commandes: [] });

    const ids = commandeRows.map((c) => c.id);
    const { rows: itemRows } = await db.query(
      `SELECT * FROM commande_items WHERE commande_id = ANY($1::int[])`,
      [ids]
    );

    return res.json({ commandes: groupCommandes(commandeRows, itemRows) });
  } catch (err) {
    console.error("[commandes/all GET]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// PUT /api/commandes/:id/statut — accepter / refuser une commande (admin)
router.put("/:id/statut", authMiddleware, adminMiddleware, async (req, res) => {
  const { statut } = req.body;
  if (!STATUTS_VALIDES.includes(statut))
    return res.status(400).json({ message: "Statut invalide." });

  try {
    const check = await db.query("SELECT id FROM commandes WHERE id = $1", [req.params.id]);
    if (!check.rows.length)
      return res.status(404).json({ message: "Commande introuvable." });

    await db.query("UPDATE commandes SET statut = $1 WHERE id = $2", [statut, req.params.id]);
    return res.json({ message: "Statut mis à jour." });
  } catch (err) {
    console.error("[commandes/:id/statut PUT]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// DELETE /api/commandes/:id — supprimer une commande (superadmin)
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const check = await db.query("SELECT id FROM commandes WHERE id = $1", [req.params.id]);
    if (!check.rows.length)
      return res.status(404).json({ message: "Commande introuvable." });

    await db.query("DELETE FROM commandes WHERE id = $1", [req.params.id]);
    return res.json({ message: "Commande supprimée." });
  } catch (err) {
    console.error("[commandes/:id DELETE]", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;