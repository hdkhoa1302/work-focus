import { Schema, model } from 'mongoose';

const ConfigSchema = new Schema(
  {
    pomodoro: {
      focus: { type: Number, default: 25 },
      break: { type: Number, default: 5 },
    },
    blockList: {
      hosts: { type: [String], default: [] },
      apps: { type: [String], default: [] },
    },
    mongoUri: String,
  },
  { timestamps: false }
);

export const ConfigModel = model('Config', ConfigSchema); 