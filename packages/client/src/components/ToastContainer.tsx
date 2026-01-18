import { Component, For } from 'solid-js'
import { toastStore } from '../store/toast'
import { X, AlertCircle, CheckCircle, Info } from 'lucide-solid'

export const ToastContainer: Component = () => {
  return (
    <div class="pointer-events-none fixed right-4 bottom-4 z-[100] flex flex-col gap-2">
      <For each={toastStore.state.toasts}>
        {(toast) => (
          <div
            class={`animate-in slide-in-from-right fade-in pointer-events-auto flex max-w-[400px] min-w-[300px] items-center gap-3 rounded border p-3 shadow-lg duration-300 ${toast.type === 'error' ? "toast-error border-red-200 bg-red-50 text-red-800 dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-200" : ''} ${toast.type === 'success' ? "toast-success border-green-200 bg-green-50 text-green-800 dark:border-green-800/50 dark:bg-green-900/30 dark:text-green-200" : ''} ${toast.type === 'info' ? "toast-info border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/50 dark:bg-blue-900/30 dark:text-blue-200" : ''} `}
          >
            <div class="shrink-0">
              {toast.type === 'error' && <AlertCircle size={20} />}
              {toast.type === 'success' && <CheckCircle size={20} />}
              {toast.type === 'info' && <Info size={20} />}
            </div>
            <div class="flex-1 text-sm font-medium">{toast.message}</div>
            <button
              class="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
              onClick={() => toastStore.remove(toast.id)}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </For>
    </div>
  )
}
