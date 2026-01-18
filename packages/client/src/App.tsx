import { Component, onMount, Show } from 'solid-js'
import { Sidebar } from './components/Sidebar'
import { Editor } from './components/Editor'
import { CommandPalette } from './components/CommandPalette'
import { SettingsModal } from './components/SettingsModal'
import { ToastContainer } from './components/ToastContainer'
import { HomeView } from './views/HomeView'
import { workspaceStore } from './store/workspace'

const App: Component = () => {
  onMount(() => {
    // Initial data load
    workspaceStore.loadIdentity()
    workspaceStore.init()
  })

  return (
    <div class="flex h-screen w-screen flex-col bg-white text-[#37352f] dark:bg-[#191919] dark:text-[#D4D4D4]">
      <CommandPalette />
      <div class="flex flex-1 overflow-hidden">
        <Sidebar />
        <Show when={workspaceStore.state.activeView === 'home'} fallback={<Editor />}>
          <HomeView />
        </Show>
      </div>
      <SettingsModal />
      <ToastContainer />
    </div>
  )
}

export default App
