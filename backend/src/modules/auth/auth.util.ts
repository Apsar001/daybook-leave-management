import { createHash, randomUUID } from 'crypto';
import { AuthenticatedUser } from '../../common/interfaces';
import { User } from '../../database/entities/user.entity';

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const newJti = (): string => randomUUID();

export function toUserView(user: User): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    teamId: user.teamId,
    managerId: user.managerId,
    teamName: user.team?.name ?? null,
  };
}
