import axios from 'axios';

const API_URL = 'http://localhost:5000/api'; // or your actual backend URL

export async function login(email: string, password: string) {
  const response = await axios.post(`${API_URL}/login`, { email, password });
  // The response from your backend should return something like:
  // { user: { id, name, role }, token: '...' }
  return response.data;
}

export async function signup(name: string, email: string, password: string) {
  const response = await axios.post(`${API_URL}/signup`, { name, email, password });
  // The response from your backend should return something like:
  // { user: { id, name, role }, token: '...' }
  return response.data;
}
