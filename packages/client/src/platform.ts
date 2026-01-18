import { createClient } from '@rad-cms/api'

const apiUrl = (import.meta.env && import.meta.env.VITE_API_URL) || undefined

export const API = {
  cms: createClient({ apiUrl })
}
