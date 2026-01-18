import { Component, createSignal, createEffect, For, onCleanup, Show } from 'solid-js'
import { workspaceStore } from '../store/workspace'
import { FileText, Search } from 'lucide-solid'

export const CommandPalette: Component = () => {
  const [query, setQuery] = createSignal('')
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  let inputRef!: HTMLInputElement

  // Filter files
  const filteredFiles = () => {
    const q = query().toLowerCase()
    if (!q) return workspaceStore.getAllFiles().slice(0, 10)
    return workspaceStore.state.searchResults.slice(0, 10)
  }

  createEffect(() => {
    if (workspaceStore.state.isSearchOpen) {
      setQuery('')
      setSelectedIndex(0)
      workspaceStore.setState('searchResults', [])
      setTimeout(() => inputRef?.focus(), 50)
    }
  })

  createEffect(() => {
    const q = query()
    if (q) {
      workspaceStore.performSearch(q)
    }
  })

  const close = () => workspaceStore.toggleSearch(false)

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      workspaceStore.toggleSearch()
      return
    }

    if (!workspaceStore.state.isSearchOpen) return

    if (e.key === 'Escape') {
      close()
      return
    }

    const files = filteredFiles()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, files.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (files.length > 0 && selectedIndex() < files.length) {
        workspaceStore.openFile(files[selectedIndex()])
        close()
      }
    }
  }

  // Add global listener
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown)
    onCleanup(() => window.removeEventListener('keydown', handleKeydown))
  }

  return (
    <Show when={workspaceStore.state.isSearchOpen}>
      <div class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh]" onClick={close}>
        <div
          class="flex max-h-[60vh] w-[600px] max-w-[90vw] flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:border dark:border-[#2f2f2f] dark:bg-[#191919]"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="flex items-center gap-2 border-b p-3 dark:border-[#2f2f2f]">
            <Search size={18} class="text-gray-400" />
            <input
              ref={(el) => (inputRef = el)}
              type="text"
              placeholder="Search pages..."
              class="flex-1 bg-transparent p-1 text-base text-[#37352f] placeholder:text-gray-400 focus:outline-none dark:text-[#D4D4D4]"
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
            />
            <div class="rounded border px-1.5 py-0.5 text-xs text-gray-400 dark:border-gray-700">ESC</div>
          </div>

          <div class="flex-1 overflow-auto p-2" role="listbox">
            <For each={filteredFiles()}>
              {(file, index) => (
                <div
                  class={`flex cursor-pointer items-center gap-2 rounded p-2 text-[#37352f] hover:bg-gray-100 dark:text-[#D4D4D4] dark:hover:bg-[#2f2f2f] ${selectedIndex() === index() ? "bg-gray-100 dark:bg-[#2f2f2f]" : ''}`}
                  onClick={() => {
                    workspaceStore.openFile(file)
                    close()
                  }}
                  onMouseEnter={() => setSelectedIndex(index())}
                >
                  <FileText size={16} class="text-gray-400" />
                  <div>
                    <div class="text-sm font-medium">{file.name}</div>
                    <div class="truncate text-xs text-gray-400">{file.path}</div>
                  </div>
                </div>
              )}
            </For>
          </div>

          <Show when={filteredFiles().length === 0}>
            <div class="p-8 text-center text-sm text-gray-400">No results found</div>
          </Show>
        </div>
      </div>
    </Show>
  )
}
