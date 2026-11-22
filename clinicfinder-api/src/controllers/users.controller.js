import * as usersService from '../services/users.service.js';

export async function list(req, res) {
  const { page, pageSize, ...filters } = req.validatedQuery;
  res.json(await usersService.list(filters, { page, pageSize }));
}

export async function getOne(req, res) {
  res.json(await usersService.getById(req.params.id));
}

export async function getMe(req, res) {
  res.json(await usersService.getById(req.user.id));
}

export async function updateMe(req, res) {
  res.json(await usersService.updateMe(req.user.id, req.body));
}

// Returns { message, token }: the old token stops working, the frontend stores the new one
export async function changePassword(req, res) {
  res.json(await usersService.changePassword(req.user.id, req.body, { remember: req.user.remember }));
}

export async function updateStatus(req, res) {
  const user = await usersService.updateStatus(req.user.id, req.params.id, req.body);
  req.log.info({ targetUserId: user.id, status: user.status }, 'account status changed');
  res.json(user);
}

export async function remove(req, res) {
  await usersService.remove(req.user.id, req.params.id);
  req.log.info({ targetUserId: req.params.id }, 'account deleted');
  res.sendStatus(204);
}

export async function deactivateMe(req, res) {
  await usersService.deactivateMe(req.user.id, req.body);
  req.log.info({ userId: req.user.id }, 'account deactivated by its owner');
  res.sendStatus(204);
}
