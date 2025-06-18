import { Schema, model } from 'mongoose';

const SessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    type: { type: String, enum: ['focus', 'break'], required: true },
    startTime: { type: Date, required: true },
    endTime: Date,
    duration: Number,
  },
  { timestamps: false }
);

// Index for better query performance
SessionSchema.index({ userId: 1, startTime: -1 });
SessionSchema.index({ userId: 1, taskId: 1 });

export const SessionModel = model('Session', SessionSchema);