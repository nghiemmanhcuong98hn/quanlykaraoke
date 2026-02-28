const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const { connectDB, Room, RoomType, Item } = require('./db')

const isDev = process.argv.includes('--dev')

let mainWindow = null

async function createWindow() {
  await connectDB()

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    show: false
  })

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))
  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.on('closed', () => (mainWindow = null))
}

// ─── IPC Handlers ───────────────────────────────────────────
ipcMain.handle('db:get-data', async () => {
  const rooms = await Room.find().lean()
  const roomTypes = await RoomType.find().lean()
  const items = await Item.find().lean()
  return {
    rooms: rooms.map(r => ({
      ...r,
      id: r._id.toString(),
      roomTypeId: r.roomTypeId?.toString(),
      records: r.records.map(rec => ({
        ...rec,
        _id: rec._id.toString(),
        items: (rec.items || []).map(ri => ({
          ...ri,
          _id: ri._id.toString(),
          itemId: ri.itemId?.toString()
        }))
      }))
    })),
    roomTypes: roomTypes.map(t => ({ ...t, id: t._id.toString() })),
    items: items.map(i => ({ ...i, id: i._id.toString() }))
  }
})

ipcMain.handle('db:save-room', async (event, data) => {
  let result
  if (data.id && data.id.length === 24) {
    result = await Room.findByIdAndUpdate(data.id, {
      name: data.name,
      pricePerHour: data.pricePerHour,
      roomTypeId: data.roomTypeId || null
    }, { new: true })
  } else {
    const room = new Room({
      name: data.name,
      pricePerHour: data.pricePerHour,
      roomTypeId: data.roomTypeId || null,
      records: []
    })
    result = await room.save()
  }
  return result ? result.toObject() : null
})

ipcMain.handle('db:delete-room', async (event, id) => {
  const result = await Room.findByIdAndDelete(id)
  return result ? result.toObject() : null
})

ipcMain.handle('db:check-in', async (event, roomId) => {
  const room = await Room.findById(roomId)
  room.records.push({ checkIn: new Date(), checkOut: null })
  const result = await room.save()
  return result.toObject()
})

ipcMain.handle('db:check-out', async (event, roomId) => {
  const room = await Room.findById(roomId)
  const active = room.records.find(r => !r.checkOut)
  if (active) {
    active.checkOut = new Date()
    const result = await room.save()
    return result.toObject()
  }
  return null
})

ipcMain.handle('db:delete-record', async (event, { roomId, recordId }) => {
  const room = await Room.findById(roomId)
  room.records = room.records.filter(r => r._id.toString() !== recordId)
  const result = await room.save()
  return result.toObject()
})

ipcMain.handle('db:save-room-type', async (event, data) => {
  let result
  if (data.id && data.id.length === 24) {
    result = await RoomType.findByIdAndUpdate(data.id, {
      name: data.name,
      defaultPrice: data.defaultPrice
    }, { new: true })
  } else {
    const type = new RoomType({ name: data.name, defaultPrice: data.defaultPrice })
    result = await type.save()
  }
  return result ? result.toObject() : null
})

ipcMain.handle('db:delete-room-type', async (event, id) => {
  await Room.updateMany({ roomTypeId: id }, { roomTypeId: null })
  const result = await RoomType.findByIdAndDelete(id)
  return result ? result.toObject() : null
})

ipcMain.handle('db:apply-type-price', async (event, { typeId, price }) => {
  await RoomType.findByIdAndUpdate(typeId, { defaultPrice: price })
  const result = await Room.updateMany({ roomTypeId: typeId }, { pricePerHour: price })
  return { success: true, modifiedCount: result.modifiedCount }
})

ipcMain.handle('db:apply-global-price', async (event, price) => {
  const result = await Room.updateMany({}, { pricePerHour: price })
  return { success: true, modifiedCount: result.modifiedCount }
})

// ─── Item Handlers ──────────────────────────────────────────
ipcMain.handle('db:save-item', async (event, data) => {
  let result
  if (data.id && data.id.length === 24) {
    result = await Item.findByIdAndUpdate(data.id, {
      name: data.name,
      price: data.price,
      category: data.category || ''
    }, { new: true })
  } else {
    const item = new Item({
      name: data.name,
      price: data.price,
      category: data.category || ''
    })
    result = await item.save()
  }
  return result ? result.toObject() : null
})

ipcMain.handle('db:delete-item', async (event, id) => {
  const result = await Item.findByIdAndDelete(id)
  return result ? result.toObject() : null
})

ipcMain.handle('db:add-record-item', async (event, { roomId, recordId, itemId, name, price, quantity }) => {
  const room = await Room.findById(roomId)
  const record = room.records.id(recordId)
  if (!record) return null
  const existing = record.items.find(i => i.itemId?.toString() === itemId)
  if (existing) {
    existing.quantity += quantity
  } else {
    record.items.push({ itemId, name, price, quantity })
  }
  const result = await room.save()
  return result.toObject()
})

ipcMain.handle('db:remove-record-item', async (event, { roomId, recordId, recordItemId }) => {
  const room = await Room.findById(roomId)
  const record = room.records.id(recordId)
  if (!record) return null
  record.items = record.items.filter(i => i._id.toString() !== recordItemId)
  const result = await room.save()
  return result.toObject()
})

ipcMain.handle('db:update-record-item', async (event, { roomId, recordId, recordItemId, quantity }) => {
  const room = await Room.findById(roomId)
  const record = room.records.id(recordId)
  if (!record) return null
  const item = record.items.find(i => i._id.toString() === recordItemId)
  if (item) item.quantity = quantity
  const result = await room.save()
  return result.toObject()
})

ipcMain.handle('db:update-record-times', async (event, { roomId, recordId, checkIn, checkOut }) => {
  const room = await Room.findById(roomId)
  const record = room.records.id(recordId)
  if (!record) return null
  if (checkIn) record.checkIn = new Date(checkIn)
  if (checkOut !== undefined) record.checkOut = checkOut ? new Date(checkOut) : null
  const result = await room.save()
  return result.toObject()
})

ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window:close', () => mainWindow?.close())

// ─── App Lifecycle ──────────────────────────────────────────
app.whenReady().then(() => {
  createWindow()
  if (isDev) {
    const rendererPath = path.join(__dirname, '..', 'renderer')
    fs.watch(rendererPath, { recursive: true }, () => mainWindow?.webContents?.reloadIgnoringCache())
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
