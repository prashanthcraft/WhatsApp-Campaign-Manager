import { EmailVerification, TenantInvitation } from '@aimingle/entity';
import logger from '@utils/logger';
import { RequestContext } from '@utils/requestContext';
import { getRepository } from 'typeorm';

export async function getInvitation(
  id: number | string,
): Promise<TenantInvitation | undefined> {
  return getRepository(TenantInvitation)
    .createQueryBuilder('ev')
    .where('id = (:id)::int', { id })
    .getOne();
}

export async function getPendingInvitationByEmail(
  email: string,
): Promise<TenantInvitation | undefined> {
  return getRepository(TenantInvitation).findOne({
    where: {
      email,
      verified: false,
    },
  });
}

export async function removeInvitationByEmail(email: string): Promise<void> {
  await getRepository(TenantInvitation).delete({
    email,
    tenantId: RequestContext.getTenantId(),
  });
}

export type InvitedUser = Pick<TenantInvitation, 'email'> & Partial<TenantInvitation>;

// export async function inviteUser(invitee:InvitedUser):Promise<TenantInvitation> {
//     try {
//         logger.debug(`Sending invitaion `)
//     } catch (error) {
        
//     }
    
// }