require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const coworkingRoutes = require("./routes/coworking");
const formationsRoutes = require("./routes/formations");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 5000;

// Chemin vers le build React (adaptez si votre dossier frontend a un autre nom, ex: "client/build")
const BUILD_PATH = path.join(__dirname, "build");

// ─── Middlewares ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173", // ← Vite dev server
  ],
  credentials: true,
}));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/coworking", coworkingRoutes);
app.use("/api/formations", formationsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/modules", require("./routes/modules"));
app.use("/api/commandes", require("./routes/commandes"));

// Route de santé
app.get("/api/health", (_, res) => res.json({ status: "ok" }));

// 404 JSON pour les routes API inconnues (doit rester AVANT le fallback SPA)
app.use("/api", (_, res) => res.status(404).json({ message: "Route introuvable." }));

// ─── Frontend (build React) ──────────────────────────────────────────────────
// Sert les fichiers statiques (JS, CSS, images) du build
app.use(express.static(BUILD_PATH));

// Fallback SPA : toute route non-API (ex: /formation, /coworking, /admin) renvoie
// index.html, et c'est React Router qui gère l'affichage côté client.
app.get(/^(?!\/api).*/, (_, res) => {
  res.sendFile(path.join(BUILD_PATH, "index.html"));
});

// ─── Démarrage ────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});