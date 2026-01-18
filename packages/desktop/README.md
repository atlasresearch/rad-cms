# Sovereign CMS Desktop

This package contains the Electron Main process and local-first logic.

## Architecture

- **Main Process**: `src/main/index.ts`
- **Controller**: `src/main/AppController.ts` - Handles business logic.
- **Services**: `src/services/RadicleGit.ts` - Wraps Git and Radicle binaries.
- **Config**: `src/config/env.ts` - Defines isolated `RAD_HOME`.

## Testing

Run tests with `pnpm test`.

## Development

Currently requires `rad` and `git` binaries in system PATH. The app uses a custom `RAD_HOME` at `userData/radicle-env`.

start with `pnpm dev`.
