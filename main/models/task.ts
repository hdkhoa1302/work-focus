import { Schema, model } from 'mongoose';

const TaskSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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

// Index for better query performance
TaskSchema.index({ userId: 1, status: 1 });
TaskSchema.index({ userId: 1, createdAt: -1 });

export const TaskModel = model('Task', TaskSchema);