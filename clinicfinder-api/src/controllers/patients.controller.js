import * as patientsService from '../services/patients.service.js';

export async function register(req, res) {
  const session = await patientsService.register(req.body);
  req.log.info({ userId: session.user.id }, 'patient account created');
  res.status(201).location('/api/v1/patients/me').json(session);
}

export async function getMe(req, res) {
  res.json(await patientsService.getMe(req.user.id));
}

export async function saveHealthProfile(req, res) {
  res.json(await patientsService.saveHealthProfile(req.user.id, req.body));
}

export async function updateHealthProfile(req, res) {
  res.json(await patientsService.updateHealthProfile(req.user.id, req.body));
}
