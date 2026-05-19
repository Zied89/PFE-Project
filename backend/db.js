// db.js — connexion PostgreSQL avec pg
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "tzprime",
  ssl: false,
});

// Test de connexion au démarrage
pool.connect()
  .then((client) => {
    console.log("✅ PostgreSQL connecté :", process.env.DB_NAME || "tzprime");
    client.release();
  })
  .catch((err) => {
    console.error("❌ Erreur PostgreSQL :", err.message);
    process.exit(1);
  });

module.exports = pool;