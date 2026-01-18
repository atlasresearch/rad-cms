import { Component, Show, createSignal, Switch, Match } from 'solid-js'
import { workspaceStore } from '../store/workspace'
import { X } from 'lucide-solid'

export const SettingsModal: Component = () => {
  const [activeTab, setActiveTab] = createSignal<'general' | 'appearance'>('general')

  // Robust identity parser
  const getIdentityName = () => {
    const id = workspaceStore.state.identity
    if (!id) return 'Anonymous'
    const parts = id.split('\n')
    return parts.length > 1 ? parts[1] : id
  }

  const getIdentityDID = () => {
    const id = workspaceStore.state.identity
    if (!id) return 'No DID'
    const parts = id.split('\n')
    return parts[0]
  }

  return (
    <Show when={workspaceStore.state.isSettingsOpen}>
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          class="settings-backdrop absolute inset-0 bg-black/40"
          onClick={() => workspaceStore.toggleSettings(false)}
        ></div>

        {/* Modal */}
        <div class="settings-modal relative z-10 flex h-[500px] w-[600px] flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-[#191919] dark:text-[#D4D4D4]">
          {/* Sidebar */}
          <div class="flex h-full">
            <div class="flex w-48 flex-col gap-1 border-r border-gray-200 bg-gray-50 p-3 dark:border-[#2f2f2f] dark:bg-[#202020]">
              <div class="mb-2 px-2 text-xs font-semibold text-gray-500 dark:text-[#9B9A97]">Settings</div>
              <div
                class={`cursor-pointer rounded px-2 py-1 text-sm font-medium ${activeTab() === 'general' ? "bg-gray-200 text-gray-800 dark:bg-[#2C2C2C] dark:text-[#D4D4D4]" : "text-gray-600 hover:bg-gray-100 dark:text-[#9B9A97] dark:hover:bg-[#2C2C2C]"}`}
                onClick={() => setActiveTab('general')}
              >
                General
              </div>
              <div
                class={`cursor-pointer rounded px-2 py-1 text-sm font-medium ${activeTab() === 'appearance' ? "bg-gray-200 text-gray-800 dark:bg-[#2C2C2C] dark:text-[#D4D4D4]" : "text-gray-600 hover:bg-gray-100 dark:text-[#9B9A97] dark:hover:bg-[#2C2C2C]"}`}
                onClick={() => setActiveTab('appearance')}
              >
                Appearance
              </div>
            </div>

            {/* Content */}
            <div class="flex-1 overflow-y-auto p-6">
              <Switch>
                <Match when={activeTab() === 'general'}>
                  <h2 class="mb-4 text-lg font-bold">General</h2>

                  <div class="flex flex-col gap-4">
                    <div>
                      <div class="mb-1 text-sm font-medium">Identity</div>
                      <div class="flex items-center gap-2 rounded border bg-gray-50 p-2 text-xs text-gray-500 dark:border-[#2f2f2f] dark:bg-[#202020] dark:text-[#9B9A97]">
                        {getIdentityName()}
                        <span class="text-gray-400">({getIdentityDID()})</span>
                      </div>
                    </div>

                    <div>
                      <div class="mb-1 text-sm font-medium">Current Workspace</div>
                      <div class="rounded border bg-gray-50 p-2 text-xs text-gray-500 dark:border-[#2f2f2f] dark:bg-[#202020] dark:text-[#9B9A97]">
                        {workspaceStore.state.currentPath}
                      </div>
                    </div>
                  </div>
                </Match>

                <Match when={activeTab() === 'appearance'}>
                  <h2 class="mb-4 text-lg font-bold">Appearance</h2>

                  <div class="flex flex-col gap-4">
                    <div>
                      <div class="mb-1 text-sm font-medium">Theme</div>
                      <select
                        class="w-full rounded border p-2 text-sm dark:border-[#2f2f2f] dark:bg-[#202020] dark:text-[#D4D4D4]"
                        value={workspaceStore.state.theme}
                        onChange={(e) => workspaceStore.setTheme(e.currentTarget.value as 'light' | 'dark' | 'system')}
                      >
                        <option value="system">System Default</option>
                        <option value="light">Light Mode</option>
                        <option value="dark">Dark Mode</option>
                      </select>
                    </div>
                  </div>
                </Match>
              </Switch>
            </div>
          </div>

          <button
            class="absolute top-3 right-3 rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-[#9B9A97] dark:hover:bg-[#2C2C2C]"
            onClick={() => workspaceStore.toggleSettings(false)}
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </Show>
  )
}
