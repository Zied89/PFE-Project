require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const coworkingRoutes = require("./routes/coworking");
const formationsRoutes = require("./routes/formations");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 5000;

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

// Route de santé
app.get("/api/health", (_, res) => res.json({ status: "ok" }));

// Gestion des routes inconnues
app.use((_, res) => res.status(404).json({ message: "Route introuvable." }));

// ─── Démarrage ────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});