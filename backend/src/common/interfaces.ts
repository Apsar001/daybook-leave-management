import { Role } from './enums';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  teamId: string | null;
  managerId: string | null;
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  teamId: string | null;
  managerId: string | null;
  teamName?: string | null;
}

export interface CurrentUserRequest {
  user: AuthenticatedUser;
}
