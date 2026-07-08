export interface AuthUser {
  id: string;
  username: string;
  tenantId: string;
  tenantCode: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
}

export interface LoginRequest {
  tenantCode: string;
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  user: AuthUser;
}
