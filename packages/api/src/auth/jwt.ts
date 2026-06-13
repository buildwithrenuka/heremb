import { SignJWT, jwtVerify } from 'jose';

const ALG = 'HS256';
const EXPIRY = '7d';

function secret(jwtSecret: string) {
  return new TextEncoder().encode(jwtSecret);
}

export async function signToken(userId: string, jwtSecret: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secret(jwtSecret));
}

export async function verifyToken(token: string, jwtSecret: string): Promise<{ sub?: string }> {
  const { payload } = await jwtVerify(token, secret(jwtSecret));
  return payload as { sub?: string };
}
