/**
 * Middleware — vérifie que l'utilisateur est admin ou superadmin
 */
function adminMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Non authentifié." });
  }
  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Accès réservé aux administrateurs." });
  }
  next();
}

module.exports = adminMiddleware;
