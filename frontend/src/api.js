import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:8000" });

export function fetchConfig() {
  return API.get("/config").then(res => res.data);
}

export function saveConfig(config) {
  return API.post("/config", { config }).then(res => res.data);
}

export function downloadConfig() {
  window.location.href = API.get("/download", { responseType: 'blob' });
}
