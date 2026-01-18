# Remaining Features & Tech Debt

This file tracks the missing features, broken implementations, and technical debt identified after a thorough review of the current codebase.

## 🚨 Critical / Broken

- [x] **Dark Mode Implementation**: The `setTheme` action in `workspace.ts` updates the store and `localStorage`, but does _not_ apply the `.dark` class to `document.body` or `html`. Dark mode selection currently does nothing visually.
- [x] **Error Handling UI**: `try/catch` blocks in `workspace.ts` simply log errors to the console (`console.error`). Users receive no feedback if file creation, renaming, or saving fails. Need a Toast/Notification system.
- [x] **Formatting Toolbar**: The Editor relies entirely on Markdown shortcuts. There is no Bubble Menu (floating toolbar) for selecting text to Bold/Italic/Link, nor a fixed toolbar.

## 📝 Editor Experience

- [ ] **Link Management**: No UI exists to insert hyperlinks (e.g., `Ctrl+K` handler or toolbar button).
- [ ] **History & History View**: The "Clock" icon in the top bar triggers an `alert("History coming soon")`. No git history visualization features exist.
- [ ] **Favorites/Starred Pages**: The "Star" icon triggers an `alert("Favorites coming soon")`. No "Favorites" list in the Sidebar or Home View.
- [ ] **More Options Menu**: The "..." menu in the top bar triggers an `alert`. Should likely contain "Export", "Delete", "View Source", etc.

## 📂 File System & Sidebar

- [x] **Folder Creation**: Implemented "Add folder" button and context menu options. Support for `window.cms.fs.mkdir`.
- [x] **Workspace Initialization**: `createWorkspace` now calls `window.cms.git.init`.
- [x] **Context Menu Polish**: Added "New File" and "New Folder" to folder context menu.

## ⚙️ Settings

- [ ] **Language Settings**: The "Language" tab is a placeholder text ("Language settings coming soon").
- [x] **Theme Preview**: Added "System" mode and ensured theme changes are applied instantly via `document.documentElement` class list manipulation.

## 🔍 Command Palette

- [ ] **Command Actions**: The palette only searches files. It should support commands like "> Create Page", "> Toggle Dark Mode", "> Reload Window".

## 🏠 Home View

- [ ] **Empty States**: If no recent workspaces exist, the onboarding/setup experience is minimal.
- [ ] **Suggested Actions**: Currently only shows "Create a new page". Could include "Open Workspace", "Clone Repository", etc.

## 🛠 Technical Debt

- [ ] **Type Safety**: `window.cms` types in `window.d.ts` might need alignment with the actual Electron/Tauri backend implementation (verified `fs.search` exists in types but implementation is separate).
- [ ] **Hardcoded Paths**: Image handling in `TiptapEditor` hardcodes `file://${absPath}`, which requires specific security config in the main process.
