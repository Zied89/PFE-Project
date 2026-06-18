import api from "./axios";

export const getFormations = () => api.get("/formations");
export const getFormation = (id) => api.get(`/formations/${id}`);
export const inscrire = (id) => api.post(`/formations/${id}/inscrire`);
export const desinscrire = (id) => api.delete(`/formations/${id}/desinscrire`);
export const getMesInscriptions = () => api.get("/formations/inscriptions/me");