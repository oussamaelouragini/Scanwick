// Base URL of the Scanwick API.
// In production, set VITE_API_URL (e.g. https://scanwick-api.onrender.com).
const base = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const API = base.replace(/\/+$/, "");
