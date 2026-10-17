import { getDashboard as load } from '../services/dashboard.service.js';
export async function getDashboard(req, res) {
  res.json({ data: await load(req.user) });
}
