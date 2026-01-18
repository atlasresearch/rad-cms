// Type definitions for the exposed IPC bridge
export interface FileEntry {
  name: string
  isDirectory: boolean
  isFile: boolean
  path: string
}

export interface ClientAPI {
  fs: {
    write(path: string, content: string): Promise<void>
    read(path: string): Promise<string>
    readdir(path: string): Promise<FileEntry[]>
    mkdir(path: string): Promise<void>
    rename(oldPath: string, newPath: string): Promise<void>
    delete(path: string): Promise<void>
    copy(sourcePath: string, destPath: string): Promise<void>
    search(path: string, query: string): Promise<FileEntry[]>
    writeImage(path: string, base64: string): Promise<void>
  }
  git: {
    init(cwd: string): Promise<void>
    publish(cwd: string): Promise<void>
    fetch(cwd: string): Promise<void>
    getStatus(cwd: string): Promise<boolean>
  }
  rad: {
    nodeStart(): Promise<string>
    getIdentity(): Promise<string>
  }
  app?: {
    getConfig(): Promise<{ root: string }>
  }
}
