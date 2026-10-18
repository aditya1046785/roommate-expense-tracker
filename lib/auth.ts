import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole } from "@/lib/types";

export interface AuthToken {
  userId: string;
  role: UserRole;
}

const ADMIN_COOKIE_NAME = "roommate_admin_token";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function createAuthToken(payload: AuthToken) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifyAuthToken(token: string): Promise<AuthToken | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (typeof payload.userId !== "string" || (payload.role !== "user" && payload.role !== "admin")) {
      return null;
    }
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

export async function getAdminSession() {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifyAuthToken(token);
  return session?.role === "admin" ? session : null;
}

export const adminCookieName = ADMIN_COOKIE_NAME;
