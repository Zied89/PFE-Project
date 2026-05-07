const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const db = require("../db");
const authMiddleware = require("../middleware/Authmiddleware");

// ─── Validation JWT_SECRET au démarrage ───────────────────────────────────
if (!process.env.JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET n'est pas défini dans les variables d'environnement.");
}

// ─── Rate Limiter (anti brute-force) ──────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Trop de tentatives. Veuillez réessayer dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUMMY_HASH = "$2a$12$dummyhashfortimingpreventionXXXXXXXXXXXXXXXXXXXXXXXXX";

// ─── Seed Super Admin au démarrage ────────────────────────────────────────
(async () => {
  try {
    const existing = db.prepare("SELECT id FROM users WHERE role = 'superadmin'").get();
    if (!existing) {
      const hashed = await bcrypt.hash("Admin@1234", 12);
      db.prepare(
        "INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)"
      ).run("Super Admin", "superadmin@tzprime.com", hashed, "superadmin");
      console.log("✅ Super Admin créé : superadmin@tzprime.com / Admin@1234");
    }
  } catch (err) {
    console.error("[seed superadmin]", err);
  }
})();

// ─── POST /api/auth/register ───────────────────────────────────────────────
router.post("/register", authLimiter, async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: "Tous les champs sont obligatoires." });

  if (password.length < 6)
    return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères." });

  if (!emailRegex.test(email))
    return res.status(400).json({ message: "Format d'email invalide." });

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedName = name.trim();

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing) return res.status(409).json({ message: "Cet email est déjà utilisé." });

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const stmt = db.prepare(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)"
    );
    const result = stmt.run(normalizedName, normalizedEmail, hashedPassword, "user");

    const token = jwt.sign(
      { id: result.lastInsertRowid, email: normalizedEmail, name: normalizedName, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.status(201).json({
      message: "Compte créé avec succès.",
      token,
      user: { id: result.lastInsertRowid, name: normalizedName, email: normalizedEmail, role: "user" },
    });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE")
      return res.status(409).json({ message: "Cet email est déjà utilisé." });
    console.error("[register]", err);
    return res.status(500).json({ message: "Erreur serveur. Veuillez réessayer." });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────
router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Veuillez remplir tous les champs." });

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail);

    const hashToCompare = user ? user.password : DUMMY_HASH;
    const isMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !isMatch)
      return res.status(401).json({ message: "Email ou mot de passe incorrect." });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.json({
      message: "Connexion réussie.",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("[login]", err);
    return res.status(500).json({ message: "Erreur serveur. Veuillez réessayer." });
  }
});

// ─── GET /api/auth/me (route protégée) ────────────────────────────────────
router.get("/me", authMiddleware, (req, res) => {
  try {
    const user = db
      .prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?")
      .get(req.user.id);

    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });

    return res.json({ user });
  } catch (err) {
    console.error("[me]", err);
    return res.status(500).json({ message: "Erreur serveur. Veuillez réessayer." });
  }
});

module.exports = router;