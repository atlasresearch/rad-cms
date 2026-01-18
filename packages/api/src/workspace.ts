import { FileEntry } from './types'
import yaml from 'js-yaml'

export interface TreeNode extends FileEntry {
  children?: TreeNode[]
  isOpen?: boolean
}

export interface WorkspaceState {
  root: string
  currentPath: string
  files: TreeNode[]
  currentFile: FileEntry | null
  fileContent: string
  frontmatter: Record<string, any>
  isDirty: boolean
  isPublished: boolean
  identity: string | null
  recentWorkspaces: string[]
  isSearchOpen: boolean
  isSettingsOpen: boolean
  activeView: 'editor' | 'home'
  expandedPaths: string[]
  isPublishing: boolean
  recentFiles: FileEntry[]
  theme: 'light' | 'dark' | 'system'
  searchResults: FileEntry[]
}

import { ClientAPI } from './types'

export const initialWorkspaceState: WorkspaceState = {
  root: '',
  currentPath: '',
  files: [],
  currentFile: null,
  fileContent: '',
  frontmatter: {},
  isDirty: false,
  isPublished: true,
  identity: null,
  recentWorkspaces: [],
  isSearchOpen: false,
  isSettingsOpen: false,
  activeView: 'home',
  expandedPaths: [],
  isPublishing: false,
  recentFiles: [],
  theme: 'system',
  searchResults: []
}

export type SetState<T> = (patch: Partial<T> | ((prev: T) => Partial<T>)) => void
export type NotifyFn = (message: string, type: 'error' | 'success' | 'info') => void

export const createWorkspaceStore = (
  getState: () => WorkspaceState,
  setState: SetState<WorkspaceState>,
  deps: {
    client: ClientAPI
    notify: NotifyFn
  }
) => {
  const actions = {
    init: async () => {
      try {
        const state = getState()
        // Try to load config if app capability exists
        if (deps.client.app?.getConfig) {
          const config = await deps.client.app.getConfig()
          setState({ root: config.root })

          // URL handling - strictly browser/window specific logic
          // If running in environment without window, this is skipped
          let urlWorkspace: string | null = null
          let urlPage: string | null = null

          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            urlWorkspace = params.get('workspace')
            urlPage = params.get('page')
          }

          if (urlWorkspace) {
            await actions.setWorkspacePath(urlWorkspace)
          } else if (state.recentWorkspaces.length === 0 && config.root) {
            const defaultSpace = `${config.root}/my-workspace`
            try {
              await deps.client.fs.mkdir(defaultSpace)
            } catch {
              // ignore
            }
            setState((_prev) => ({ recentWorkspaces: [defaultSpace] }))
            await actions.setWorkspacePath(defaultSpace)
          } else if (state.recentWorkspaces.length > 0) {
            await actions.setWorkspacePath(state.recentWorkspaces[0])
          }

          // Handle Page Link
          // We re-read state because setWorkspacePath might have updated it (if async wasn't awaited properly, but here we await)
          const currentPath = getState().currentPath
          if (urlPage && currentPath) {
            const fullPath = `${currentPath}/${urlPage}`
            const fileEntry: FileEntry = {
              name: urlPage.split('/').pop() || urlPage,
              path: fullPath,
              isDirectory: false,
              isFile: true
            }
            await actions.openFile(fileEntry)
          }
        } else {
          if (state.recentWorkspaces.length > 0) {
            await actions.setWorkspacePath(state.recentWorkspaces[0])
          }
        }
      } catch (e) {
        console.error('Failed to init workspace', e)
        deps.notify('Failed to initialize workspace', 'error')
      }
    },

    setTheme: (theme: 'light' | 'dark' | 'system') => {
      setState({ theme })
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('rad-cms-theme', theme)
      }
      // applyTheme side effect should be handled by consumer subscribing to state.theme
    },

    goHome: () => {
      setState({ activeView: 'home', currentFile: null })
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.delete('page')
        window.history.pushState({}, '', url)
      }
    },

    toggleSearch: (isOpen?: boolean) => {
      const current = getState().isSearchOpen
      const open = isOpen ?? !current
      setState({ isSearchOpen: open })
      if (!open) setState({ searchResults: [] })
    },

    performSearch: async (query: string) => {
      const state = getState()
      if (!state.currentPath || !query) {
        setState({ searchResults: [] })
        return
      }

      try {
        if (deps.client.fs.search) {
          const results = await deps.client.fs.search(state.currentPath, query)
          setState({ searchResults: results })
        } else {
          const allFiles = actions.getAllFiles()
          const results = allFiles.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
          setState({ searchResults: results })
        }
      } catch (e) {
        console.error('Search failed', e)
      }
    },

    toggleSettings: (isOpen?: boolean) => {
      const current = getState().isSettingsOpen
      setState({ isSettingsOpen: isOpen ?? !current })
    },

    toggleFolder: (path: string, expanded?: boolean) => {
      const state = getState()
      const isExpanded = state.expandedPaths.includes(path)
      const shouldExpand = expanded ?? !isExpanded

      if (shouldExpand) {
        if (!isExpanded) setState({ expandedPaths: [...state.expandedPaths, path] })
      } else {
        setState({ expandedPaths: state.expandedPaths.filter((p) => p !== path) })
      }
    },

    createWorkspace: async (name: string) => {
      const state = getState()
      if (!state.root) return
      const path = `${state.root}/${name}`
      try {
        await deps.client.fs.mkdir(path)
        await deps.client.git.init(path)
        await actions.setWorkspacePath(path)
      } catch (e) {
        console.error('Failed to create workspace', e)
        deps.notify('Failed to create workspace', 'error')
      }
    },

    setWorkspacePath: async (path: string) => {
      setState({ currentPath: path })

      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.set('workspace', path)
        url.searchParams.delete('page')
        window.history.replaceState({}, '', url)
      }

      const state = getState()
      if (!state.recentWorkspaces.includes(path)) {
        const updated = [...state.recentWorkspaces, path]
        setState({ recentWorkspaces: updated })
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('rad-cms-workspaces', JSON.stringify(updated))
        }
      }

      await actions.loadFiles()
      actions.startSync()
    },

    startSync: () => {
      // This creates a side effect (timer).
      // In a pure store actions creator, this is trixy.
      // But let's assume it's fine for now, or the consumer calls it.
      // Or we use a singleton behavior if this function is called once.
      // Ideally, consumer calls this on mount.
      // Repeated calls -> multiple intervals. Clean up?
      // We'll leave it simple for now as per original code.
      setInterval(async () => {
        const state = getState()
        if (!state.currentPath) return
        try {
          await deps.client.git.fetch(state.currentPath)
          console.log('Fetched from radicle network')
        } catch (e) {
          console.error('Fetch failed', e)
        }
      }, 60000)
    },

    loadFiles: async () => {
      const state = getState()
      const targetPath = state.currentPath
      if (!targetPath) return

      try {
        const loadTree = async (path: string, depth: number = 0): Promise<TreeNode[]> => {
          if (depth > 20) return []
          const files = await deps.client.fs.readdir(path)
          const nodes: TreeNode[] = []
          for (const file of files) {
            if (['node_modules', '.git', 'dist', 'build', 'coverage', '.DS_Store'].includes(file.name)) continue

            const node: TreeNode = { ...file }
            if (file.isDirectory) {
              node.children = await loadTree(file.path, depth + 1)
            }
            nodes.push(node)
          }
          return nodes.sort((a, b) => {
            if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name)
            return a.isDirectory ? -1 : 1
          })
        }

        const files = await loadTree(targetPath)
        // Re-read state to check for race condition
        if (getState().currentPath !== targetPath) return

        setState({ files })
      } catch (e) {
        console.error('Failed to load files', e)
      }
    },

    renameFile: async (newName: string) => {
      const state = getState()
      if (!state.currentFile) return
      const oldPath = state.currentFile.path
      const parentDir = oldPath.substring(0, oldPath.lastIndexOf('/'))
      const newPath = `${parentDir}/${newName}`

      if (oldPath === newPath) return

      try {
        await deps.client.fs.rename(oldPath, newPath)
        // Deep update manual replacement
        setState((prev) => {
          if (!prev.currentFile) return {}
          return {
            currentFile: { ...prev.currentFile, name: newName, path: newPath }
          }
        })
        await actions.loadFiles()
      } catch (e) {
        console.error('Failed to rename file', e)
        deps.notify('Failed to rename file', 'error')
      }
    },

    moveFile: async (sourcePath: string, destDirPath: string): Promise<boolean> => {
      const fileName = sourcePath.split('/').pop()
      const newPath = `${destDirPath}/${fileName}`
      if (sourcePath === newPath) return false

      try {
        await deps.client.fs.rename(sourcePath, newPath)

        const state = getState()
        if (state.currentFile?.path === sourcePath) {
          setState((prev) => {
            if (!prev.currentFile) return {}
            return {
              currentFile: { ...prev.currentFile, path: newPath }
            }
          })
        }

        actions.toggleFolder(destDirPath, true)
        await actions.loadFiles()
        return true
      } catch (e) {
        console.error('Failed to move file', e)
        deps.notify('Failed to move file', 'error')
        return false
      }
    },

    deleteFile: async (path: string) => {
      try {
        await deps.client.fs.delete(path)
        const state = getState()
        if (state.currentFile?.path === path) {
          setState({ currentFile: null, fileContent: '' })
        }
        await actions.loadFiles()
      } catch (e) {
        console.error('Failed to delete', e)
        deps.notify('Failed to delete file', 'error')
      }
    },

    duplicateFile: async (path: string) => {
      try {
        const extension = path.split('.').pop()
        const nameWithoutExt = path.split('/').pop()?.replace(`.${extension}`, '')
        const parentDir = path.substring(0, path.lastIndexOf('/'))
        const newPath = `${parentDir}/${nameWithoutExt} copy.${extension}`

        await deps.client.fs.copy(path, newPath)
        await actions.loadFiles() // Fixed: was workspaceStore.loadFiles
      } catch (e) {
        console.error('Failed to duplicate', e)
        deps.notify('Failed to duplicate file', 'error')
      }
    },

    renameFileFromContextMenu: async (oldPath: string, newName: string) => {
      const parentDir = oldPath.substring(0, oldPath.lastIndexOf('/'))
      const newPath = `${parentDir}/${newName}`
      try {
        await deps.client.fs.rename(oldPath, newPath)
        const state = getState()
        if (state.currentFile?.path === oldPath) {
          setState((prev) => {
            if (!prev.currentFile) return {}
            return {
              currentFile: { ...prev.currentFile, name: newName, path: newPath }
            }
          })
        }
        await actions.loadFiles()
      } catch (e) {
        console.error(e)
        deps.notify('Failed to rename file', 'error')
      }
    },

    openFile: async (file: FileEntry) => {
      if (file.isDirectory) return

      const state = getState()
      if (typeof window !== 'undefined' && state.currentPath) {
        let relativePath = file.path
        if (file.path.startsWith(state.currentPath)) {
          relativePath = file.path.substring(state.currentPath.length + 1)
        }
        const url = new URL(window.location.href)
        url.searchParams.set('page', relativePath)
        window.history.pushState({}, '', url)
      }

      try {
        const content = await deps.client.fs.read(file.path)
        const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
        let frontmatter = {}
        let body = content

        if (match) {
          try {
            frontmatter = yaml.load(match[1]) as Record<string, any>
            body = match[2]
          } catch (e) {
            console.warn('Failed to parse frontmatter', e)
          }
        }

        setState({
          currentFile: file,
          fileContent: body,
          frontmatter,
          isDirty: false,
          activeView: 'editor'
        })

        setState((prev) => {
          const others = prev.recentFiles.filter((f) => f.path !== file.path)
          return { recentFiles: [file, ...others].slice(0, 10) }
        })
      } catch (e) {
        console.error('Failed to read file', e)
        deps.notify('Failed to read file', 'error')
      }
    },

    updateContent: (content: string) => {
      setState({ fileContent: content, isDirty: true })
      actions.saveToDisk()
    },

    updateProperty: (key: string, value: any) => {
      setState((prev) => ({
        frontmatter: { ...prev.frontmatter, [key]: value },
        isDirty: true
      }))
      actions.saveToDisk()
    },

    saveToDisk: async () => {
      const state = getState()
      if (!state.currentFile) return
      try {
        const fmString = Object.keys(state.frontmatter).length > 0 ? `---\n${yaml.dump(state.frontmatter)}---\n` : ''
        const fullContent = fmString + state.fileContent

        await deps.client.fs.write(state.currentFile.path, fullContent)
        setState({ isDirty: false })
        actions.checkGitStatus()
      } catch (e) {
        console.error('Failed to save', e)
        deps.notify('Failed to save file', 'error')
      }
    },

    publish: async () => {
      const state = getState()
      if (!state.currentPath) return
      setState({ isPublishing: true })
      try {
        await deps.client.git.publish(state.currentPath)
        await actions.checkGitStatus()
      } catch (e) {
        console.error('Failed to publish', e)
        deps.notify('Failed to publish', 'error')
      } finally {
        setState({ isPublishing: false })
      }
    },

    checkGitStatus: async () => {
      const state = getState()
      if (!state.currentPath) return
      const isDirty = await deps.client.git.getStatus(state.currentPath)
      setState({ isPublished: !isDirty })
    },

    createFile: async (name: string, parentPath?: string) => {
      const state = getState()
      if (!state.currentPath) return

      const targetDir = parentPath || state.currentPath
      const filename = name.endsWith('.md') ? name : `${name}.md`
      const path = `${targetDir}/${filename}`

      try {
        await deps.client.fs.write(path, '')
        await actions.loadFiles()

        if (parentPath) {
          actions.toggleFolder(parentPath, true)
        }

        // Find new file helper
        const findFile = (nodes: TreeNode[]): FileEntry | undefined => {
          for (const node of nodes) {
            if (node.path === path) return node
            if (node.children) {
              const found = findFile(node.children)
              if (found) return found
            }
          }
          return undefined
        }

        // Re-read state after loadFiles
        let newFile = findFile(getState().files)
        if (!newFile) {
          await new Promise((r) => setTimeout(r, 1000))
          await actions.loadFiles()
          newFile = findFile(getState().files)
        }

        if (newFile) {
          await actions.openFile(newFile)
        } else {
          const dummy: FileEntry = {
            name: filename,
            path: path,
            isDirectory: false,
            isFile: true
          }
          await actions.openFile(dummy)
        }
      } catch (e) {
        console.error('Failed to create file', e)
        deps.notify('Failed to create file', 'error')
      }
    },

    createFolder: async (name: string, parentPath?: string) => {
      const state = getState()
      if (!state.currentPath) return
      const targetDir = parentPath || state.currentPath
      const path = `${targetDir}/${name}`

      try {
        await deps.client.fs.mkdir(path)
        await actions.loadFiles()
        if (parentPath) {
          actions.toggleFolder(parentPath, true)
        }
      } catch (e) {
        console.error('Failed to create folder', e)
        deps.notify('Failed to create folder', 'error')
      }
    },

    loadIdentity: async () => {
      try {
        const id = await deps.client.rad.getIdentity()
        setState({ identity: id })
      } catch (e) {
        console.error('Failed to load identity', e)
      }
    },

    logout: () => {
      setState({ identity: null })
    },

    getAllFiles: () => {
      const state = getState()
      const flatten = (nodes: TreeNode[]): TreeNode[] => {
        let res: TreeNode[] = []
        for (const node of nodes) {
          if (!node.isDirectory) {
            res.push(node)
          }
          if (node.children) {
            res = res.concat(flatten(node.children))
          }
        }
        return res
      }
      return flatten(state.files)
    }
  }

  return actions
}
