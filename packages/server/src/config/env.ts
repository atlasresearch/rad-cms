import path from 'path'

export interface RadicleEnv extends NodeJS.ProcessEnv {
  RAD_HOME: string
}

export function createRadicleEnv(userDataPath: string): RadicleEnv {
  const radHome = path.join(userDataPath, 'radicle-env')
  return {
    ...process.env,
    RAD_HOME: radHome
  }
}
