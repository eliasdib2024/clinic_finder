// Admin endpoints of clinicfinder-api: doctor applications.
// The list comes from the database (GET /doctors), so every admin, on any browser, sees the same applications.
import { http } from '../http';
import { translated } from './authApi';
import { mirrorDoctorApplications } from './bridge';

/** Applications with this status ('pending' | 'approved' | 'rejected' | 'all'), oldest first. Returns browser doctor ids. */
export async function listDoctorApplications(status = 'pending') {
  try {
    const query = status === 'all' ? '' : `verification=${status}&`;
    const { items } = await http.get(`/doctors?${query}pageSize=100`);
    return await mirrorDoctorApplications(items);
  } catch (err) { throw translated(err); }
}

/** Approve or reject one application (apiDoctorId = the doctor's id in the database). */
export async function reviewDoctorApplication(apiDoctorId, status, reason) {
  try {
    const body = status === 'rejected' ? { status, reason: String(reason).trim() } : { status };
    const application = await http.patch(`/doctors/${apiDoctorId}/verification`, body);
    const [doctorId] = await mirrorDoctorApplications([application]);
    return doctorId;
  } catch (err) { throw translated(err); }
}
