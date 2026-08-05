const API = "http://localhost:5000/api";
const AUTH_BRIDGE_KEY = "inscription_auth_bridge";

export const cartKey = (userId) => `cart_${userId || "guest"}`;

/** Copie token/user dans localStorage pour le nouvel onglet (sessionStorage est isolé par onglet). */
export const bridgeAuthForNewTab = () => {
  const token = sessionStorage.getItem("token");
  const user = sessionStorage.getItem("user");
  if (token && user) {
    localStorage.setItem(AUTH_BRIDGE_KEY, JSON.stringify({ token, user, timestamp: Date.now() }));
  }
};

/** Restaure l'auth depuis le pont localStorage → sessionStorage (appelé au boot App + page confirm). */
export const restoreAuthFromBridge = () => {
  try {
    const raw = localStorage.getItem(AUTH_BRIDGE_KEY);
    if (!raw) return false;
    const { token, user, timestamp } = JSON.parse(raw);
    if (!token || !user || Date.now() - timestamp > 10 * 60 * 1000) return false;
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("user", user);
    return true;
  } catch {
    return false;
  }
};

export const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${sessionStorage.getItem("token")}`,
});

/** Ouvre l'onglet de confirmation avec le panier courant. */
export const openInscriptionConfirmTab = () => {
  bridgeAuthForNewTab();
  window.open("/inscription/confirm", "_blank");
};

const parseJsonField = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
};

/** Charge les détails formations pour les items du panier. */
export const fetchFormationDetailsForCart = async (cartItems) => {
  const formationIds = new Set();
  for (const item of cartItems) {
    if (item._type === "formation") formationIds.add(item.id);
    if (item._type === "course" && item._formationId) formationIds.add(item._formationId);
  }

  const details = {};
  await Promise.all(
    [...formationIds].map(async (id) => {
      try {
        const res = await fetch(`${API}/formations/${id}`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          const f = data.formation;
          details[id] = {
            ...f,
            modules: parseJsonField(f.modules),
            sessions: parseJsonField(f.sessions),
          };
        }
      } catch { /* ignore */ }
    })
  );
  return details;
};

/** Exécute l'inscription + enregistrement commande (statut en_attente côté API). */
export const executeCheckout = async (cart) => {
  const formationItems = cart.filter((f) => f._type === "formation");
  const courseItems = cart.filter((f) => f._type === "course");

  const commandeItems = cart.map((item) => ({
    type: item._type === "course" ? "cours" : "formation",
    formationId: item._type === "formation" ? item.id : item._formationId,
    titre: item._label || item.titre || item.title,
    prix: item.prix,
    tag: item.tag,
    icon: item.icon,
  }));

  const ops = [];
  if (formationItems.length > 0) {
    ops.push({
      kind: "formations",
      label: `${formationItems.length} formation(s)`,
      promise: fetch(`${API}/formations/inscrire-multiple`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ formationIds: formationItems.map((f) => f.id) }),
      }),
    });
  }
  courseItems.forEach((course) => {
    ops.push({
      kind: "course",
      label: course.title,
      promise: fetch(`${API}/formations/${course._formationId}/cours/inscrire`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          titre: course.title,
          duree: course.duration,
          prix: course.prix,
        }),
      }),
    });
  });

  const settled = await Promise.allSettled(ops.map((o) => o.promise));

  let successCount = 0;
  const failedLabels = [];

  for (let i = 0; i < settled.length; i++) {
    const op = ops[i];
    const result = settled[i];
    if (result.status !== "fulfilled") {
      failedLabels.push(`${op.label} (connexion)`);
      continue;
    }
    const res = result.value;
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      successCount += op.kind === "formations" ? (data.added?.length || 0) : 1;
    } else if (res.status !== 409) {
      failedLabels.push(`${op.label} (${data.message || `Erreur ${res.status}`})`);
    }
  }

  if (successCount === 0 && failedLabels.length > 0) {
    throw new Error(`Échec de l'inscription : ${failedLabels.join(", ")}`);
  }

  const cmdRes = await fetch(`${API}/commandes`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ items: commandeItems }),
  });
  if (!cmdRes.ok) {
    const errText = await cmdRes.text().catch(() => "");
    throw new Error(`Erreur enregistrement commande : ${errText || cmdRes.status}`);
  }

  return { successCount, failedLabels, commande: await cmdRes.json() };
};
