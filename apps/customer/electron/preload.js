const { contextBridge, ipcRenderer } = require("electron");

//Gift.exe
const { contextBridge } = require("electron");
const WebSocket = require("ws");

const ws = new WebSocket("ws://127.0.0.1:8080");

contextBridge.exposeInMainWorld("electronAPI", {

    sendAnimation: (animation) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: "play-animation",
                animation: animation
            }));
        } else {
            console.log("WebSocket not connected");
        }
    }

});