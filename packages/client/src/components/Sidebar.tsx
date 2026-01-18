import { Component, For, Show, createSignal, onCleanup, createEffect } from 'solid-js'
import { workspaceStore } from '../store/workspace'
import { Search, Plus, Settings, ChevronDown, ChevronRight, Home, FileText, FolderPlus } from 'lucide-solid'

// Global UI State for Sidebar (simplifies recursive prop drilling)
const [contextMenu, setContextMenu] = createSignal<{ x: number; y: number; file: any } | null>(null)
const [renameModal, setRenameModal] = createSignal<{ file: any; name: string } | null>(null)
const [deleteModal, setDeleteModal] = createSignal<{ file: any } | null>(null)
const [moveModal, setMoveModal] = createSignal<{ file: any; path: string } | null>(null)
const [createFileModal, setCreateFileModal] = createSignal<{ parentPath?: string } | null>(null)
const [createFolderModal, setCreateFolderModal] = createSignal<{ parentPath?: string } | null>(null)

const FileTreeItem: Component<{ file: any; depth: number }> = (props) => {
  const isSelected = () => workspaceStore.state.currentFile?.path === props.file.path

  const hasActiveChild = (): boolean => {
    if (!props.file.isDirectory) return false
    const check = (files: any[]): boolean => {
      if (!files) return false
      return files.some(
        (f) => workspaceStore.state.currentFile?.path === f.path || (f.isDirectory && check(f.children))
      )
    }
    return check(props.file.children)
  }

  // Initialize expansion if contains active file
  if (hasActiveChild()) {
    workspaceStore.toggleFolder(props.file.path, true)
  }

  const isOpen = () => workspaceStore.state.expandedPaths.includes(props.file.path)
  const [isDragOver, setIsDragOver] = createSignal(false)

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer!.setData('text/plain', props.file.path)
    e.dataTransfer!.effectAllowed = 'move'
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault() // Necessary to allow dropping
    if (props.file.isDirectory) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (_e: DragEvent) => {
    setIsDragOver(false)
  }

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const sourcePath = e.dataTransfer!.getData('text/plain')
    if (sourcePath && props.file.isDirectory) {
      const success = await workspaceStore.moveFile(sourcePath, props.file.path)
      if (!success) alert('Failed to move file')
    }
  }

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    let x = e.clientX
    let y = e.clientY
    const MENU_WIDTH = 200
    const MENU_HEIGHT = 160

    if (typeof window !== 'undefined') {
      if (x + MENU_WIDTH > window.innerWidth) x = window.innerWidth - MENU_WIDTH - 8
      if (y + MENU_HEIGHT > window.innerHeight) y = window.innerHeight - MENU_HEIGHT - 8
    }

    setContextMenu({ x, y, file: props.file })
  }

  return (
    <>
      <div
        draggable={true}
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        class={`group flex cursor-pointer items-center gap-1 py-1 pr-2 text-sm select-none ${
          isSelected()
            ? "bg-[#EFEFED] font-medium text-[#37352f] dark:bg-[#37352f] dark:text-[#E3E2E0]"
            : "text-[#5F5E5B] hover:bg-[#EFEFED] dark:text-[#9B9A97] dark:hover:bg-[#2C2C2C]"
        } ${isDragOver() ? "bg-blue-100 dark:bg-blue-900" : ''}`}
        style={{ 'padding-left': `${props.depth * 12 + 8}px` }}
        onClick={(e) => {
          e.stopPropagation()
          if (props.file.isDirectory) {
            workspaceStore.toggleFolder(props.file.path)
          } else {
            workspaceStore.openFile(props.file)
          }
        }}
      >
        <div class="flex h-4 w-4 shrink-0 items-center justify-center text-[#9B9A97]">
          <Show when={props.file.isDirectory} fallback={<FileText size={14} />}>
            <div class={`transition-transform duration-200 ${isOpen() ? 'rotate-90' : ''}`}>
              <ChevronRight size={14} />
            </div>
          </Show>
        </div>
        <span class="truncate">{props.file.name}</span>
      </div>

      <Show when={props.file.isDirectory && isOpen()}>
        <For each={props.file.children}>{(child) => <FileTreeItem file={child} depth={props.depth + 1} />}</For>
      </Show>
    </>
  )
}

export const Sidebar: Component = () => {
  const [isCreating, setIsCreating] = createSignal(false)
  const [newFolder, setNewFolder] = createSignal('')
  const [newPath, setNewPath] = createSignal('')
  const [newPageName, setNewPageName] = createSignal('')
  const [width, setWidth] = createSignal(240)
  const [isResizing, setIsResizing] = createSignal(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = createSignal(false)

  // Resize Handlers
  const startResizing = (e: MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    document.body.style.cursor = 'col-resize'
  }

  const stopResizing = () => {
    setIsResizing(false)
    document.body.style.cursor = 'default'
  }

  const resize = (e: MouseEvent) => {
    if (isResizing()) {
      const newWidth = Math.max(160, Math.min(600, e.clientX))
      setWidth(newWidth)
    }
  }

  createEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', resize)
      window.addEventListener('mouseup', stopResizing)
      onCleanup(() => {
        window.removeEventListener('mousemove', resize)
        window.removeEventListener('mouseup', stopResizing)
      })
    }
  })

  // Notion Style: User Dropdown / Workspace switcher
  const userName = () => workspaceStore.state.identity?.split('\n')[1] || 'Anonymous'

  return (
    <div
      class="relative flex h-full flex-col border-r border-[#E9E9E8] bg-[#F7F7F5] text-sm font-medium text-[#5F5E5B] select-none dark:border-[#2f2f2f] dark:bg-[#202020] dark:text-[#9B9A97]"
      style={{ width: `${width()}px` }}
    >
      {/* Resizer Handle */}
      <div
        class="absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize transition-colors hover:bg-blue-300"
        onMouseDown={startResizing}
      ></div>

      {/* Workspace Switcher / User Profile */}
      <div
        class="relative m-2 flex cursor-pointer items-center gap-2 rounded p-3 transition-colors hover:bg-[#EFEFED] dark:hover:bg-[#2C2C2C]"
        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen())}
      >
        <div class="flex h-5 w-5 items-center justify-center rounded bg-[#E3E2E0] text-xs font-bold text-black dark:bg-[#454b5e] dark:text-white">
          {userName()[0]}
        </div>
        <div class="flex-1 truncate text-sm font-semibold text-[#37352f] dark:text-[#E3E2E0]">
          {workspaceStore.state.currentPath ? workspaceStore.state.currentPath.split('/').pop() : 'No Workspace'}
        </div>
        <ChevronDown size={14} />

        {/* Profile Menu Dropdown */}
        <Show when={isProfileMenuOpen()}>
          <div
            class="absolute top-10 left-0 z-50 flex w-64 flex-col rounded border border-gray-200 bg-white py-1 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="px-4 py-2 text-xs font-medium text-gray-500">
              {workspaceStore.state.identity ?? 'No Identity'}
            </div>

            <div class="my-1 h-px bg-gray-100"></div>

            <div class="px-4 py-1.5 text-xs font-semibold text-gray-500">Workspaces</div>

            <For each={workspaceStore.state.recentWorkspaces}>
              {(ws) => (
                <div
                  class="flex cursor-pointer items-center gap-2 px-4 py-1.5 text-sm hover:bg-[#EFEFED]"
                  onClick={() => {
                    workspaceStore.setWorkspacePath(ws)
                    setIsProfileMenuOpen(false)
                  }}
                >
                  <div class="flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-xs font-bold">
                    {ws.split('/').pop()?.[0] || 'W'}
                  </div>
                  <div class="flex-1 truncate">{ws.split('/').pop() || ws}</div>
                  <Show when={workspaceStore.state.currentPath === ws}>
                    <div class="h-2 w-2 rounded-full bg-green-500"></div>
                  </Show>
                </div>
              )}
            </For>

            <div
              class="flex cursor-pointer items-center gap-2 px-4 py-1.5 text-sm text-gray-600 hover:bg-[#EFEFED]"
              onClick={() => {
                setIsCreating(true)
                setIsProfileMenuOpen(false)
              }}
            >
              <Plus size={14} />
              <span>Create Workspace</span>
            </div>

            <div class="my-1 h-px bg-gray-100"></div>

            <div
              class="cursor-pointer px-3 py-1.5 text-sm hover:bg-[#EFEFED]"
              onClick={() => {
                workspaceStore.logout()
                setIsProfileMenuOpen(false)
              }}
            >
              Log out
            </div>
          </div>
          {/* Backdrop to close menu */}
          <div
            class="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation()
              setIsProfileMenuOpen(false)
            }}
          ></div>
        </Show>
      </div>

      {/* Quick Actions */}
      <div class="mb-4 flex flex-col px-2">
        <div
          class="flex cursor-pointer items-center gap-2 rounded p-1.5 text-[#5F5E5B] hover:bg-[#EFEFED] dark:text-[#9B9A97] dark:hover:bg-[#2C2C2C]"
          onClick={() => workspaceStore.toggleSearch()}
        >
          <Search size={16} />
          <span>Search</span>
        </div>
        <div
          class="flex cursor-pointer items-center gap-2 rounded p-1.5 text-[#5F5E5B] hover:bg-[#EFEFED] dark:text-[#9B9A97] dark:hover:bg-[#2C2C2C]"
          onClick={() => workspaceStore.goHome()}
        >
          <Home size={16} />
          <span>Home</span>
        </div>
        <div
          class="flex cursor-pointer items-center gap-2 rounded p-1.5 text-[#5F5E5B] hover:bg-[#EFEFED] dark:text-[#9B9A97] dark:hover:bg-[#2C2C2C]"
          onClick={() => workspaceStore.toggleSettings(true)}
        >
          <Settings size={16} />
          <span>Settings</span>
        </div>
      </div>

      {/* Pages / Favorites Section */}
      <div class="flex-1 overflow-auto px-2">
        <div class="mb-1 px-2 py-1 text-xs font-semibold text-[#9B9A97]">PAGES</div>

        <div class="flex flex-col gap-0.5">
          <For each={workspaceStore.state.files}>{(file) => <FileTreeItem file={file} depth={0} />}</For>

          <div class="mt-1 flex gap-1 px-2">
            <div
              class="flex flex-1 cursor-pointer items-center gap-2 rounded p-1 px-2 text-[#9B9A97] hover:bg-[#EFEFED] dark:hover:bg-[#2C2C2C]"
              onClick={() => {
                setCreateFileModal({}) // Root
              }}
            >
              <Plus size={14} />
              <span>Add page</span>
            </div>
            <div
              class="flex flex-1 cursor-pointer items-center gap-2 rounded p-1 px-2 text-[#9B9A97] hover:bg-[#EFEFED] dark:hover:bg-[#2C2C2C]"
              onClick={() => {
                setCreateFolderModal({}) // Root
              }}
            >
              <FolderPlus size={14} />
              <span>Add folder</span>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Creator Modal (if triggered via menu) */}
      <Show when={isCreating()}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setIsCreating(false)}
        >
          <div class="w-80 rounded border bg-white p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div class="mb-2 text-sm font-semibold">New Workspace</div>
            <input
              type="text"
              placeholder="Workspace Name"
              class="mb-3 w-full rounded border p-2 text-sm"
              value={newPath()}
              onInput={(e) => setNewPath(e.currentTarget.value)}
              autofocus
            />
            <div class="flex justify-end gap-2 text-sm">
              <button class="rounded bg-gray-100 px-3 py-1.5 hover:bg-gray-200" onClick={() => setIsCreating(false)}>
                Cancel
              </button>
              <button
                class="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
                onClick={() => {
                  if (newPath()) {
                    workspaceStore.createWorkspace(newPath())
                    setIsCreating(false)
                    setNewPath('')
                  }
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* New Page Modal */}
      <Show when={createFileModal()}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setCreateFileModal(null)}
        >
          <div class="w-80 rounded border bg-white p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div class="mb-2 text-sm font-semibold">New Page</div>
            <div class="mb-2 text-xs text-gray-500">
              In: {createFileModal()?.parentPath?.split('/').pop() || 'Root'}
            </div>
            <input
              type="text"
              placeholder="Page Name"
              class="mb-3 w-full rounded border p-2 text-sm"
              value={newPageName()}
              onInput={(e) => setNewPageName(e.currentTarget.value)}
              autofocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newPageName()) {
                  workspaceStore.createFile(newPageName(), createFileModal()?.parentPath)
                  setCreateFileModal(null)
                  setNewPageName('')
                }
              }}
            />
            <div class="flex justify-end gap-2 text-sm">
              <button
                class="rounded bg-gray-100 px-3 py-1.5 hover:bg-gray-200"
                onClick={() => setCreateFileModal(null)}
              >
                Cancel
              </button>
              <button
                class="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
                onClick={() => {
                  if (newPageName()) {
                    workspaceStore.createFile(newPageName(), createFileModal()?.parentPath)
                    setCreateFileModal(null)
                    setNewPageName('')
                  }
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* New Folder Modal */}
      <Show when={createFolderModal()}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setCreateFolderModal(null)}
        >
          <div class="w-80 rounded border bg-white p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div class="mb-2 text-sm font-semibold">New Folder</div>
            <div class="mb-2 text-xs text-gray-500">
              In: {createFolderModal()?.parentPath?.split('/').pop() || 'Root'}
            </div>
            <input
              type="text"
              placeholder="Folder Name"
              class="mb-3 w-full rounded border p-2 text-sm"
              value={newFolder()}
              onInput={(e) => setNewFolder(e.currentTarget.value)}
              autofocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolder()) {
                  workspaceStore.createFolder(newFolder(), createFolderModal()?.parentPath)
                  setCreateFolderModal(null)
                  setNewFolder('')
                }
              }}
            />
            <div class="flex justify-end gap-2 text-sm">
              <button
                class="rounded bg-gray-100 px-3 py-1.5 hover:bg-gray-200"
                onClick={() => setCreateFolderModal(null)}
              >
                Cancel
              </button>
              <button
                class="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
                onClick={() => {
                  if (newFolder()) {
                    workspaceStore.createFolder(newFolder(), createFolderModal()?.parentPath)
                    setCreateFolderModal(null)
                    setNewFolder('')
                  }
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Context Menu */}
      <Show when={contextMenu()}>
        <div
          class="context-menu fixed z-50 rounded border border-gray-200 bg-white py-1 text-sm text-[#37352f] shadow-lg"
          style={{ top: `${contextMenu()!.y}px`, left: `${contextMenu()!.x}px` }}
        >
          <Show when={contextMenu()!.file.isDirectory}>
            <div
              class="cursor-pointer px-3 py-1 hover:bg-[#EFEFED]"
              onClick={() => {
                setCreateFileModal({ parentPath: contextMenu()!.file.path })
                setContextMenu(null)
              }}
            >
              New File
            </div>
            <div
              class="cursor-pointer px-3 py-1 hover:bg-[#EFEFED]"
              onClick={() => {
                setCreateFolderModal({ parentPath: contextMenu()!.file.path })
                setContextMenu(null)
              }}
            >
              New Folder
            </div>
            <div class="my-1 h-px bg-gray-100"></div>
          </Show>

          <div
            class="cursor-pointer px-3 py-1 hover:bg-[#EFEFED]"
            onClick={() => {
              setRenameModal({ file: contextMenu()!.file, name: contextMenu()!.file.name })
              setContextMenu(null)
            }}
          >
            Rename
          </div>
          <div
            class="cursor-pointer px-3 py-1 hover:bg-[#EFEFED]"
            onClick={() => {
              const parent = contextMenu()!.file.path.substring(0, contextMenu()!.file.path.lastIndexOf('/'))
              setMoveModal({ file: contextMenu()!.file, path: parent })
              setContextMenu(null)
            }}
          >
            Move
          </div>
          <div
            class="cursor-pointer px-3 py-1 hover:bg-[#EFEFED]"
            onClick={() => {
              workspaceStore.duplicateFile(contextMenu()!.file.path)
              setContextMenu(null)
            }}
          >
            Duplicate
          </div>
          <div class="my-1 h-px bg-gray-100"></div>
          <div
            class="cursor-pointer px-3 py-1 text-red-600 hover:bg-[#EFEFED]"
            onClick={() => {
              setDeleteModal({ file: contextMenu()!.file })
              setContextMenu(null)
            }}
          >
            Delete
          </div>
        </div>
        {/* Backdrop to close */}
        <div class="fixed inset-0 z-40" onClick={() => setContextMenu(null)}></div>
      </Show>

      {/* Rename Modal */}
      <Show when={renameModal()}>
        <div class="rename-modal fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div class="w-80 rounded bg-white p-3 shadow-lg">
            <div class="mb-2 text-sm font-semibold">Rename</div>
            <input
              type="text"
              class="mb-2 w-full rounded border p-1 text-sm"
              value={renameModal()!.name}
              onInput={(e) => setRenameModal({ ...renameModal()!, name: e.currentTarget.value })}
              autofocus
            />
            <div class="flex justify-end gap-2 text-xs">
              <button class="rounded bg-gray-100 px-2 py-1" onClick={() => setRenameModal(null)}>
                Cancel
              </button>
              <button
                class="rounded bg-blue-600 px-2 py-1 text-white"
                onClick={() => {
                  workspaceStore.renameFileFromContextMenu(renameModal()!.file.path, renameModal()!.name)
                  setRenameModal(null)
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Delete Modal */}
      <Show when={deleteModal()}>
        <div class="delete-modal fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div class="w-80 rounded bg-white p-4 shadow-lg">
            <div class="mb-2 text-sm font-semibold">Delete File</div>
            <div class="mb-4 text-sm text-gray-600">Delete {deleteModal()!.file.name}?</div>
            <div class="flex justify-end gap-2 text-xs">
              <button class="rounded bg-gray-100 px-3 py-1.5 hover:bg-gray-200" onClick={() => setDeleteModal(null)}>
                Cancel
              </button>
              <button
                class="rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
                onClick={() => {
                  workspaceStore.deleteFile(deleteModal()!.file.path)
                  setDeleteModal(null)
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Move Modal */}
      <Show when={moveModal()}>
        <div class="move-modal fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div class="w-96 rounded bg-white p-3 shadow-lg">
            <div class="mb-2 text-sm font-semibold">Move File</div>
            <div class="mb-2 text-xs text-gray-500">Select destination folder path</div>
            <input
              type="text"
              class="mb-2 w-full rounded border p-1 text-sm"
              value={moveModal()!.path}
              onInput={(e) => setMoveModal({ ...moveModal()!, path: e.currentTarget.value })}
              autofocus
            />
            <div class="flex justify-end gap-2 text-xs">
              <button class="rounded bg-gray-100 px-2 py-1" onClick={() => setMoveModal(null)}>
                Cancel
              </button>
              <button
                class="rounded bg-blue-600 px-2 py-1 text-white"
                onClick={async () => {
                  const success = await workspaceStore.moveFile(moveModal()!.file.path, moveModal()!.path)
                  if (success) {
                    setMoveModal(null)
                  } else {
                    alert('Failed to move file')
                  }
                }}
              >
                Move
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
