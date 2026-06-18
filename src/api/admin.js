import api from "./axios";

export const getStats = () => api.get("/admin/stats");
export const getUsers = () => api.get("/admin/users");
export const changerStatut = (id, statut) => api.put(`/admin/users/${id}/statut`, { statut });
export const changerRole = (id, role) => api.put(`/admin/users/${id}/role`, { role });
export const supprimerUser = (id) => api.delete(`/admin/users/${id}`);