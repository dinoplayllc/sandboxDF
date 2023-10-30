import mongoose from "mongoose";
import md5 from 'md5';
import { Int32 } from "mongodb";

const userSchema = new mongoose.Schema({
    _id: String,
    email: {type: String, unique: true, required: true },
    isVerified: {type: String},
    verificationToken: {type: String },
    username: { type: String, unique: false, required: true },
    password: { type: String, required: true },
});
  

export const UserModel = mongoose.model('User', userSchema);

const motherSchema = new mongoose.Schema({
    mom_id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true
    },
    notes: [String]
  });
export const MotherModel = mongoose.model('mother', motherSchema);

const uniqueIdSchema = new mongoose.Schema({
    collectionName: String, 
    lastId: Number, 
  });
  
export  const UniqueIdModel = mongoose.model('UniqueId', uniqueIdSchema);
  

const fsFilesSchema = new mongoose.Schema({
  length: Number,
  chunkSize: Number,
  uploadDate: Date,
  filename: String,
  contentType: String
})
export const fsFileModel = mongoose.model('pdfs.file', fsFilesSchema)