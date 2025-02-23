import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export async function login(email: string, password: string) {
  const response = await axios.post(`${API_URL}/login`, { email, password });
  return response.data;
}

export async function signup(name: string, email: string, password: string) {
  const response = await axios.post(`${API_URL}/signup`, { name, email, password });
  return response.data;
}