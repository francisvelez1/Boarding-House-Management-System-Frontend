// src/services/roomService.ts
import axios from "axios";

const API_URL = "http://localhost:8000/api/rooms"; // adjust if deployed

export async function getAllRooms(skip = 0, limit = 20) {
  const res = await axios.get(`${API_URL}`, { params: { skip, limit } });
  return res.data.data;
}

export async function searchRooms(query: string, skip = 0, limit = 20) {
  const res = await axios.get(`${API_URL}/search`, { params: { q: query, skip, limit } });
  return res.data.data;
}

export async function getRoomsByStatus(status: string, skip = 0, limit = 20) {
  const res = await axios.get(`${API_URL}/status/${status}`, { params: { skip, limit } });
  return res.data.data;
}

export async function getRoomsByType(type: string, skip = 0, limit = 20) {
  const res = await axios.get(`${API_URL}/type/${type}`, { params: { skip, limit } });
  return res.data.data;
}

export async function getRoomsByRateRange(minRate: number, maxRate: number, skip = 0, limit = 20) {
  const res = await axios.get(`${API_URL}/rate-range`, { params: { min_rate: minRate, max_rate: maxRate, skip, limit } });
  return res.data.data;
}

export async function getRoomsByLocation(location: string, skip = 0, limit = 20) {
  const res = await axios.get(`${API_URL}/location`, { params: { location, skip, limit } });
  return res.data.data;
}

