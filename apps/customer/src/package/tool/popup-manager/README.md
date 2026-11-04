# popup-manager

A self-contained popup manager for React + Framework7 projects.  
Supports multiple simultaneous popups, custom dialogs, and shared data using Recoil.

---

## 📦 Required dependencies

This tool relies on the following packages in your project:

- react
- recoil
- recoil-nexus
- framework7
- framework7-react
- nanoid
- react-i18next

Install them via npm:

```bash
npm install react recoil recoil-nexus framework7 framework7-react nanoid react-i18next
```

# popup-manager

A self-contained popup manager for React + Framework7 projects.  
Supports multiple simultaneous popups, custom dialogs, and shared data using Recoil.

---

## 📦 Required dependencies

This tool relies on the following packages in your project:

- react
- recoil
- recoil-nexus
- framework7
- framework7-react
- nanoid
- react-i18next

Install them via npm:

> npm install react recoil recoil-nexus framework7 framework7-react nanoid react-i18next

or via yarn:

> yarn add react recoil recoil-nexus framework7 framework7-react nanoid react-i18next

📁 Usage

1. Copy the popup-manager folder into your project.
2. Make sure your project has the dependencies installed.
3. Import and render the PopupManager at the top level of your app:

---

```jsx
import { PopupManager } from "./popup-manager";

function App() {
  return (
    <>
      <PopupManager />
      {/* Rest of your app */}
    </>
  );
}
```

4. Open popups from anywhere in your app:

```jsx
import { openPopup } from "./popup-manager";

openPopup({
  title: "My Popup",
  component: ({ onSubmit }) => (
    <div>
      <h2>Popup Content</h2>
      <button onClick={() => onSubmit(true)}>Close</button>
    </div>
  ),
});
```

---

5. when you using openPopupAsDialog :

find your scss file includes:

```jsx
 ******
 .dialog{
  ******
 }
```

add className .custom-dialog like:

```jsx
 ******
 .dialog , .custom-dialog{
  ******
 }
```

---

🛠 Features
Multiple popups at the same time.
Supports mobile dialogs and full-screen popups.
Optional headers with back buttons and custom right-side components.
Shared data across popups via syncId.
Fully self-contained: components, state, styles.

⚠️ Notes

- PopupManager must be mounted once at the top level of your app.
- Requires a React + Framework7 environment.
- No TypeScript is required.
