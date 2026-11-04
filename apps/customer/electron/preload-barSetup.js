const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("barSetup", {
    save: (barId) => {
        ipcRenderer.send("bar-setup-save", barId);
    },
});