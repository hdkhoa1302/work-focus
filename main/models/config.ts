import { Schema, model } from 'mongoose';

const ConfigSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pomodoro: {
      focus: { type: Number, default: 25 },
      break: { type: Number, default: 5 },
    },
    blockList: {
      hosts: { type: [String], default: [] },
      apps: { type: [String], default: [] },
    },
    notifications: {
      enabled: { type: Boolean, default: true },
      sound: { type: Boolean, default: true },
    },
    workSchedule: {
      hoursPerDay: { type: Number, default: 8 },
      daysPerWeek: { type: Number, default: 5 },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' },
      breakHours: { type: Number, default: 1 },
      overtimeRate: { type: Number, default: 1.5 }
    },
    mongoUri: String,
  },
  { timestamps: false }
);

// Ensure one config per user
ConfigSchema.index({ userId: 1 }, { unique: true });

export const ConfigModel = model('Config', ConfigSchema);