import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema(
  {
    _id: String,
    author_id: { type: String, ref: 'User', required: true, index: true },
    details: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { versionKey: false },
);

export const Book = mongoose.model('Book', bookSchema);
