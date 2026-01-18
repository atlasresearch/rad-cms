import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createWorkspaceStore, initialWorkspaceState, WorkspaceState } from './workspace'
import { ClientAPI } from './types'

describe('Workspace Store', () => {
  let state: WorkspaceState
  let setState: any
  let mockClient: ClientAPI
  let mockNotify: any

  beforeEach(() => {
    state = { ...initialWorkspaceState }
    setState = vi.fn((patchOrFn) => {
      if (typeof patchOrFn === 'function') {
        const patch = patchOrFn(state)
        state = { ...state, ...patch }
      } else {
        state = { ...state, ...patchOrFn }
      }
    })

    mockClient = {
      fs: {
        mkdir: vi.fn(),
        write: vi.fn(),
        readdir: vi.fn().mockResolvedValue([]),
        read: vi.fn(),
        delete: vi.fn(),
        rename: vi.fn(),
        copy: vi.fn(),
        search: vi.fn(),
        writeImage: vi.fn()
      },
      git: {
        init: vi.fn(),
        publish: vi.fn(),
        fetch: vi.fn(),
        getStatus: vi.fn().mockResolvedValue(false)
      },
      rad: {
        getIdentity: vi.fn().mockResolvedValue('test-user'),
        nodeStart: vi.fn()
      },
      app: {
        getConfig: vi.fn().mockResolvedValue({ root: '/test-root' })
      }
    }

    mockNotify = vi.fn()
  })

  it('should initialize with default state', () => {
    expect(state.activeView).toBe('home')
    expect(state.files).toEqual([])
  })

  it('should toggle settings', () => {
    const store = createWorkspaceStore(() => state, setState, { client: mockClient, notify: mockNotify })

    store.toggleSettings(true)
    expect(setState).toHaveBeenCalled()
    expect(state.isSettingsOpen).toBe(true)

    store.toggleSettings(false)
    expect(state.isSettingsOpen).toBe(false)
  })

  it('should set theme', () => {
    const store = createWorkspaceStore(() => state, setState, { client: mockClient, notify: mockNotify })

    store.setTheme('dark')
    expect(state.theme).toBe('dark')
  })

  it('should create workspace', async () => {
    state.root = '/root'
    const store = createWorkspaceStore(() => state, setState, { client: mockClient, notify: mockNotify })

    await store.createWorkspace('new-space')

    expect(mockClient.fs.mkdir).toHaveBeenCalledWith('/root/new-space')
    expect(mockClient.git.init).toHaveBeenCalledWith('/root/new-space')
    expect(state.currentPath).toBe('/root/new-space')
    expect(state.recentWorkspaces).toContain('/root/new-space')
  })

  it('should create file', async () => {
    state.currentPath = '/root/space'
    mockClient.fs.read = vi.fn().mockResolvedValue('')
    const store = createWorkspaceStore(() => state, setState, { client: mockClient, notify: mockNotify })

    await store.createFile('test-file')

    expect(mockClient.fs.write).toHaveBeenCalledWith('/root/space/test-file.md', '')
  })

  it('should update content', () => {
    state.currentFile = { name: 'test.md', path: '/test.md', isDirectory: false, isFile: true }
    const store = createWorkspaceStore(() => state, setState, { client: mockClient, notify: mockNotify })

    store.updateContent('new content')

    expect(state.fileContent).toBe('new content')
    expect(state.isDirty).toBe(true)
  })

  it('should save to disk', async () => {
    state.currentFile = { name: 'test.md', path: '/test.md', isDirectory: false, isFile: true }
    state.fileContent = 'content'
    const store = createWorkspaceStore(() => state, setState, { client: mockClient, notify: mockNotify })

    await store.saveToDisk()

    expect(mockClient.fs.write).toHaveBeenCalledWith('/test.md', 'content')
    expect(state.isDirty).toBe(false)
  })
})
