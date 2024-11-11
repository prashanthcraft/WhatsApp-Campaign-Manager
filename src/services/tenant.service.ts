import {
  AccessLevel,
  Tenant,
  TenantCompany,
  TenantTeam,
} from "@aimingle/entity";
import { attachTenantId, RequestContext } from "@utils/requestContext";
import { getRepository } from "typeorm";

interface NewTenantOptions {
  displayName: string;
  companyId: number;
  accessLevel: AccessLevel;
}
export async function initializeNewTenant({
  displayName,
  companyId,
  accessLevel = AccessLevel.UNKNOWN,
}: NewTenantOptions): Promise<void> {
  const tenantCompanyRepo = getRepository(TenantCompany);
  const tenantTeamRepo = getRepository(TenantTeam);
  const tenantRepo = getRepository(Tenant);

  let tenantId: number;
  let company: TenantCompany | undefined;
  let defaultTeam: TenantTeam;

  company = await tenantCompanyRepo.findOne({ id: companyId });
  if (company) {
    tenantId = company.tenant.id;
    company = await tenantCompanyRepo.findOne({
      where: { tenantId, isDefault: true },
    });
  } else {
    const tenant = await tenantRepo.save({ displayName });
    tenantId = tenant.id;
    [company, defaultTeam] = await Promise.all([
      tenantCompanyRepo.save({
        displayName,
        accessLevel,
        isDefault: true,
        isDisabled: false,
        companyId,
        tenantId,
      }),
      tenantTeamRepo.save({
        displayName: "Default",
        isDefault: true,
        tenantId,
      }),
    ]);
  }
  attachTenantId(tenantId);
  RequestContext.setValues({
    company: company,
    isImpersonated: false,
  });
}
