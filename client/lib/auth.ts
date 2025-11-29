// lib/auth.ts
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

type JwtPayload = {
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier": string;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": string;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": string;
  exp: number;
};

export async function getUserFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get('jwt')?.value;

  if (!token) return null;

  try {
    const payload: JwtPayload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const user = {
      id: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"],
      email: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"],
      role: payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
    };
    return user as { id: string; role: string; email: string };
  } catch (e) {
    return null;
  }
}
