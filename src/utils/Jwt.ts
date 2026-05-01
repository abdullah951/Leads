import { SignJWT, jwtVerify } from 'jose';
import { Env } from '@/libs/Env';

const accessSecret = new TextEncoder().encode(Env.JWT_SECRET);
const refreshSecret = new TextEncoder().encode(Env.JWT_REFRESH_SECRET);

export const signAccessToken = async (payload: { userId: string; email: string; role: string }) => {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(accessSecret);
};

export const signRefreshToken = async (payload: { userId: string }) => {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(refreshSecret);
};

export const verifyAccessToken = async (token: string) => {
  const { payload } = await jwtVerify(token, accessSecret);
  return payload as { userId: string; email: string; role: string };
};

export const verifyRefreshToken = async (token: string) => {
  const { payload } = await jwtVerify(token, refreshSecret);
  return payload as { userId: string };
};
