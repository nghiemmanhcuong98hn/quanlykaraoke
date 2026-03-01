const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const { connectDB, Room, RoomType, Item, ImportRecord } = require('./db')

const isDev = process.argv.includes('--dev')

let mainWindow = null

async function createWindow() {
  await connectDB()

  const isMac = process.platform === 'darwin'

  const windowOptions = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    show: false
  }

  if (isMac) {
    windowOptions.titleBarStyle = 'hiddenInset'
    windowOptions.trafficLightPosition = { x: 12, y: 10 }
  } else {
    windowOptions.frame = false
    windowOptions.titleBarStyle = 'hidden'
  }

  mainWindow = new BrowserWindow(windowOptions)

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))
  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.on('closed', () => (mainWindow = null))
}

// ─── IPC Handlers ───────────────────────────────────────────
ipcMain.handle('db:get-data', async () => {
  const rooms = await Room.find().lean()
  const roomTypes = await RoomType.find().lean()
  const items = await Item.find().lean()
  const importHistory = await ImportRecord.find()
    .populate('itemId', 'name')
    .sort({ importDate: -1 })
    .limit(100)
    .lean()

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
    items: items.map(i => ({ ...i, id: i._id.toString() })),
    importHistory: importHistory.map(h => ({
      ...h,
      id: h._id.toString(),
      itemId: h.itemId?._id?.toString() || h.itemId?.toString(),
      itemName: h.itemId?.name || 'Sản phẩm đã xóa'
    }))
  }
})

ipcMain.handle('db:save-room', async (event, data) => {
  let result
  if (data.id && data.id.length === 24) {
    result = await Room.findByIdAndUpdate(
      data.id,
      {
        name: data.name,
        pricePerHour: data.pricePerHour,
        roomTypeId: data.roomTypeId || null
      },
      { new: true }
    )
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
    result = await RoomType.findByIdAndUpdate(
      data.id,
      {
        name: data.name,
        defaultPrice: data.defaultPrice
      },
      { new: true }
    )
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
    // Audit stock changes
    const oldItem = await Item.findById(data.id)
    const newStock = data.stock !== undefined ? data.stock : 0
    const diff = newStock - (oldItem?.stock || 0)

    result = await Item.findByIdAndUpdate(
      data.id,
      {
        name: data.name,
        price: data.price,
        stock: newStock
      },
      { new: true }
    )

    if (diff !== 0) {
      const imp = new ImportRecord({
        itemId: data.id,
        quantity: diff,
        importPrice: 0,
        note: `Điều chỉnh số lượng khi sửa thông tin sản phẩm (Diff: ${diff})`
      })
      await imp.save()
    }
  } else {
    // New item
    const item = new Item({
      name: data.name,
      price: data.price,
      stock: data.stock || 0
    })
    result = await item.save()
    
    // Create initial history if stock > 0
    if (item.stock > 0) {
      const imp = new ImportRecord({
        itemId: item._id,
        quantity: item.stock,
        importPrice: 0,
        note: `Nhập tồn đầu kỳ khi tạo sản phẩm`
      })
      await imp.save()
    }
  }
  return result ? result.toObject() : null
})

ipcMain.handle('db:delete-item', async (event, id) => {
  const result = await Item.findByIdAndDelete(id)
  return result ? result.toObject() : null
})

console.log('Main: Registering db:import-items handler')
ipcMain.handle('db:import-items', async (event, { itemId, quantity, importPrice, note }) => {
  // Update Item stock
  await Item.findByIdAndUpdate(itemId, { $inc: { stock: quantity } })
  // Create ImportRecord
  const record = new ImportRecord({
    itemId,
    quantity,
    importPrice,
    note
  })
  const result = await record.save()
  return result.toObject()
})

ipcMain.handle('db:delete-import', async (event, id) => {
  const imp = await ImportRecord.findById(id)
  if (!imp) return null
  
  // Revert stock adjustment
  if (imp.itemId) {
    await Item.findByIdAndUpdate(imp.itemId, { $inc: { stock: -imp.quantity } })
  }
  
  const result = await ImportRecord.findByIdAndDelete(id)
  return result ? result.toObject() : null
})

ipcMain.handle('db:update-import', async (event, { id, itemId, quantity, importPrice, note }) => {
  const imp = await ImportRecord.findById(id)
  if (!imp) return null
  
  // Adjust stock if quantity or itemId changed
  if (imp.itemId.toString() === itemId) {
    const diff = quantity - imp.quantity
    await Item.findByIdAndUpdate(itemId, { $inc: { stock: diff } })
  } else {
    // Item changed? Undo old item stock, add new item stock
    await Item.findByIdAndUpdate(imp.itemId, { $inc: { stock: -imp.quantity } })
    await Item.findByIdAndUpdate(itemId, { $inc: { stock: quantity } })
  }
  
  const result = await ImportRecord.findByIdAndUpdate(id, {
    itemId,
    quantity,
    importPrice,
    note
  }, { new: true })
  
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

  // Decrease stock
  if (itemId) {
    await Item.findByIdAndUpdate(itemId, { $inc: { stock: -quantity } })
  }

  const result = await room.save()
  return result.toObject()
})

ipcMain.handle('db:remove-record-item', async (event, { roomId, recordId, recordItemId }) => {
  const room = await Room.findById(roomId)
  const record = room.records.id(recordId)
  if (!record) return null

  const itemInRecord = record.items.find(i => i._id.toString() === recordItemId)
  if (itemInRecord && itemInRecord.itemId) {
    // Increase stock back
    await Item.findByIdAndUpdate(itemInRecord.itemId, { $inc: { stock: itemInRecord.quantity } })
  }

  record.items = record.items.filter(i => i._id.toString() !== recordItemId)
  const result = await room.save()
  return result.toObject()
})

ipcMain.handle('db:update-record-item', async (event, { roomId, recordId, recordItemId, quantity }) => {
  const room = await Room.findById(roomId)
  const record = room.records.id(recordId)
  if (!record) return null

  const itemInRecord = record.items.find(i => i._id.toString() === recordItemId)
  if (itemInRecord) {
    const diff = quantity - itemInRecord.quantity
    if (itemInRecord.itemId) {
      // Adjust stock (if new qty > old qty, diff is positive, inc -diff = decrease stock)
      await Item.findByIdAndUpdate(itemInRecord.itemId, { $inc: { stock: -diff } })
    }
    itemInRecord.quantity = quantity
  }

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

ipcMain.handle('app:get-platform', () => process.platform)

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
