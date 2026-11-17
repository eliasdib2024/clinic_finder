// Reference data that powers every filter and form. Editable by admins.
import { request } from './db';
export const getCatalog = () => request((db) => ({ ...db.catalog, clinics: db.clinics }), { latency: 80 });
