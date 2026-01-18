# Sovereign CMS

**Sovereign CMS** is a local-first, peer-to-peer (P2P) version-controlled workspace for Markdown, JSON, and CSV files. It combines the speed of local editing with the decentralized collaboration power of **Radicle**.

## 🌟 Core Concepts

- **Local-First**: All data is stored on your local disk. Editing is zero-latency and works offline.
- **Git Native**: The workspace is a standard Git repository.
- **P2P Collaboration**: Uses the [Radicle](https://radicle.xyz) gossip network to sync changes directly between peers without central servers.
- **Save vs. Publish**: Auto-saves locally for speed; explicit "Publish" step to commit and sync to the network.

## 📂 Project Structure

This monorepo is managed with **pnpm workspaces**:

- **`packages/desktop`**: Electron Main process, IPC bridges, and local-first logic (Git/Radicle wrappers).
- **`packages/client`**: SolidJS + Vite frontend (Renderer process). UI components for the File Explorer, Editor, and Status bar.
- **`packages/core`**: Shared utilities and types.
- **`packages/server`**: (Optional) Backend components if needed.

## 🚀 Getting Started

### Prerequisites

1.  **Node.js** (LTS) & **pnpm**.
2.  **Radicle CLI** (`rad`) installed and available in your PATH.
3.  **Git** (`git`) installed.

### Installation

```bash
pnpm install
```

### Development

To start the full Electron application in development mode:

1.  Start the client dev server:
    ```bash
    pnpm --filter @rad-cms/client dev
    ```
2.  In a separate terminal, start the Electron Desktop app:
    ```bash
    pnpm --filter @rad-cms/desktop dev
    ```

_Note: You can run `pnpm dev` from the root, but ensuring the desktop process picks up the client port is critical._

### Testing

Run the full test suite (Unit Tests & E2E):

```bash
pnpm test
```

## 🏗 Building

To build all packages for production:

```bash
pnpm build
```

## 🛠 Tech Stack

- **Runtime**: Electron
- **Frontend**: SolidJS, Tailwind CSS
- **Languages**: TypeScript
- **P2P Network**: Radicle (`rad` CLI)
- **VCS**: Git

## 🛠 Scripts

Run these scripts from the root directory:

| Script       | Description                                           |
| :----------- | :---------------------------------------------------- |
| `pnpm dev`   | Starts development servers.                           |
| `pnpm build` | Builds all packages in the workspace.                 |
| `pnpm test`  | Runs tests across all packages (Vitest & Playwright). |
| `pnpm check` | Runs type checking (`tsc`) and linting.               |
