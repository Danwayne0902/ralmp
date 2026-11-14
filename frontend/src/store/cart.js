import { create } from 'zustand'
import { cartService } from '../lib/services'

const apply = (data) => ({
  items: data.items || [],
  total: data.total || 0,
  deliveryFee: data.delivery_fee ?? 2500
})

export const useCart = create((set, get) => ({
  items: [],
  total: 0,
  deliveryFee: 2500,
  loading: false,

  count: () => get().items.reduce((s, i) => s + Number(i.quantity || 0), 0),

  fetch: async () => {
    set({ loading: true })
    try {
      const res = await cartService.get()
      set(apply(res.data))
    } finally {
      set({ loading: false })
    }
  },

  add: async (produceId, quantity) => {
    const res = await cartService.add(produceId, quantity)
    set(apply(res.data))
  },

  update: async (produceId, quantity) => {
    const res = await cartService.update(produceId, quantity)
    set(apply(res.data))
  },

  remove: async (produceId) => {
    await cartService.remove(produceId)
    const items = get().items.filter((i) => i.produce_id !== produceId)
    set({ items, total: items.reduce((s, i) => s + i.subtotal, 0) })
  },

  clear: async () => {
    await cartService.clear()
    set({ items: [], total: 0 })
  },

  clearLocal: () => set({ items: [], total: 0 })
}))
