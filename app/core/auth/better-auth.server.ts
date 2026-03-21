import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { authAccounts, authSessions, authVerifications, users } from "@/core/db/schema";
import type { Env } from "./session.server";
import bcrypt from "bcryptjs";

const betterAuthSchema = {
  user: users,
  account: authAccounts,
  session: authSessions,
  verification: authVerifications,
};

function getAuthOrigin(request: Request) {
  return new URL(request.url).origin;
}

async function sendResetPasswordEmail(
  env: Env,
  email: string,
  resetUrl: string,
) {
  if (!env.RESEND_API_KEY) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "noreply@verein-connect.de",
      to: [email],
      subject: "Passwort zurücksetzen – Verein Connect",
      html: `<p>Klicke auf folgenden Link, um dein Passwort zurückzusetzen:</p>
             <p><a href="${resetUrl}">Passwort zurücksetzen</a></p>
             <p>Der Link ist 1 Stunde gültig.</p>`,
    }),
  });
}

export function getBetterAuth(request: Request, env: Env) {
  if (!env.DB) {
    throw new Error("DB-Binding fehlt. Better Auth benötigt eine Datenbank.");
  }
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET fehlt.");
  }

  const db = drizzle(env.DB, { schema: betterAuthSchema });
  const origin = getAuthOrigin(request);

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: betterAuthSchema,
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: origin,
    basePath: "/api/auth",
    trustedOrigins: Array.from(new Set([origin, env.FRONTEND_URL].filter(Boolean))),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      revokeSessionsOnPasswordReset: true,
      password: {
        hash: async (password: string) => {
          return bcrypt.hash(password, 12);
        },
        verify: async ({ hash, password }: { hash: string; password: string }) => {
          return bcrypt.compare(password, hash);
        },
      },
      sendResetPassword: async ({ user, url }) => {
        await sendResetPasswordEmail(env, user.email, url);
      },
    },
    user: {
      fields: {
        name: "firstName",
        image: "avatarUrl",
        emailVerified: "emailVerified",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
      },
    },
    account: {
      fields: {
        accountId: "accountId",
        providerId: "providerId",
        userId: "userId",
        password: "passwordHash",
        accessToken: "accessToken",
        refreshToken: "refreshToken",
        idToken: "idToken",
        accessTokenExpiresAt: "accessTokenExpiresAt",
        refreshTokenExpiresAt: "refreshTokenExpiresAt",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
      },
    },
    session: {
      fields: {
        token: "token",
        userId: "userId",
        expiresAt: "expiresAt",
        ipAddress: "ipAddress",
        userAgent: "userAgent",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
      },
    },
    verification: {
      fields: {
        identifier: "identifier",
        value: "value",
        expiresAt: "expiresAt",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
      },
    },
  });
}

type AuthRequestInit = {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
};

export async function sendBetterAuthRequest(
  request: Request,
  env: Env,
  path: string,
  init: AuthRequestInit = {},
) {
  const headers = new Headers(request.headers);
  if (init.headers) {
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  }

  if (!headers.has("origin")) {
    headers.set("origin", getAuthOrigin(request));
  }

  headers.delete("content-length");

  const url = new URL(`/api/auth${path}`, request.url);
  const authRequest = new Request(url, {
    method: init.method ?? "GET",
    headers,
    body: init.body ?? null,
  });

  return getBetterAuth(request, env).handler(authRequest);
}
