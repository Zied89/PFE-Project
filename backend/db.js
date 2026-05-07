const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "app.db"));

// Activer les clés étrangères + WAL
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Schéma ───────────────────────────────────────────────────────────────────
db.exec(`
  -- Utilisateurs
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    name       TEXT     NOT NULL,
    email      TEXT     NOT NULL UNIQUE,
    password   TEXT     NOT NULL,
    role       TEXT     NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin','superadmin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Formations
  CREATE TABLE IF NOT EXISTS formations (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT,
    titre       TEXT     NOT NULL,
    categorie   TEXT     NOT NULL,
    description TEXT     NOT NULL,
    duree       TEXT     NOT NULL DEFAULT '3 mois',
    prix        REAL     NOT NULL DEFAULT 0,
    places      INTEGER  NOT NULL DEFAULT 20,
    tag         TEXT     NOT NULL DEFAULT 'Tech',
    icon        TEXT     NOT NULL DEFAULT '📚',
    accent      TEXT     NOT NULL DEFAULT 'gold',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Salles de coworking
  CREATE TABLE IF NOT EXISTS salles (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    nom        TEXT     NOT NULL,
    capacite   INTEGER  NOT NULL DEFAULT 10,
    disponible INTEGER  NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Emplacements dans les salles
  CREATE TABLE IF NOT EXISTS emplacements (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    nom        TEXT     NOT NULL,
    salle_id   INTEGER  NOT NULL REFERENCES salles(id) ON DELETE CASCADE,
    places     INTEGER  NOT NULL DEFAULT 4,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Tables dans les emplacements
  CREATE TABLE IF NOT EXISTS tables_cw (
    id              INTEGER  PRIMARY KEY AUTOINCREMENT,
    nom             TEXT     NOT NULL,
    emplacement_id  INTEGER  NOT NULL REFERENCES emplacements(id) ON DELETE CASCADE,
    statut          TEXT     NOT NULL DEFAULT 'Libre' CHECK(statut IN ('Libre','Occupée','Réservée')),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Réservations (salle ou table)
  CREATE TABLE IF NOT EXISTS reservations (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT     NOT NULL CHECK(type IN ('salle','table')),
    item_id     INTEGER  NOT NULL,
    item_nom    TEXT     NOT NULL,
    date        TEXT     NOT NULL,
    heure_debut TEXT     NOT NULL,
    heure_fin   TEXT     NOT NULL,
    statut      TEXT     NOT NULL DEFAULT 'Confirmée',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Inscriptions aux formations
  CREATE TABLE IF NOT EXISTS inscriptions (
    id           INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    formation_id INTEGER  NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
    statut       TEXT     NOT NULL DEFAULT 'En attente',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, formation_id)
  );
`);

// ─── Migration : ajouter colonne role si elle n'existe pas encore ──────────────
try {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin','superadmin'))`);
} catch (_) { /* colonne déjà existante */ }

// ─── Seed formations ──────────────────────────────────────────────────────────
const formationCount = db.prepare("SELECT COUNT(*) as c FROM formations").get().c;
if (formationCount === 0) {
  const insertFormation = db.prepare(`
    INSERT INTO formations (titre, categorie, description, duree, prix, places, tag, icon, accent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const seedFormations = db.transaction(() => {
    insertFormation.run("Développement Web", "Développement Web",
      "HTML, CSS, JavaScript, React, Node.js et bien plus. Devenez développeur full-stack opérationnel.",
      "3 mois", 4500, 20, "Tech", "💻", "gold");
    insertFormation.run("Design Graphique", "Design Graphique",
      "Figma, Adobe Suite, UI/UX, typographie et identité visuelle. Créez des interfaces mémorables.",
      "2 mois", 3200, 15, "Créatif", "🎨", "teal");
    insertFormation.run("Marketing Digital", "Marketing Digital",
      "SEO, réseaux sociaux, publicité en ligne et stratégie de contenu. Développez votre audience.",
      "2 mois", 2800, 18, "Business", "📈", "gold");
    insertFormation.run("Intelligence Artificielle", "Intelligence Artificielle",
      "Machine learning, deep learning, Python, LLMs et pipelines de données. Maîtrisez l'IA moderne.",
      "4 mois", 6000, 12, "IA & Data", "🤖", "teal");
  });
  seedFormations();
}

// ─── Seed salles ──────────────────────────────────────────────────────────────
const salleCount = db.prepare("SELECT COUNT(*) as c FROM salles").get().c;
if (salleCount === 0) {
  const insertSalle = db.prepare("INSERT INTO salles (nom, capacite, disponible) VALUES (?, ?, ?)");
  const insertEmp   = db.prepare("INSERT INTO emplacements (nom, salle_id, places) VALUES (?, ?, ?)");
  const insertTable = db.prepare("INSERT INTO tables_cw (nom, emplacement_id, statut) VALUES (?, ?, ?)");

  const seedCoworking = db.transaction(() => {
    const s1 = insertSalle.run("Salle Sakura", 10, 1);
    const s2 = insertSalle.run("Salle Horizon", 20, 1);
    insertSalle.run("Salle Zenith", 6, 0);

    const e1 = insertEmp.run("Zone A - Open Space", s1.lastInsertRowid, 10);
    const e2 = insertEmp.run("Zone B - Silence",    s2.lastInsertRowid, 8);
    const e3 = insertEmp.run("Zone C - Créatif",    s2.lastInsertRowid, 6);

    insertTable.run("Table 01", e1.lastInsertRowid, "Libre");
    insertTable.run("Table 02", e1.lastInsertRowid, "Occupée");
    insertTable.run("Table 03", e2.lastInsertRowid, "Libre");
    insertTable.run("Table 04", e3.lastInsertRowid, "Réservée");
  });
  seedCoworking();
}

module.exports = db;