require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middlewares ───────────────────────────────────────────────────────────
app.use(cors({
  origin: "http://localhost:3000", // URL de ton frontend React
  credentials: true,
}));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);

// Route de santé
app.get("/api/health", (_, res) => res.json({ status: "ok" }));

// Gestion des routes inconnues
app.use((_, res) => res.status(404).json({ message: "Route introuvable." }));

// ─── Démarrage ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});