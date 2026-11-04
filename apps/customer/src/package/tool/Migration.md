## capacitor-common

- **useLockScreenOrientation.jsx**

  - 移除包含如下内容的 useEffect ：

  ```js
  if (info.platform === "android" || info.platform === "ios") {
    await ScreenOrientation.lock({ orientation: "portrait" });
  }
  ```

- **useCapgoUpdater.jsx**

  - 在 app.jsx 中添加 `useCapgoUpdater`
  - 移除类似 `capgo-init.js` 文件及相关导入

- **usePushNotificationsNew.jsx**

  - 在 app.jsx 使用 `usePushNotifications`
  - 移除包含如下内容的 useEffect ：
    ```js
    PushNotifications.checkPermissions;
    ```
  - 移除注册、登录、登出中 PushNotifications 相关内容，包括 `add_device_token`、`setDeviceToken`
  - 在注册和登录 function 中添加 `push_notification_add`
  - 在登出 function 中添加 `push_notification_remove`

- **useNativeMobileBack.jsx**
  - 移除包含如下内容的 useEffect ：
    ```js
    await CapacitorApp.addListener("backButton", ...)
    ```
  - 在 app.jsx 中添加 `useNativeMobileBack`

---

## cross-platform-navigate

- 移除所有原生调用，使用统一 `tool/cross-platform-navigate`：
  - `window.open` → `openNewTabCrossPlatform`
  - `window.location.replace` / `window.location.href` → `crossPlatformNavigate`

---

## i18n-init

- 在 app.jsx：
  - 使用 `useI18nInit`
- 移除：
  - 所有 `i18n global instance` import
  - 包含如下内容的一整个部分：
    - `const langModules = import.meta.glob("./../../lng/*.json", { eager: true });`

---

## main-page

- 在 app.jsx 中：
  - 移除监听输入框滚轮事件的 useEffect：
    ```js
    window.addEventListener("wheel", handleWheel);
    ```
- 替换为：
  - `usePreventNumberInputWheel`

---

## navigate

- 替换：
  - 所有 `navigate` 调用 → 使用统一 `tool/navigate`
  - 所有 `usePathname` 调用 → 使用统一 `tool/navigate`

---

## popup-manager

- 替换：
  - `PopupManager` → 使用统一 `tool/popup-manager`
  - 所有 `openPopup` → 使用统一 `tool/popup-manager`
  - 所有 `openPopupAsDialog` → 使用统一 `tool/popup-manager`

---

## preferences

- 替换：

  - 所有使用以下函数的地方 → 使用统一 `tool/preferences`：

    ```js
    saveToken,
      loadToken,
      deleteToken,
      saveUser,
      loadUser,
      deleteUser,
      getNavigateData,
      setNavigateData,
      removeNavigateDataKey,
      setLanguage,
      getLanguage,
      getUserInGameDetail,
      setUserInGameDetail,
      deleteUserInGameDetail,
      saveReferralCode,
      loadReferralCode,
      deleteReferralCode,
      setChatroomChannel,
      getChatroomChannel;
    ```

---

## qr-scanner

- （待补充具体迁移步骤）

---

## safe-open-link-in-dialog

- 移除旧的 `preProcessHtml` / `preProcess`
- 移除包含如下内容的 useEffect ：

  ```js
  e.target.closest("a[data-href]");
  ```

- 替换为：
  - `preProcessHtml`
  - `useSafeOpenLinksInDialog(containerRef)`

---

## tab-channel-message

- （待补充具体迁移步骤）

---

## toast

- 替换：
  - 所有 `show_toast` → 使用统一 `tool/toast`

---

## dialog

- 注意：
  - 现已兼容 Swal
- 替换：
  - `DialogManager` → 使用统一 `tool/dialog`
  - 所有 `open_message`、`open_confirm_message`、`open_dialog_component` → 使用统一 `tool/dialog`
