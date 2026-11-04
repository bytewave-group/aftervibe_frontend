const { contextBridge, ipcRenderer } = require("electron");

console.log("Gift Preload Loaded");

contextBridge.exposeInMainWorld("electronAPI", {

    sendAnimation(animation) {
        ipcRenderer.send("send-animation", animation);
    }

});