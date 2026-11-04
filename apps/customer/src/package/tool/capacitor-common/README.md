# CapacitorCommonTool

This folder contains reusable hooks and utilities for Capacitor-based apps, including:

- App OTA updates (Capgo)
- Push notification lifecycle handling
- Screen orientation control

---

## Dependencies

Required NPM Packages

- `react`
- `framework7-react`
- `@capgo/capacitor-updater`
- `@capacitor/app`
- `@capacitor/core`
- `@capacitor/device`
- `@capacitor/screen-orientation`
- `@capacitor/push-notifications`

Local Dependencies

- `UserData.jsx`
- `Dialog.jsx`

## NPM Installation

Install all required Capacitor plugins:

```bash
npm install @capgo/capacitor-updater @capacitor/app @capacitor/core @capacitor/device @capacitor/screen-orientation @capacitor/push-notifications
```

Make sure Framework7 and React are already installed if used:
npm install framework7-react react

---

## Hooks

### `useCapgoUpdater()`

- **Purpose:** Handles app updates using Capgo Capacitor Updater.
- **Usage:**
  - Must be placed at the **top of your App component**.
  - Can also be placed at the **top of your `main` entry file**.
- **Example:**

```javascript
// App.jsx
import { useCapgoUpdater } from "./CapacitorCommonTool/hooks/useCapgoUpdater";

function App() {
  useCapgoUpdater();
  // ...rest of your app

  return <div>App content</div>;
}
```

---

### `usePushNotifications()`

**Purpose:**  
Handles push notification registration and lifecycle.

**Usage:**

- Place at the root of App component so it initializes once for the whole app.
- On user registration, call the exported `push_notification_add()` to register the user for push notifications.
- Call `push_notification_remove()` to unregister when needed.

**Example:**

```javascript
import {
  usePushNotifications,
  push_notification_add,
  push_notification_remove,
} from "./CapacitorCommonTool/hooks/usePushNotifications";

function App() {
  usePushNotifications();

  const handleUserRegister = async () => {
    await push_notification_add();
  };

  const handleUserLogout = async () => {
    await push_notification_remove();
  };

  return <div>App content</div>;
}
```

---

### `useLockScreenOrientation()`

- **Purpose:** Locks the screen orientation for iOS and Android devices.
- **Usage:**
  - Should be placed at the **top of your App component.**.
  - Ensures orientation is enforced as early as possible.
- **Example:**

```javascript
// App.jsx
import { useLockScreenOrientation } from "./CapacitorCommonTool/hooks/useLockScreenOrientation";

function App() {
  useLockScreenOrientation();

  return <>{/* Rest of your app */}</>;
}
```
