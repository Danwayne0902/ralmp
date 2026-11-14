import { create } from 'zustand'
import { cartService } from '../lib/services'

export const useCart = create((set, get) => ({
  items: [],
  total: 0,
  count: 0,
  deliveryFee: 2500,
  loading: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const res = await cartService.get()
      const data = res.data || {}
      set({
        items: data.items || [],
        total: Number(data.total || 0),
        count: Number(data.count || 0),
        deliveryFee: Number(data.delivery_fee ?? 2500),
      })
    } finally {
      set({ loading: false })
    }
  },

  add: async (produceId, quantity = 1) => {
    const res = await cartService.add(produceId, quantity)
    const data = res.data || {}
    set({
      items: data.items || get().items,
      total: Number(data.total || 0),
      count: Number(data.count || 0),
      deliveryFee: Number(data.delivery_fee ?? get().deliveryFee),
    })
    return res.data
  },

  update: async (produceId, quantity) => {
    const res = await cartService.update(produceId, quantity)
    const data = res.data || {}
    set({
      items: data.items || [],
      total: Number(data.total || 0),
      count: Number(data.count || 0),
      deliveryFee: Number(data.delivery_fee ?? get().deliveryFee),
    })
  },

  remove: async (produceId) => {
    const res = await cartService.remove(produceId)
    const data = res.data || {}
    set({
      items: data.items || [],
      total: Number(data.total || 0),
      count: Number(data.count || 0),
    })
  },

  clear: async () => {
    await cartService.clear()
    set({ items: [], total: 0, count: 0 })
  },

  clearLocal: () => set({ items: [], total: 0, count: 0 }),
}))
