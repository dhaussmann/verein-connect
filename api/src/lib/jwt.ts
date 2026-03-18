import { importPKCS8, importSPKI, SignJWT, jwtVerify } from 'jose';
import type { JwtPayload } from '../types/bindings';

const ALG = 'EdDSA';

export async function createAccessToken(
  payload: Omit<JwtPayload, 'iss' | 'iat' | 'exp'>,
  privateKeyPem: string,
  issuer: string,
): Promise<string> {
  const privateKey = await importPKCS8(privateKeyPem, ALG);
  return new SignJWT({
    sub: payload.sub,
    org: payload.org,
    roles: payload.roles,
    permissions: payload.permissions,
  })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setIssuer(issuer)
    .setExpirationTime('15m')
    .sign(privateKey);
}

export async function createRefreshToken(): Promise<string> {
  return crypto.randomUUID();
}

export async function verifyAccessToken(
  token: string,
  publicKeyPem: string,
  issuer: string,
): Promise<JwtPayload> {
  const publicKey = await importSPKI(publicKeyPem, ALG);
  const { payload } = await jwtVerify(token, publicKey, { issuer });
  return payload as unknown as JwtPayload;
}
