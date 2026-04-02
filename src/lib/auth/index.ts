import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import type { Provider } from "next-auth/providers";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { users, accounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { authConfig } from "./config";

// Build providers array conditionally
const providers: Provider[] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    })
  );
}

providers.push(
  Credentials({
    credentials: {
      email: {},
      password: {},
    },
    async authorize(credentials) {
      const email = credentials?.email as string | undefined;
      const password = credentials?.password as string | undefined;

      if (!email || !password) return null;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (!user) return null;
      if (!user.passwordHash) return null;

      const valid = await compare(password, user.passwordHash);
      if (!valid) return null;

      // Track last activity for inactive account detection (fire-and-forget)
      Promise.resolve(
        db
          .update(users)
          .set({ lastActiveAt: new Date() })
          .where(eq(users.id, user.id))
      ).catch(() => {});

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        termsAcceptedAt: user.termsAcceptedAt,
        emailVerifiedAt: user.emailVerifiedAt,
      };
    },
  })
);

/** Extract the OAuth profile image URL from provider-specific fields */
function getOAuthImage(
  profile: Record<string, unknown> | undefined
): string | null {
  if (!profile) return null;
  if (typeof profile.picture === "string") return profile.picture;
  if (typeof profile.avatar_url === "string") return profile.avatar_url;
  return null;
}

/** Check if the OAuth provider guarantees the email is verified.
 *  Google: always verified.
 *  GitHub: the /user endpoint doesn't return email_verified, but GitHub
 *  only exposes the primary email via OAuth scope, and primary emails
 *  must be verified on GitHub. Safe to auto-link. */
function isEmailVerified(provider: string): boolean {
  return provider === "google" || provider === "github";
}

const { callbacks: baseCallbacks = {}, ...restConfig } = authConfig;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...restConfig,
  providers,
  callbacks: {
    ...baseCallbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") return true;
      if (!account || !user.email) return false;

      const email = user.email;
      const providerAccountId = account.providerAccountId;
      const oauthProfile = profile as Record<string, unknown> | undefined;

      // Check if this provider account is already linked
      const [existingAccount] = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.provider, account.provider),
            eq(accounts.providerAccountId, providerAccountId)
          )
        );

      if (existingAccount) {
        // Returning SSO user — load termsAcceptedAt + emailVerifiedAt from DB
        const [dbUser] = await db
          .select({
            termsAcceptedAt: users.termsAcceptedAt,
            emailVerifiedAt: users.emailVerifiedAt,
            image: users.image,
          })
          .from(users)
          .where(eq(users.id, existingAccount.userId));
        user.id = existingAccount.userId;
        user.image = dbUser?.image ?? user.image;
        user.termsAcceptedAt = dbUser?.termsAcceptedAt ?? null;
        user.emailVerifiedAt = dbUser?.emailVerifiedAt ?? null;

        // Track last activity for inactive account detection (fire-and-forget)
        Promise.resolve(
          db
            .update(users)
            .set({ lastActiveAt: new Date() })
            .where(eq(users.id, existingAccount.userId))
        ).catch(() => {});

        return true;
      }

      // Check if a user with this email already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (existingUser) {
        // Only auto-link if the provider guarantees the email is verified
        if (!isEmailVerified(account.provider)) {
          return "/login?error=AccountExists";
        }

        // Link the provider to the existing user (ignore if already linked via race condition)
        await db
          .insert(accounts)
          .values({
            userId: existingUser.id,
            provider: account.provider,
            providerAccountId,
            accessToken: account.access_token ?? null,
            refreshToken: account.refresh_token ?? null,
            expiresAt: account.expires_at ?? null,
          })
          .onConflictDoNothing();
        user.id = existingUser.id;

        // Persist OAuth avatar and mark email verified if not already
        const oauthImage = getOAuthImage(oauthProfile);
        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (oauthImage && !existingUser.image) updates.image = oauthImage;
        if (!existingUser.emailVerifiedAt) updates.emailVerifiedAt = new Date();
        if (Object.keys(updates).length > 1) {
          await db
            .update(users)
            .set(updates)
            .where(eq(users.id, existingUser.id));
        }
        user.image = existingUser.image ?? oauthImage;
        user.termsAcceptedAt = existingUser.termsAcceptedAt ?? null;
        user.emailVerifiedAt =
          existingUser.emailVerifiedAt ??
          (updates.emailVerifiedAt as Date) ??
          null;

        // Track last activity for inactive account detection (fire-and-forget)
        Promise.resolve(
          db
            .update(users)
            .set({ lastActiveAt: new Date() })
            .where(eq(users.id, existingUser.id))
        ).catch(() => {});

        return true;
      }

      // New user — create account
      const image = getOAuthImage(oauthProfile);
      const providerVerified = isEmailVerified(account.provider);

      const [newUser] = await db
        .insert(users)
        .values({
          email,
          name: user.name ?? email.split("@")[0],
          passwordHash: null,
          image,
          ...(providerVerified && { emailVerifiedAt: new Date() }),
        })
        .returning({ id: users.id });

      await db.insert(accounts).values({
        userId: newUser.id,
        provider: account.provider,
        providerAccountId,
        accessToken: account.access_token ?? null,
        refreshToken: account.refresh_token ?? null,
        expiresAt: account.expires_at ?? null,
      });

      user.id = newUser.id;
      user.image = image;
      user.termsAcceptedAt = null; // new OAuth user, terms not yet accepted
      user.emailVerifiedAt = providerVerified ? new Date() : null;
      return true;
    },
    async jwt({ token, user, trigger }) {
      // Delegate to base callback for initial sign-in
      const base =
        (baseCallbacks.jwt
          ? await baseCallbacks.jwt({ token, user, trigger } as Parameters<
              NonNullable<typeof baseCallbacks.jwt>
            >[0])
          : token) ?? token;

      // On session update, re-read termsAcceptedAt + emailVerifiedAt from DB
      if (trigger === "update" && base.id) {
        const [dbUser] = await db
          .select({
            termsAcceptedAt: users.termsAcceptedAt,
            emailVerifiedAt: users.emailVerifiedAt,
          })
          .from(users)
          .where(eq(users.id, base.id as string));
        if (dbUser) {
          base.termsAcceptedAt = dbUser.termsAcceptedAt
            ? dbUser.termsAcceptedAt.toISOString()
            : null;
          base.emailVerifiedAt = dbUser.emailVerifiedAt
            ? dbUser.emailVerifiedAt.toISOString()
            : null;
        }
      }

      return base;
    },
  },
});
