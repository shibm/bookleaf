import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    ticket_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true,
    },
    user_id: { type: String, ref: 'User', required: true },
    body: { type: String, required: true, maxLength: 10000 },
    internal: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

export const Message = mongoose.model('Message', messageSchema);
