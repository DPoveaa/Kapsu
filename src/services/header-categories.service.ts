import { env } from '../config/env'

const API_URL = env.apiUrl

export interface HeaderCategory {
  id: string;
  name: string;
  icon: string | null;
  show_icon: boolean;
  url: string;
  text_color: string;
  icon_color: string;
  order_index: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('sanare_token') || localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

export const headerCategoriesService = {
  getAll: async (activeOnly: boolean = false) => {
    const response = await fetch(`${API_URL}/header-categories?activeOnly=${activeOnly}`)
    if (!response.ok) throw new Error('Failed to fetch header categories')
    return await response.json() as HeaderCategory[]
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_URL}/header-categories/${id}`)
    if (!response.ok) throw new Error('Failed to fetch header category')
    return await response.json() as HeaderCategory
  },

  create: async (data: Omit<HeaderCategory, 'id' | 'created_at' | 'updated_at'>) => {
    const response = await fetch(`${API_URL}/header-categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to create header category')
    return await response.json() as HeaderCategory
  },

  update: async (id: string, data: Partial<HeaderCategory>) => {
    const response = await fetch(`${API_URL}/header-categories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to update header category')
    return await response.json() as HeaderCategory
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_URL}/header-categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    if (!response.ok) throw new Error('Failed to delete header category')
  },

  reorder: async (items: { id: string; order_index: number }[]) => {
    const response = await fetch(`${API_URL}/header-categories/reorder`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ items })
    })
    if (!response.ok) throw new Error('Failed to reorder header categories')
  }
};
