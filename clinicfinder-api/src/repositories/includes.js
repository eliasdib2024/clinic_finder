// includes.js – what to load with a user so the API can return the full profile in one query
export const USER_PROFILE_INCLUDE = {
  gender: true,
  patient: {
    include: {
      city: { include: { governorate: true } },
      bloodType: true,
      insurance: true,
      allergies: { orderBy: { id: 'asc' } },
    },
  },
  doctor: {
    include: {
      specialty: true,
      city: { include: { governorate: true } },
    },
  },
};
