const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("appShell", {
  closeApp: () => ipcRenderer.send("app:close"),
  minimize: () => ipcRenderer.send("app:minimize"),
  toggleMaximize: () => ipcRenderer.send("app:maximize-toggle"),
  setStartupMode: (payload) => ipcRenderer.send("app:startup-mode", payload)
});
