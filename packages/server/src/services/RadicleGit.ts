import { spawn } from 'child_process'

export interface RadicleService {
  exec(command: string, args: string[], cwd: string, extraEnv?: NodeJS.ProcessEnv): Promise<string>
  init(cwd: string): Promise<void>
  publish(cwd: string, message: string): Promise<void>
  fetch(cwd: string): Promise<void>
  status(cwd: string): Promise<boolean>
  auth(cwd: string, alias: string): Promise<void>
  nodeStart(cwd: string): Promise<void>
}

export function createRadicleService(radHome: string, binaries: { git?: string; rad?: string } = {}): RadicleService {
  const gitBin = binaries.git ?? 'git'
  const radBin = binaries.rad ?? 'rad'

  const exec = async (
    command: string,
    args: string[],
    cwd: string,
    extraEnv: NodeJS.ProcessEnv = {}
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Map command to binary path if needed
      let binary = command
      if (command === 'git') binary = gitBin
      if (command === 'rad') binary = radBin

      // Security: Do not pass the entire process.env to the child process.
      // Filter to allowlist of safe/necessary variables.
      const allowedVars = [
        'PATH',
        'HOME',
        'LANG',
        'LC_ALL',
        'TERM',
        'SSH_AUTH_SOCK',
        'GIT_EXEC_PATH',
        'GIT_SSH',
        'GIT_SSH_COMMAND'
      ]
      const env: NodeJS.ProcessEnv = { RAD_HOME: radHome }

      for (const key of allowedVars) {
        if (process.env[key] !== undefined) {
          env[key] = process.env[key]
        }
      }

      Object.assign(env, extraEnv)

      const child = spawn(binary, args, {
        cwd,
        env,
        shell: false
      })

      let stdout = ''
      let stderr = ''

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString()
        })
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString()
        })
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim())
        } else {
          // reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`))
          // Fallback to resolving with stdout if available (some commands exit with code 0 but print to stderr, wait, no, exit code is truth)
          // If code != 0, it is failure.
          reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`))
        }
      })

      child.on('error', (err) => {
        reject(err)
      })
    })
  }

  const init = async (cwd: string): Promise<void> => {
    await exec('rad', ['init', '--private', '--no-confirm'], cwd)
  }

  const publish = async (cwd: string, message: string): Promise<void> => {
    await exec('git', ['add', '.'], cwd)
    await exec('git', ['commit', '-m', message], cwd)
    await exec('rad', ['sync'], cwd)
  }

  const fetch = async (cwd: string): Promise<void> => {
    await exec('rad', ['sync', '--fetch'], cwd)
  }

  const status = async (cwd: string): Promise<boolean> => {
    const output = await exec('git', ['status', '--porcelain'], cwd)
    return output.length > 0
  }

  const auth = async (cwd: string, alias: string): Promise<void> => {
    await exec('rad', ['auth', '--alias', alias], cwd, { RAD_PASSPHRASE: '' })
  }

  const nodeStart = async (cwd: string): Promise<void> => {
    // rad node start runs in foreground by default, we need it in background?
    // Actually, asking to "start node" might imply starting it as a daemon.
    // `rad node start` blocks until the node is stopped.
    // We cannot use await exec() here if it blocks.
    // However, for this specific command, we probably want to use 'spawn' and let it run,
    // but the current architecture manages child processes via exec promise.
    //
    // ALTERNATIVE: `rad node start --daemon` is not a standard flag in all versions.
    // We will try running it and detaching?
    // Or we assume the system service should be running.
    //
    // If the error message says "run rad node start", we really should run it.
    // Let's assume for this environment we can run it as a detached process.

    // We bypass the standard `exec` to detach it.
    const binary = binaries.rad ?? 'rad'
    const env = {
      ...process.env,
      RAD_HOME: radHome
    }

    console.log(`Starting rad node in background...`)
    const child = spawn(binary, ['node', 'start'], {
      cwd,
      env,
      detached: true,
      stdio: 'ignore'
    })

    child.unref() // Allow parent to exit independently

    // Poll for status
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500))
      try {
        // Check if node is running by calling `rad node status`
        // We use the existing exec function which handles binaries/env
        const status = await exec('rad', ['node', 'status'], cwd)

        if (status.includes('stopped') || status.includes('Node is stopped')) {
          throw new Error('Node reported as stopped')
        }

        console.log('Radicle node started successfully. Status:', status)
        await new Promise((r) => setTimeout(r, 1000)) // Wait extra second for socket readiness
        return
      } catch (e) {
        // ignore and retry
        console.log('Waiting for node...', e instanceof Error ? e.message : String(e))
      }
    }
    console.warn('Radicle node failed to report status within timeout, continuing anyway...')
  }

  return {
    exec,
    init,
    publish,
    fetch,
    status,
    auth,
    nodeStart
  }
}
