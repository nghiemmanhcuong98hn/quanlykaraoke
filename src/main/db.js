const mongoose = require('mongoose')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })

const roomTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  defaultPrice: { type: Number, default: 0 }
}, {
  timestamps: true,
  toObject: { virtuals: true },
  toJSON: { virtuals: true }
})

const recordSchema = new mongoose.Schema({
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, default: null }
})

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  pricePerHour: { type: Number, default: 0 },
  roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', default: null },
  records: [recordSchema]
}, {
  timestamps: true,
  toObject: { virtuals: true },
  toJSON: { virtuals: true }
})

const Room = mongoose.model('Room', roomSchema)
const RoomType = mongoose.model('RoomType', roomTypeSchema)

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

module.exports = { connectDB, Room, RoomType }
