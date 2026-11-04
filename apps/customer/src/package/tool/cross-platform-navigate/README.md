# Cross Platform Navigation Utility

This module provides a unified navigation solution for **Web + Capacitor (iOS / Android)** environments.

It ensures:

- Consistent routing behavior
- Proper handling of external URLs
- In-App Browser integration
- Screen orientation control
- Cross-platform compatibility

---

# 📦 Dependencies

- Capacitor Core
- Capacitor Browser Plugin
- Capacitor Screen Orientation Plugin
- Framework7
- Local helpers:
  - `navigate`
  - `getNavigateData`
  - `setNavigateData`

---

# 1️⃣ crossPlatformNavigate(urlOrPath)

## Purpose

Unified navigation entry point for both web and native environments.

## Behavior

| Platform | Absolute URL                | Relative Path               |
| -------- | --------------------------- | --------------------------- |
| Web      | `window.location.replace()` | `window.location.replace()` |
| Native   | Open In-App Browser         | Internal SPA navigation     |

## Logic Overview

```js
if (platform === "web") {
  window.location.replace(urlOrPath);
} else {
  if (absoluteUrl) {
    openInAppBrowserWithoutHook(urlOrPath);
  } else {
    navigate(urlOrPath);
  }
}
```

## Example

```js
await openInAppBrowserWithoutHook("https://example.com");
```

---

# 2️⃣ openInAppBrowserWithoutHook(url)

## Purpose

Open an external URL using the Capacitor Browser plugin  
with screen orientation handling and post-close navigation logic.

## Flow

1. Open in-app browser
2. Unlock screen orientation
3. Wait until browser closes
4. Restore portrait orientation
5. Optionally navigate back

## Events Used

- `browserPageLoaded`
- `browserFinished`

## Special Logic

If `comeFromPath` exists in Preferences:

```js
navigate("/?forceCloseLoading=true");
```

This ensures the loading screen closes correctly after returning from an external page.

---

# 3️⃣ openNewTabCrossPlatform(finalPath, target, features)

## Purpose

Cross-platform replacement for window.open.

## Supports

\_blank
noopener
noreferrer
Native in-app browser

---

## 🌐 Web Behavior

```js
window.open(finalUrl, target, features);
```

Relative paths are automatically converted into full URLs using:

```js
window.location.origin;
```

This ensures consistent behavior when opening internal routes in a new tab.

## 📱 Native Behavior

| Type           | Behavior            |
| -------------- | ------------------- |
| Absolute URL   | Open In-App Browser |
| Internal Route | SPA `navigate()`    |

In native environments (iOS / Android via Capacitor):

- External links are opened using the Capacitor Browser plugin.
- Internal routes remain inside the SPA using the custom `navigate()` helper.
- This ensures consistent routing behavior and prevents breaking the WebView context.

---

## 🔄 Screen Orientation Handling

When opening external pages:

- Unlock orientation when the page loads
- Lock back to portrait when the browser closes

```js
await ScreenOrientation.unlock();
await ScreenOrientation.lock({ orientation: "portrait" });
```

This prevents layout issues in hybrid applications when returning from external content, especially if the external page allows landscape mode.
