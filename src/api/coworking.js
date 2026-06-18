import api from "./axios";

export const getSalles = () => api.get("/coworking/salles");
export const getTables = () => api.get("/coworking/tables");
export const getEmplacements = () => api.get("/coworking/emplacements");
export const getMesReservations = () => api.get("/coworking/reservations/me");
export const creerReservation = (data) => api.post("/coworking/reservations", data);
export const annulerReservation = (id) => api.delete(`/coworking/reservations/${id}`);