import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import { TaskModel } from './models/task';
import { SessionModel } from './models/session';
import { ConfigModel } from './models/config';

export function setupAPI() {
  const app = express();
  const port = process.env.API_PORT || 3000;

  app.use(cors());
  app.use(bodyParser.json());

  // Tasks CRUD
  app.get('/api/tasks', async (req, res) => {
    const tasks = await TaskModel.find();
    res.json(tasks);
  });

  app.post('/api/tasks', async (req, res) => {
    const task = new TaskModel(req.body);
    await task.save();
    res.json(task);
  });

  app.put('/api/tasks/:id', async (req, res) => {
    const task = await TaskModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(task);
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    await TaskModel.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  });

  // Sessions
  app.get('/api/sessions', async (req, res) => {
    const sessions = await SessionModel.find();
    res.json(sessions);
  });

  app.post('/api/sessions', async (req, res) => {
    const session = new SessionModel(req.body);
    await session.save();
    res.json(session);
  });

  // Config
  app.get('/api/config', async (req, res) => {
    let config = await ConfigModel.findOne();
    if (!config) {
      config = new ConfigModel({});
      await config.save();
    }
    res.json(config);
  });

  app.post('/api/config', async (req, res) => {
    let config = await ConfigModel.findOne();
    if (config) {
      Object.assign(config, req.body);
      await config.save();
    } else {
      config = new ConfigModel(req.body);
      await config.save();
    }
    res.json(config);
  });

  app.listen(port, () => {
    console.log(`🌐 API server listening on http://localhost:${port}`);
  });
} 