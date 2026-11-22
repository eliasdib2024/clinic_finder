// lookups.service.js – reference data for the forms
import * as lookupsRepository from '../repositories/lookups.repository.js';

export async function getAll() {
  const { specialties, governorates, insurances, bloodTypes, languages, genders, clinics } = await lookupsRepository.findAll();
  return {
    specialties: specialties.map(({ id, name, icon }) => ({ id, name, icon })),
    governorates: governorates.map((g) => ({ id: g.id, name: g.name, cities: g.cities.map(({ id, name }) => ({ id, name })) })),
    insurances: insurances.map(({ id, name }) => ({ id, name })),
    bloodTypes: bloodTypes.map(({ id, name }) => ({ id, name })),
    languages: languages.map(({ id, name }) => ({ id, name })),
    genders: genders.map(({ id, desc }) => ({ id, name: desc })),
    clinics: clinics.map((c) => ({
      id: c.id, name: c.name, type: c.clinicType.desc, address: c.address, phone: c.phone,
      city: { id: c.city.id, name: c.city.name }, governorate: { id: c.city.governorate.id, name: c.city.governorate.name },
    })),
  };
}
