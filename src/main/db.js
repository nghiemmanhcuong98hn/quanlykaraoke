const mongoose = require('mongoose')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
    stock: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
  }
)

const importRecordSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    quantity: { type: Number, required: true },
    importPrice: { type: Number, default: 0 },
    importDate: { type: Date, default: Date.now },
    note: { type: String, default: '' }
  },
  {
    timestamps: true
  }
)

const roomTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    defaultPrice: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
  }
)

const recordItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  name: { type: String, required: true },
  price: { type: Number, default: 0 },
  quantity: { type: Number, default: 1 }
})

const recordSchema = new mongoose.Schema({
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, default: null },
  items: [recordItemSchema]
})

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    pricePerHour: { type: Number, default: 0 },
    roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', default: null },
    records: [recordSchema]
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
  }
)

const Room = mongoose.model('Room', roomSchema)
const RoomType = mongoose.model('RoomType', roomTypeSchema)
const Item = mongoose.model('Item', itemSchema)
const ImportRecord = mongoose.model('ImportRecord', importRecordSchema)

async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI
    if (!uri) throw new Error('MONGODB_URI is not defined in .env')
    await mongoose.connect(uri)
    console.log('Successfully connected to MongoDB Atlas')
  } catch (err) {
    console.error('Failed to connect to MongoDB Atlas:', err)
  }
}

module.exports = { connectDB, Room, RoomType, Item, ImportRecord }
