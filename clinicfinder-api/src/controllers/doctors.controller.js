import * as doctorsService from '../services/doctors.service.js';

export async function register(req, res) {
  const session = await doctorsService.register(req.body);
  req.log.info({ userId: session.user.id, doctorId: session.user.doctor.id }, 'doctor account created');
  res.status(201).location(`/api/v1/doctors/${session.user.doctor.id}`).json(session);
}

export async function list(req, res) {
  const { page, pageSize, ...filters } = req.validatedQuery;
  res.json(await doctorsService.list(filters, { page, pageSize }));
}

export async function getOne(req, res) {
  res.json(await doctorsService.getById(req.params.id));
}

export async function review(req, res) {
  const doctor = await doctorsService.review(req.user.id, req.params.id, req.body);
  req.log.info({ doctorId: doctor.id, status: doctor.verification.status }, 'doctor application reviewed');
  res.json(doctor);
}
