const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods via contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
      // Window controls
      minimize: () => ipcRenderer.send('window:minimize'),
      maximize: () => ipcRenderer.send('window:maximize'),
      close: () => ipcRenderer.send('window:close'),

      // App info
      getVersion: () => ipcRenderer.invoke('app:get-version'),

      // Generic IPC (send/receive pattern)
      send: (channel, ...args) => {
            const allowedChannels = ['app:action']
            if (allowedChannels.includes(channel)) {
                  ipcRenderer.send(channel, ...args)
            }
      },

      on: (channel, callback) => {
            const allowedChannels = ['app:response']
            if (allowedChannels.includes(channel)) {
                  const subscription = (_event, ...args) =>
                        callback(...args)
                  ipcRenderer.on(channel, subscription)
                  return () =>
                        ipcRenderer.removeListener(
                              channel,
                              subscription
                        )
            }
      },

      invoke: (channel, ...args) => {
            const allowedChannels = [
                  'app:get-version',
                  'db:get-data',
                  'db:save-room',
                  'db:delete-room',
                  'db:check-in',
                  'db:check-out',
                  'db:delete-record',
                  'db:save-room-type',
                  'db:delete-room-type',
                  'db:apply-global-price',
                  'db:apply-type-price',
                  'db:save-item',
                  'db:delete-item',
                  'db:add-record-item',
                  'db:remove-record-item',
                  'db:update-record-item',
                  'db:update-record-times'
            ]
            if (allowedChannels.includes(channel)) {
                  return ipcRenderer.invoke(channel, ...args)
            }
      }
})
