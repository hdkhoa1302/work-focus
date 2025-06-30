const { Schema, model } = require('mongoose');

const ProjectSchema = new Schema(
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

const ProjectModel = model('Project', ProjectSchema);

module.exports = { ProjectModel }; 