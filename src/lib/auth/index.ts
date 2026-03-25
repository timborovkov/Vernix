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

// Google OAuth (if configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

// GitHub OAuth (if configured)
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    })
  );
}

// Credentials (email/password)
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

      // SSO-only user attempting credentials login
      if (!user.passwordHash) return null;

      const valid = await compare(password, user.passwordHash);
      if (!valid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  })
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    jwt: authConfig.callbacks!.jwt!,
    session: authConfig.callbacks!.session!,
    async signIn({ user, account, profile }) {
      // Credentials provider — already handled by authorize()
      if (account?.provider === "credentials") return true;

      // OAuth providers
      if (!account || !user.email) return false;

      const email = user.email;
      const providerAccountId = account.providerAccountId;

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
        // Already linked — allow sign-in
        user.id = existingAccount.userId;
        return true;
      }

      // Check if a user with this email already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (existingUser) {
        // Auto-link for Google (email always verified) and for any provider
        // when the user is already authenticated (linking from settings page).
        // GitHub sign-in with unlinked email → redirect to error page.
        const isGoogleVerified = account.provider === "google";
        // If user.id is already set by NextAuth, the user has an active session
        // (linking flow from settings). Allow linking for any provider.
        const isLinkingFromSession = user.id && user.id === existingUser.id;

        if (isGoogleVerified || isLinkingFromSession) {
          await db.insert(accounts).values({
            userId: existingUser.id,
            provider: account.provider,
            providerAccountId,
            accessToken: account.access_token ?? null,
            refreshToken: account.refresh_token ?? null,
            expiresAt: account.expires_at ?? null,
          });
          user.id = existingUser.id;
          user.image =
            existingUser.image ??
            (profile as { picture?: string } | undefined)?.picture ??
            (profile as { avatar_url?: string } | undefined)?.avatar_url ??
            null;
          return true;
        }

        // Non-Google provider sign-in without existing link: don't auto-link
        return "/login?error=AccountExists";
      }

      // New user — create account
      const image =
        (profile as { picture?: string } | undefined)?.picture ??
        (profile as { avatar_url?: string } | undefined)?.avatar_url ??
        null;

      const [newUser] = await db
        .insert(users)
        .values({
          email,
          name: user.name ?? email.split("@")[0],
          passwordHash: null,
          image,
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
      return true;
    },
  },
});
