# Tool Folder Overview

This document provides a quick overview of each folder under `src/tool` and its primary purpose.

---

## 1. UI / Interaction Customization

- **animated-scrollable-row**  
  A container that supports auto-scrolling while allowing manual scroll, with adjustable speed. Typically used for recommendation lists with smooth animation effects.

- **common-side-panel**  
  Side drawer manager that can handle multiple side panels and stacking behavior. Useful for complex UI layouts with multiple overlapping drawers.

- **dialog**  
  Wrapper around SweetAlert2 and Framework7 Dialog. Provides:

  - `open_message`
  - `open_confirm_message`
  - `open_dialog_component` for custom component rendering
  - `<DialogManager />` to manage dialog components

- **tab-channel-message**  
  Provides a hook to send/subscribe messages across browser tabs using `BroadcastChannel` with fallback to `localStorage`.

- **safe-open-link-in-dialog**  
  Handles `a href` links inside dialogs to avoid F7 router interception issues. Replaces links with custom attributes and listens for clicks.

---

## 2. Configuration / Initialization

- **capacitor-common**  
  Simplifies configuration for Capacitor apps:

  - Lock screen
  - Capgo updater
  - Block back action
  - Push notification (`push_notification_add`, `push_notification_remove`)
    Most features can be initialized with a hook at the app entry point.

- **preferences**  
  Unified wrapper for storing and retrieving local data. Provides a consistent API across projects.

- **i18n-init**  
  Initializes global i18n instance automatically using a `langConfig` file. Entry usage: `useI18nInit()`.

- **navigate**  
  Centralized navigation wrapper for Framework7 router. Simplifies routing logic and consistent usage across the app.

- **cross-platform-navigate**  
  Handles navigation differences between mobile and desktop, automatically choosing the appropriate method (including in-app browser).

---

## 3. Utility / Small Feature Wrappers

- **class-name-merge**  
  Resolves class name conflicts, e.g., `d-flex` vs `d-block`. Provides a hook to get initial styles and merge with dynamic classes.

- **popup-manager**  
  Manages popup stacking to ensure correct display order and behavior.

- **qr-scanner**  
  Wrapper for scanning QR codes. Supports both HTML5 QR code scanner and Capacitor barcode scanner with default configurations for easy usage.

- **toast**  
  Wrapper for Framework7 toast notifications with a unified API.

---

## 4. Development / Team Management

- **custom-eslint-rules**  
  ESLint rules to ensure all code consistently uses the internal utility toolkit and avoids version mismatches between projects.

---

**Summary:**  
Folders are organized into four categories:

1. UI / Interaction Customization – custom visuals and component behaviors
2. Configuration / Initialization – hooks and setup for quick project entry
3. Utility / Small Feature Wrappers – common functionality with unified APIs
4. Development / Team Management – ensures code consistency and standards
