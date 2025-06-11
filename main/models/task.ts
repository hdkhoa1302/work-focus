import { Schema, model } from 'mongoose';

const TaskSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    tags: { type: [String], default: [] },
    deadline: Date,
    priority: { type: Number, default: 0 },
    status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
    estimatedPomodoros: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const TaskModel = model('Task', TaskSchema); 