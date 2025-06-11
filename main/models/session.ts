import { Schema, model } from 'mongoose';

const SessionSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    type: { type: String, enum: ['focus', 'break'], required: true },
    startTime: { type: Date, required: true },
    endTime: Date,
    duration: Number,
  },
  { timestamps: false }
);

export const SessionModel = model('Session', SessionSchema); 