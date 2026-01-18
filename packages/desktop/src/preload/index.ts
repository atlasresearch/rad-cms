import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('cms', {
  fs: {
    write: (path: string, content: string) => ipcRenderer.invoke('fs:write', path, content),
    read: (path: string) => ipcRenderer.invoke('fs:read', path),
    readdir: (path: string) => ipcRenderer.invoke('fs:readdir', path),
    mkdir: (path: string) => ipcRenderer.invoke('fs:mkdir', path),
    rename: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
    delete: (path: string) => ipcRenderer.invoke('fs:delete', path),
    search: (path: string, query: string) => ipcRenderer.invoke('fs:search', path, query),
    copy: (sourcePath: string, destPath: string) => ipcRenderer.invoke('fs:copy', sourcePath, destPath),
    writeImage: (path: string, base64: string) => ipcRenderer.invoke('fs:writeImage', path, base64)
  },
  git: {
    publish: (cwd: string) => ipcRenderer.invoke('git:publish', cwd),
    fetch: (cwd: string) => ipcRenderer.invoke('git:fetch', cwd),
    getStatus: (cwd: string) => ipcRenderer.invoke('git:get-status', cwd)
  },
  rad: {
    nodeStart: () => ipcRenderer.invoke('node:start'),
    getIdentity: () => ipcRenderer.invoke('rad:get-identity')
  }
})
