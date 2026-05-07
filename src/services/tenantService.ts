import axios from "axios";

const API_URL = "http://localhost:8000/api";

export async function getTenant(id: string) {
  const res = await axios.get(`${API_URL}/tenants/${id}`);
  return res.data;
}

export async function getLease(id: string) {
  const res = await axios.get(`${API_URL}/leases/${id}`);
  return res.data;
}

export async function getPayments(id: string) {
  const res = await axios.get(`${API_URL}/payments/${id}`);
  return res.data;
}

export async function getMaintenanceRequests(id: string) {
  const res = await axios.get(`${API_URL}/maintenance/${id}`);
  return res.data;
}

export async function getMessages(id: string) {
  const res = await axios.get(`${API_URL}/messages/${id}`);
  return res.data;
}
