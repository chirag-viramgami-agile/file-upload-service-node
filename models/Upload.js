const mongoose = require("mongoose");

const UploadSchema = new mongoose.Schema({
  uploadId: { type: String, unique: true },

  filename: String,
  filepath: String,

  size: Number,
  chunkSize: Number,
  totalChunks: Number,

  uploadedChunks: {
    type: [Number],
    default: []
  },
  
  status: {
    type:String,
    default:"uploading",
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
});

module.exports = mongoose.model("Upload", UploadSchema);