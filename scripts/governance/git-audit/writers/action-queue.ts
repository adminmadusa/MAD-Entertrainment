import fs from 'fs';
import path from 'path';
import { ActionItem } from '../models/action';

const QUEUE_PATH = '/Users/admin/Desktop/MAD Entertrainment/.agents/action_queue.json';
const METRICS_PATH = '/Users/admin/Desktop/MAD Entertrainment/.agents/repository_metrics.json';

export function writeActionQueue(queue: ActionItem[]): void {
  const dir = path.dirname(QUEUE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2), 'utf8');
}

export function writeRepositoryMetrics(metrics: Record<string, any>): void {
  const dir = path.dirname(METRICS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(METRICS_PATH, JSON.stringify(metrics, null, 2), 'utf8');
}
