import { Schema, model } from 'mongoose';

interface Project {
  name: string;
  userId: Schema.Types.ObjectId;
  createdAt?: Date;
  completed?: boolean;
  status: 'todo' | 'in-progress' | 'done';
  deadline?: Date;
  estimatedHours?: number;
  actualHours?: number;
  description?: string;
  priority?: number;
}

const ProjectSchema = new Schema<Project>(
  {
    name: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    completed: { type: Boolean, default: false },
    status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
    deadline: { type: Date },
    estimatedHours: { type: Number, default: 0 },
    actualHours: { type: Number, default: 0 },
    description: { type: String, default: '' },
    priority: { type: Number, default: 1, min: 1, max: 3 }
  }
);

// Index for better query performance
ProjectSchema.index({ userId: 1, createdAt: -1 });
ProjectSchema.index({ userId: 1, deadline: 1 });

export const ProjectModel = model<Project>('Project', ProjectSchema);