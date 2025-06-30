const { Schema, model } = require('mongoose');

const MessageSchema = new Schema({
  from: { type: String, enum: ['user', 'bot'], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ['text', 'project', 'task', 'analysis', 'encouragement', 'note', 'decision', 'whiteboard'], default: 'text' },
  data: { type: Schema.Types.Mixed }
});

const ConversationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  messages: [MessageSchema],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for better query performance
ConversationSchema.index({ userId: 1, createdAt: -1 });
ConversationSchema.index({ userId: 1, isActive: 1 });

const ConversationModel = model('Conversation', ConversationSchema);

module.exports = { ConversationModel }; 