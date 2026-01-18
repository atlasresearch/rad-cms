import { Component, For, Show } from 'solid-js'
import { workspaceStore } from '../store/workspace'
import { File, Clock, Star, Plus } from 'lucide-solid'

export const HomeView: Component = () => {
  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const userName = () => workspaceStore.state.identity?.split('\n')[1] || 'User'

  return (
    <div class="h-full flex-1 overflow-auto bg-white p-12 dark:bg-[#191919]">
      <div class="mx-auto max-w-[900px]">
        <h1 class="mb-8 text-3xl font-bold text-[#37352f] dark:text-[#D4D4D4]">
          {greeting()}, {userName()}
        </h1>

        <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Recent Pages */}
          <div class="flex flex-col gap-2">
            <div class="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
              <Clock size={16} />
              <span>Recently Visited</span>
            </div>
            <Show
              when={workspaceStore.state.recentFiles.length > 0}
              fallback={<div class="text-sm text-gray-400 italic">No recently visited pages</div>}
            >
              <For each={workspaceStore.state.recentFiles}>
                {(file) => (
                  <div
                    class="group flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-[#EFEFED] dark:hover:bg-[#2f2f2f]"
                    onClick={() => workspaceStore.openFile(file)}
                  >
                    <div class="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200">
                      <File size={16} />
                    </div>
                    <div class="text-sm font-medium text-[#37352f] dark:text-[#D4D4D4]">{file.name}</div>
                  </div>
                )}
              </For>
            </Show>
          </div>

          {/* Quick Actions / Getting Started */}
          <div class="flex flex-col gap-2">
            <div class="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
              <Star size={16} />
              <span>Suggested</span>
            </div>

            <div
              class="cursor-pointer rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-[#2f2f2f]"
              onClick={async () => {
                const name = prompt('Enter page name', 'Untitled')
                if (name) {
                  // Make sure we have a path
                  if (!workspaceStore.state.currentPath) {
                    alert('No workspace open')
                    return
                  }
                  await workspaceStore.createFile(name)
                }
              }}
            >
              <div class="mb-1 flex items-center gap-2">
                <Plus size={18} class="text-blue-500" />
                <span class="text-sm font-medium">Create a new page</span>
              </div>
              <div class="pl-6 text-xs text-gray-500">Start fresh with an empty document</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
