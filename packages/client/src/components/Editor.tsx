import { Component, Show, createSignal, For } from 'solid-js'
import { workspaceStore } from '../store/workspace'
import { MoreHorizontal, Star, Clock, ArrowUpRight, UploadCloud, X } from 'lucide-solid'
import { TiptapEditor } from './TiptapEditor'

const EMOJIS = [
  '📄',
  '🚀',
  '💡',
  '📅',
  '✅',
  '🎉',
  '🔥',
  '💻',
  '📝',
  '📊',
  '🎨',
  '🔒',
  '❤️',
  '⚡',
  '👀',
  '📚',
  '🛠️',
  '⚠️',
  '🐛',
  '✨'
]

export const Editor: Component = () => {
  const [showIconPicker, setShowIconPicker] = createSignal(false)

  return (
    <div
      class="relative flex h-full flex-1 flex-col overflow-hidden bg-white dark:bg-[#191919]"
      onClick={() => setShowIconPicker(false)}
    >
      {/* Notion-style Top Bar */}
      <div class="sticky top-0 z-10 flex h-11 items-center justify-between bg-white px-3 text-[#37352f] select-none dark:bg-[#191919] dark:text-[#D4D4D4]">
        <div class="flex items-center gap-2 overflow-hidden text-sm">
          {/* Breadcrumbs */}
          <div class="flex max-w-[200px] cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[#37352f] transition-colors hover:bg-[#EFEFED] dark:text-[#D4D4D4] dark:hover:bg-[#2C2C2C]">
            <span class="truncate">
              {workspaceStore.state.currentPath ? workspaceStore.state.currentPath.split('/').pop() : 'Workspace'}
            </span>
          </div>
          <span class="mx-0.5 text-[#9B9A97]">/</span>
          <div class="flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 font-medium text-[#37352f] transition-colors hover:bg-[#EFEFED] dark:text-[#D4D4D4] dark:hover:bg-[#2C2C2C]">
            <span class="truncate">{workspaceStore.state.currentFile?.name || 'Untitled'}</span>
          </div>
        </div>

        <div class="flex items-center gap-1 text-[#37352f] dark:text-[#D4D4D4]">
          <Show when={!workspaceStore.state.isPublished}>
            <span class="mr-2 text-xs font-medium text-orange-600">Unpublished Changes</span>
            <Show
              when={workspaceStore.state.isPublishing}
              fallback={
                <button
                  aria-label="Publish changes"
                  class="cursor-pointer rounded border-0 bg-transparent p-1 text-[#37352f] hover:bg-[#EFEFED] dark:text-[#D4D4D4] dark:hover:bg-[#2C2C2C]"
                  onClick={() => workspaceStore.publish()}
                >
                  <UploadCloud size={18} />
                </button>
              }
            >
              <span class="mr-2 text-xs text-gray-500">Publishing...</span>
            </Show>
          </Show>

          <Show when={workspaceStore.state.isPublished}>
            <span class="mr-2 text-xs font-medium text-gray-400">Published</span>
          </Show>

          <div class="mr-1 cursor-pointer rounded border-r border-gray-200 p-1 px-2 text-xs font-medium text-[#37352f] opacity-80 transition-opacity hover:bg-[#EFEFED] hover:opacity-100 dark:border-[#2f2f2f] dark:text-[#D4D4D4] dark:hover:bg-[#2C2C2C]">
            {workspaceStore.state.isDirty ? 'Saving...' : 'Saved'}
          </div>

          <button
            aria-label="View history"
            class="cursor-pointer rounded border-0 bg-transparent p-1 text-[#37352f] hover:bg-[#EFEFED] dark:text-[#D4D4D4] dark:hover:bg-[#2C2C2C]"
            onClick={() => alert('History coming soon')}
          >
            <Clock size={18} />
          </button>

          <button
            aria-label="Star page"
            class="cursor-pointer rounded border-0 bg-transparent p-1 text-[#37352f] hover:bg-[#EFEFED] dark:text-[#D4D4D4] dark:hover:bg-[#2C2C2C]"
            onClick={() => alert('Favorites coming soon')}
          >
            <Star size={18} />
          </button>

          <button
            aria-label="More options"
            class="cursor-pointer rounded border-0 bg-transparent p-1 text-[#37352f] hover:bg-[#EFEFED] dark:text-[#D4D4D4] dark:hover:bg-[#2C2C2C]"
            onClick={() => alert('More options coming soon')}
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <Show
        when={workspaceStore.state.currentFile}
        fallback={
          <div class="flex flex-1 flex-col items-center justify-center text-[#9B9A97] select-none">
            <div class="mb-4 opacity-20">
              <ArrowUpRight size={64} />
            </div>
            <p>Select a page to start writing</p>
          </div>
        }
      >
        <div class="w-full flex-1 overflow-auto">
          <div class="mx-auto flex h-full max-w-[700px] flex-col px-12 py-12 pb-32">
            {/* Header Section */}
            <div class="group relative mb-8">
              {/* Cover Image */}
              <Show when={workspaceStore.state.frontmatter?.cover}>
                <div class="group-cover page-cover relative mb-10 h-44 w-full overflow-hidden rounded-md bg-gray-200">
                  <img src={workspaceStore.state.frontmatter.cover} class="h-full w-full object-cover" />
                  <button
                    class="absolute top-2 right-2 rounded bg-white/50 px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity group-hover/cover:opacity-100 hover:bg-white"
                    onClick={() => workspaceStore.updateProperty('cover', null)}
                  >
                    Remove cover
                  </button>
                </div>
              </Show>

              {/* Page Icon */}
              <Show when={workspaceStore.state.frontmatter?.icon}>
                <div class="relative">
                  <div
                    class="page-icon mb-4 inline-block cursor-pointer rounded p-2 text-7xl select-none hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowIconPicker(!showIconPicker())
                    }}
                  >
                    {workspaceStore.state.frontmatter.icon}
                  </div>

                  <Show when={showIconPicker()}>
                    <div
                      class="icon-picker absolute top-full left-0 z-50 w-64 rounded-lg border bg-white p-3 shadow-xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div class="grid grid-cols-5 gap-2">
                        <For each={EMOJIS}>
                          {(emoji) => (
                            <div
                              class="cursor-pointer rounded p-2 text-center text-xl hover:bg-gray-100"
                              onClick={() => {
                                workspaceStore.updateProperty('icon', emoji)
                                setShowIconPicker(false)
                              }}
                            >
                              {emoji}
                            </div>
                          )}
                        </For>
                      </div>
                      <div
                        class="mt-2 flex cursor-pointer items-center gap-2 border-t pt-2 text-xs text-gray-500 hover:text-red-500"
                        onClick={() => {
                          workspaceStore.updateProperty('icon', null)
                          setShowIconPicker(false)
                        }}
                      >
                        <X size={14} /> Remove icon
                      </div>
                    </div>
                  </Show>
                </div>
              </Show>

              {/* Controls (Add icon / Add cover) */}
              <div
                class={`${workspaceStore.state.frontmatter?.icon || workspaceStore.state.frontmatter?.cover ? "opacity-0 group-hover:opacity-100" : ''} mb-2 flex gap-2 text-xs text-[#9B9A97] transition-opacity select-none`}
              >
                <Show when={!workspaceStore.state.frontmatter?.icon}>
                  <div
                    class="flex cursor-pointer items-center gap-1 rounded px-2 py-1 hover:bg-[#EFEFED]"
                    onClick={() => workspaceStore.updateProperty('icon', '📄')}
                  >
                    <Star size={14} class="opacity-50" />
                    <span>Add icon</span>
                  </div>
                </Show>
                <Show when={!workspaceStore.state.frontmatter?.cover}>
                  <div
                    class="flex cursor-pointer items-center gap-1 rounded px-2 py-1 hover:bg-[#EFEFED]"
                    onClick={() => {
                      const url = prompt(
                        'Enter cover image URL',
                        'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80'
                      )
                      if (url) workspaceStore.updateProperty('cover', url)
                    }}
                  >
                    <MoreHorizontal size={14} class="opacity-50" />
                    <span>Add cover</span>
                  </div>
                </Show>
              </div>

              {/* Title Input */}
              <input
                type="text"
                class="w-full bg-transparent text-4xl font-bold text-[#37352f] placeholder:text-[#9B9A97]/50 focus:outline-none"
                value={workspaceStore.state.currentFile?.name || ''}
                onChange={(e) => workspaceStore.renameFile(e.currentTarget.value)}
                placeholder="Untitled"
              />
            </div>

            {/* Editor Content */}
            <Show when={workspaceStore.state.currentFile} keyed>
              {(_) => (
                <TiptapEditor
                  content={workspaceStore.state.fileContent}
                  onUpdate={(content) => workspaceStore.updateContent(content)}
                />
              )}
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}
