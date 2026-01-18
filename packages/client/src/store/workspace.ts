import { createStore } from 'solid-js/store'
import { FileEntry } from '../types/window'
import { toastStore } from './toast'
import { API } from '../platform'
import yaml from 'js-yaml'

export interface TreeNode extends FileEntry {
  children?: TreeNode[]
  isOpen?: boolean
}

interface WorkspaceState {
  root: string
  currentPath: string // The root workspace path
  files: TreeNode[]
  currentFile: FileEntry | null
  fileContent: string
  frontmatter: Record<string, any>
  isDirty: boolean // Local modifications vs disk
  isPublished: boolean // Git status
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

const savedWorkspaces = localStorage.getItem('rad-cms-workspaces')
const savedTheme = (localStorage.getItem('rad-cms-theme') as 'light' | 'dark' | 'system') || 'system'

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

// Initial apply
applyTheme(savedTheme)

// Listener for system changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (workspaceStore.state.theme === 'system') {
      applyTheme('system')
    }
  })
}

const [state, setState] = createStore<WorkspaceState>({
  root: '',
  currentPath: '', // Needs to be initialized, maybe prompt user?
  files: [],
  currentFile: null,
  fileContent: '',
  frontmatter: {},
  isDirty: false,
  isPublished: true,
  identity: null,
  recentWorkspaces: savedWorkspaces ? JSON.parse(savedWorkspaces) : [],
  isSearchOpen: false,
  isSettingsOpen: false,
  activeView: 'home',
  expandedPaths: [],
  isPublishing: false,
  recentFiles: [],
  theme: savedTheme,
  searchResults: []
})

export const workspaceStore = {
  state,
  setState,

  init: async () => {
    try {
      if (API.cms?.app?.getConfig) {
        const config = await API.cms.app.getConfig()
        const root = config.root
        setState('root', root)

        const params = new URLSearchParams(window.location.search)
        const urlWorkspace = params.get('workspace')

        if (urlWorkspace) {
          // Use URL workspace
          await workspaceStore.setWorkspacePath(urlWorkspace)
        } else if (state.recentWorkspaces.length === 0 && root) {
          const defaultSpace = `${root}/my-workspace`

          // Ensure it exists
          try {
            await API.cms.fs.mkdir(defaultSpace)
          } catch (e) {
            console.log('Workspace dir creation skipped or failed', e)
          }

          setState('recentWorkspaces', [defaultSpace])
          await workspaceStore.setWorkspacePath(defaultSpace)
        } else if (state.recentWorkspaces.length > 0) {
          await workspaceStore.setWorkspacePath(state.recentWorkspaces[0])
        }

        // Handle Page Link
        const urlPage = params.get('page')
        if (urlPage && state.currentPath) {
          const fullPath = `${state.currentPath}/${urlPage}`
          // We construct a temporary entry to open it
          const fileEntry: FileEntry = {
            name: urlPage.split('/').pop() || urlPage,
            path: fullPath,
            isDirectory: false,
            isFile: true
          }
          await workspaceStore.openFile(fileEntry)
        }
      } else {
        // Fallback
        if (state.recentWorkspaces.length > 0) {
          await workspaceStore.setWorkspacePath(state.recentWorkspaces[0])
        }
      }
    } catch (e) {
      console.error('Failed to init workspace', e)
      toastStore.add('Failed to initialize workspace', 'error')
    }
  },

  setTheme: (theme: 'light' | 'dark' | 'system') => {
    setState('theme', theme)
    localStorage.setItem('rad-cms-theme', theme)
    applyTheme(theme)
  },

  // Navigation
  goHome: () => {
    setState({ activeView: 'home', currentFile: null })

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('page')
      window.history.pushState({}, '', url)
    }
  },

  toggleSearch: (isOpen?: boolean) => {
    const open = isOpen ?? !state.isSearchOpen
    setState('isSearchOpen', open)
    if (!open) setState('searchResults', [])
  },

  performSearch: async (query: string) => {
    if (!state.currentPath || !query) {
      setState('searchResults', [])
      return
    }

    try {
      // Use backend search if available (mocked in tests)
      if (API.cms?.fs?.search) {
        const results = await API.cms.fs.search(state.currentPath, query)
        // Deduplicate if backend returns dupes or overlap
        setState('searchResults', results)
      } else {
        // Fallback to client side name search
        const allFiles = workspaceStore.getAllFiles()
        const results = allFiles.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
        setState('searchResults', results)
      }
    } catch (e) {
      console.error('Search failed', e)
    }
  },

  toggleSettings: (isOpen?: boolean) => {
    setState('isSettingsOpen', isOpen ?? !state.isSettingsOpen)
  },

  toggleFolder: (path: string, expanded?: boolean) => {
    const isExpanded = state.expandedPaths.includes(path)
    const shouldExpand = expanded ?? !isExpanded
    if (shouldExpand) {
      if (!isExpanded) setState('expandedPaths', [...state.expandedPaths, path])
    } else {
      setState(
        'expandedPaths',
        state.expandedPaths.filter((p) => p !== path)
      )
    }
  },

  createWorkspace: async (name: string) => {
    if (!state.root) return
    const path = `${state.root}/${name}`
    try {
      await API.cms.fs.mkdir(path)
      // Initialize repository
      await API.cms.git.init(path)
      await workspaceStore.setWorkspacePath(path)
    } catch (e) {
      console.error('Failed to create workspace', e)
      toastStore.add('Failed to create workspace', 'error')
    }
  },

  setWorkspacePath: async (path: string) => {
    setState('currentPath', path)

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('workspace', path)
      // Only clear page if it's explicitly changing workspace context
      // But for setWorkspacePath it's usually initialization or switch
      // If it's initialization (from URL), we might want to keep the page param if we haven't processed it yet?
      // Actually init calls setWorkspacePath, THEN processes page.
      // So if we clear page here, we lose it before init sees it?
      // Init reads params BEFORE calling setWorkspacePath?
      // No, init reads, then calls setWorkspacePath.
      // If setWorkspacePath clears page, then the subsequent "if (urlPage)" logic inside init will work because variables are already captured in constants.
      // BUT the browser URL will be cleared.
      // So init needs to re-apply the page param?

      // Let's check `init`:
      // const params = ...; const urlPage = params.get('page');
      // await workspaceStore.setWorkspacePath(...) -> Clears page in URL
      // ...
      // await workspaceStore.openFile(...) -> Sets page in URL

      // So it works out.
      url.searchParams.delete('page')
      window.history.replaceState({}, '', url)
    }

    // Add to recent workspaces if not exists
    if (!state.recentWorkspaces.includes(path)) {
      const updated = [...state.recentWorkspaces, path]
      setState('recentWorkspaces', updated)
      localStorage.setItem('rad-cms-workspaces', JSON.stringify(updated))
    }

    await workspaceStore.loadFiles()
    // Start background fetch
    workspaceStore.startSync()
  },

  startSync: () => {
    // 60 seconds
    setInterval(async () => {
      if (!state.currentPath) return
      try {
        await API.cms.git.fetch(state.currentPath)
        // After fetch, check status? Or wait for user action.
        // We can check status to see if "behind" and show UI.
        // For MVP, just fetch.
        console.log('Fetched from radicle network')
      } catch (e) {
        console.error('Fetch failed', e)
      }
    }, 60000)
  },

  loadFiles: async () => {
    const targetPath = state.currentPath
    if (!targetPath) return
    try {
      const loadTree = async (path: string, depth: number = 0): Promise<TreeNode[]> => {
        if (depth > 20) return [] // Prevent infinite recursion/too deep trees

        const files = await API.cms.fs.readdir(path)
        const nodes: TreeNode[] = []
        for (const file of files) {
          if (['node_modules', '.git', 'dist', 'build', 'coverage', '.DS_Store'].includes(file.name)) continue
          // if (file.name.startsWith('.')) continue; // Allow dotfiles for now

          const node: TreeNode = { ...file }
          if (file.isDirectory) {
            node.children = await loadTree(file.path, depth + 1)
          }
          nodes.push(node)
        }
        // Sort folders first
        return nodes.sort((a, b) => {
          if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name)
          return a.isDirectory ? -1 : 1
        })
      }

      const files = await loadTree(targetPath)

      // Prevent race condition: if path changed while loading, discard result
      if (state.currentPath !== targetPath) return

      setState('files', files)
    } catch (e) {
      console.error('Failed to load files', e)
    }
  },

  renameFile: async (newName: string) => {
    if (!state.currentFile) return
    const oldPath = state.currentFile.path
    const parentDir = oldPath.substring(0, oldPath.lastIndexOf('/'))
    const newPath = `${parentDir}/${newName}`

    if (oldPath === newPath) return

    try {
      await API.cms.fs.rename(oldPath, newPath)
      setState('currentFile', 'name', newName)
      setState('currentFile', 'path', newPath)
      await workspaceStore.loadFiles()
    } catch (e) {
      console.error('Failed to rename file', e)
      toastStore.add('Failed to rename file', 'error')
    }
  },

  moveFile: async (sourcePath: string, destDirPath: string): Promise<boolean> => {
    // Calculate new path
    const fileName = sourcePath.split('/').pop()
    const newPath = `${destDirPath}/${fileName}`
    if (sourcePath === newPath) return false

    try {
      await API.cms.fs.rename(sourcePath, newPath)

      if (state.currentFile?.path === sourcePath) {
        setState('currentFile', 'path', newPath)
      }

      // Ensure destination folder is expanded so user sees the moved file
      workspaceStore.toggleFolder(destDirPath, true)

      await workspaceStore.loadFiles() // Reload tree
      return true
    } catch (e) {
      console.error('Failed to move file', e)
      toastStore.add('Failed to move file', 'error')
      return false
    }
  },

  deleteFile: async (path: string) => {
    try {
      await API.cms.fs.delete(path)
      if (state.currentFile?.path === path) {
        setState('currentFile', null)
        setState('fileContent', '')
      }
      await workspaceStore.loadFiles()
    } catch (e) {
      console.error('Failed to delete', e)
      toastStore.add('Failed to delete file', 'error')
    }
  },

  duplicateFile: async (path: string) => {
    try {
      const extension = path.split('.').pop()
      const nameWithoutExt = path.split('/').pop()?.replace(`.${extension}`, '')
      const parentDir = path.substring(0, path.lastIndexOf('/'))
      const newPath = `${parentDir}/${nameWithoutExt} copy.${extension}`

      await API.cms.fs.copy(path, newPath)
      await workspaceStore.loadFiles()
    } catch (e) {
      console.error('Failed to duplicate', e)
      toastStore.add('Failed to duplicate file', 'error')
    }
  },

  renameFileFromContextMenu: async (oldPath: string, newName: string) => {
    const parentDir = oldPath.substring(0, oldPath.lastIndexOf('/'))
    const newPath = `${parentDir}/${newName}`
    try {
      await API.cms.fs.rename(oldPath, newPath)
      if (state.currentFile?.path === oldPath) {
        setState('currentFile', 'name', newName)
        setState('currentFile', 'path', newPath)
      }
      await workspaceStore.loadFiles()
    } catch (e) {
      console.error(e)
      toastStore.add('Failed to rename file', 'error')
    }
  },

  openFile: async (file: FileEntry) => {
    if (file.isDirectory) {
      console.log('Directory clicked', file)
      return
    }

    // Update URL
    if (typeof window !== 'undefined' && state.currentPath) {
      // Handle cases where file.path might be absolute or relative
      // Files from fs usually have absolute path
      let relativePath = file.path
      if (file.path.startsWith(state.currentPath)) {
        relativePath = file.path.substring(state.currentPath.length + 1)
      }

      const url = new URL(window.location.href)
      url.searchParams.set('page', relativePath)
      window.history.pushState({}, '', url)
    }

    try {
      const content = await API.cms.fs.read(file.path)

      // Parse Frontmatter
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

      setState('recentFiles', (prev) => {
        const others = prev.filter((f) => f.path !== file.path)
        return [file, ...others].slice(0, 10)
      })

      // Check publish status
      // const isDirtyGit = await API.cms.git.getStatus(state.currentPath); // This checks whole repo usually
      // For file specific status we might need specific git check.
    } catch (e) {
      console.error('Failed to read file', e)
      toastStore.add('Failed to read file', 'error')
    }
  },

  updateContent: (content: string) => {
    setState({
      fileContent: content,
      isDirty: true
    })
    // Trigger auto-save to disk
    workspaceStore.saveToDisk()
  },

  updateProperty: (key: string, value: any) => {
    setState('frontmatter', key, value)
    setState('isDirty', true)
    workspaceStore.saveToDisk()
  },

  saveToDisk: async () => {
    if (!state.currentFile) return
    try {
      // Reconstruct file with frontmatter
      const fmString = Object.keys(state.frontmatter).length > 0 ? `---\n${yaml.dump(state.frontmatter)}---\n` : ''
      const fullContent = fmString + state.fileContent

      await API.cms.fs.write(state.currentFile.path, fullContent)
      setState('isDirty', false)
      // After save to disk, it is likely "modified" in git.
      workspaceStore.checkGitStatus()
    } catch (e) {
      console.error('Failed to save', e)
      toastStore.add('Failed to save file', 'error')
    }
  },

  publish: async () => {
    if (!state.currentPath) return
    setState('isPublishing', true)
    try {
      await API.cms.git.publish(state.currentPath)
      await workspaceStore.checkGitStatus()
    } catch (e) {
      console.error('Failed to publish', e)
      toastStore.add('Failed to publish', 'error')
    } finally {
      setState('isPublishing', false)
    }
  },

  checkGitStatus: async () => {
    if (!state.currentPath) return
    const isDirty = await API.cms.git.getStatus(state.currentPath)
    setState('isPublished', !isDirty)
  },

  createFile: async (name: string, parentPath?: string) => {
    if (!state.currentPath) return

    const targetDir = parentPath || state.currentPath
    const filename = name.endsWith('.md') ? name : `${name}.md`
    const path = `${targetDir}/${filename}`

    try {
      await API.cms.fs.write(path, '')

      await workspaceStore.loadFiles()

      if (parentPath) {
        workspaceStore.toggleFolder(parentPath, true)
      }

      // Find the new file entry
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

      let newFile = findFile(state.files)

      if (!newFile) {
        await new Promise((r) => setTimeout(r, 1000))
        await workspaceStore.loadFiles()
        newFile = findFile(state.files)
      }

      if (newFile) {
        await workspaceStore.openFile(newFile)
      } else {
        // Fallback manual open if tree invalid
        const dummy: FileEntry = {
          name: filename,
          path: path,
          isDirectory: false,
          isFile: true
        }
        await workspaceStore.openFile(dummy)
      }
    } catch (e) {
      console.error('Failed to create file', e)
      toastStore.add('Failed to create file', 'error')
    }
  },

  createFolder: async (name: string, parentPath?: string) => {
    if (!state.currentPath) return
    const targetDir = parentPath || state.currentPath
    const path = `${targetDir}/${name}`

    try {
      await API.cms.fs.mkdir(path)
      await workspaceStore.loadFiles()
      if (parentPath) {
        workspaceStore.toggleFolder(parentPath, true)
      }
    } catch (e) {
      console.error('Failed to create folder', e)
      toastStore.add('Failed to create folder', 'error')
    }
  },

  loadIdentity: async () => {
    try {
      const id = await API.cms.rad.getIdentity()
      setState('identity', id)
    } catch (e) {
      console.error('Failed to load identity', e)
    }
  },

  logout: () => {
    setState('identity', null)
  },

  getAllFiles: () => {
    const flatten = (nodes: TreeNode[]): TreeNode[] => {
      let res: TreeNode[] = []
      for (const node of nodes) {
        if (!node.isDirectory) {
          // Only return files for search? Or folders too? Usually files.
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
