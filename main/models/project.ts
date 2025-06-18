import { Schema, model } from 'mongoose';

interface Project {
  name: string;
  userId: Schema.Types.ObjectId;
  createdAt?: Date;
  completed?: boolean;
  status: 'todo' | 'in-progress' | 'done';
}

const ProjectSchema = new Schema<Project>(
  {
    name: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    completed: { type: Boolean, default: false },
    status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' }
  }
);

// Index for better query performance
ProjectSchema.index({ userId: 1, createdAt: -1 });

export const ProjectModel = model<Project>('Project', ProjectSchema); 