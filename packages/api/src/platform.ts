import { ClientAPI } from './types'

const DEFAULT_API_URL = 'http://localhost:3001/api'

export const createClient = (config: { apiUrl?: string } = {}): ClientAPI => {
  // Prefer Electron bridge if available
  if (typeof window !== 'undefined' && (window as any).cms) {
    return (window as any).cms as ClientAPI
  }

  // Fallback to HTTP Bridge
  const API_URL = config.apiUrl || DEFAULT_API_URL
  console.log(`Initializing HTTP API bridge to ${API_URL}`)

  const api = {
    async post(endpoint: string, body: any) {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || res.statusText)
      }
      return res.json()
    },
    async get(endpoint: string, params: Record<string, string> = {}) {
      const url = new URL(`${API_URL}${endpoint}`)
      Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v))
      const res = await fetch(url.toString())
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || res.statusText)
      }
      return res.json()
    }
  }

  return {
    fs: {
      write: async (path: string, content: string) => {
        await api.post('/fs/write', { path, content })
      },
      writeImage: async (path: string, base64: string) => {
        await api.post('/fs/writeImage', { path, base64 })
      },
      read: async (path: string) => {
        const res = await api.get('/fs/read', { path })
        return res.content
      },
      readdir: async (path: string) => {
        return await api.get('/fs/readdir', { path })
      },
      mkdir: async (path: string) => {
        await api.post('/fs/mkdir', { path })
      },
      rename: async (oldPath: string, newPath: string) => {
        await api.post('/fs/rename', { oldPath, newPath })
      },
      delete: async (path: string) => {
        await api.post('/fs/delete', { path })
      },
      copy: async (sourcePath: string, destPath: string) => {
        await api.post('/fs/copy', { sourcePath, destPath })
      },
      search: async (path: string, query: string) => {
        return await api.get('/fs/search', { path, query })
      }
    },
    git: {
      init: async (cwd: string) => {
        await api.post('/git/init', { cwd })
      },
      publish: async (cwd: string) => {
        await api.post('/git/publish', { cwd })
      },
      fetch: async (cwd: string) => {
        await api.post('/git/fetch', { cwd })
      },
      getStatus: async (cwd: string) => {
        const res = await api.get('/git/status', { cwd })
        return res
      }
    },
    rad: {
      nodeStart: async () => {
        const res = await api.post('/rad/nodeStart', {})
        return res.result
      },
      getIdentity: async () => {
        const res = await api.get('/rad/identity')
        return res
      }
    },
    app: {
      getConfig: async () => {
        return await api.get('/config')
      }
    }
  }
}
