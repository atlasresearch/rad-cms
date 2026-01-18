import { createStore } from 'solid-js/store'

export interface Toast {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
  duration?: number
}

const [state, setState] = createStore<{ toasts: Toast[] }>({ toasts: [] })

export const toastStore = {
  state,
  add: (message: string, type: 'error' | 'success' | 'info' = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9)
    const toast: Toast = { id, message, type, duration }

    setState('toasts', (prev) => [...prev, toast])

    if (duration > 0) {
      setTimeout(() => {
        toastStore.remove(id)
      }, duration)
    }
  },
  remove: (id: string) => {
    setState('toasts', (prev) => prev.filter((t) => t.id !== id))
  }
}
