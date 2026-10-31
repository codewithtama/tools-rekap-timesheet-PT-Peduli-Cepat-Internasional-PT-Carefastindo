/**
 * Electron Preload Script
 * Provides a secure, context-isolated bridge between Electron and renderer.
 */
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
});

