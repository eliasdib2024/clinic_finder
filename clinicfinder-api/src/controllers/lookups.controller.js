import * as lookupsService from '../services/lookups.service.js';

export async function getAll(req, res) {
  res.set('Cache-Control', 'public, max-age=300');   // reference data changes rarely
  res.json(await lookupsService.getAll());
}
