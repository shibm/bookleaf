import mongoose from 'mongoose';

export const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['author', 'admin'], required: true },
    password_hash: { type: String, required: true, select: false },
    profile: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { versionKey: false },
);

export const User = mongoose.model('User', userSchema);
