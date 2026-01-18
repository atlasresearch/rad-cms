import { createStore, produce } from 'solid-js/store'
import { createEffect } from 'solid-js'
import { createWorkspaceStore, initialWorkspaceState, WorkspaceState, SetState } from '@rad-cms/api'
import { API } from '../platform'
import { toastStore } from './toast'

const savedWorkspaces = localStorage.getItem('rad-cms-workspaces')
const savedTheme = (localStorage.getItem('rad-cms-theme') as 'light' | 'dark' | 'system') || 'system'

// Mixin saved state
const startState: WorkspaceState = {
  ...initialWorkspaceState,
  recentWorkspaces: savedWorkspaces ? JSON.parse(savedWorkspaces) : [],
  theme: savedTheme
}

const [state, setState] = createStore<WorkspaceState>(startState)

// Adapter for setState so it matches api expectation
const setStateAdapter: SetState<WorkspaceState> = (patchOrFn) => {
  if (typeof patchOrFn === 'function') {
    setState(
      produce((s: WorkspaceState) => {
        // We pass the draft 's' to the function.
        // The function returns a partial object to merge.
        // Note: s is a Proxy.
        const patch = patchOrFn(s as WorkspaceState)
        Object.assign(s, patch)
      })
    )
  } else {
    setState(patchOrFn)
  }
}

const storeActions = createWorkspaceStore(() => state, setStateAdapter, {
  client: API.cms,
  notify: (msg, type) => toastStore.add(msg, type as any)
})

// Theme Effect
const applyTheme = (theme: 'light' | 'dark' | 'system') => {
  if (typeof document === 'undefined') return

  let effectiveTheme = theme
  if (theme === 'system') {
    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  if (effectiveTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// Apply theme on change
createEffect(() => {
  applyTheme(state.theme)
})

// Listener for system changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.theme === 'system') {
      applyTheme('system')
    }
  })
}

// Helper to keep 'files' type happy if necessary, though api exports generic TreeNode
export type { TreeNode } from '@rad-cms/api'

export const workspaceStore = {
  state,
  // Exposing the Solid setState directly for legacy/component compat
  setState,
  ...storeActions

  // Override getAllFiles to be safe if generic impl has issues with proxies,
  // but simpler to use generic and see.
}
