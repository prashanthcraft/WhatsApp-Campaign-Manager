import { TenantCompany } from '@aimingle/entity';
import logger from '@utils/logger';
import { getRepository } from 'typeorm';

/**
 * todo: Need to add company domain and company Type setup
 */
interface NewCompany {
  name: string;
  domain?: string;
  domains?: string;

  companyType?: number;
}
export async function createCompany(company: NewCompany) {
  logger.debug(`createCompany: Creating New Company  ${ company }`);
  const newCompanyPayload = {
    name: company.name,
  };
  const companyRepo = getRepository(TenantCompany);
  const {
    generatedMaps: [{ id }],
  } = await companyRepo
    .createQueryBuilder()
    .insert()
    .values(newCompanyPayload)
    .onConflict('(id) DO UPDATE SET updated_at = now()')
    .returning('id')
    .execute();

  return companyRepo.findOneOrFail(id);
}
