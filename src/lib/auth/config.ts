import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [],
  trustHost: true,
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.image = user.image ?? null;
        const taa = user.termsAcceptedAt;
        token.termsAcceptedAt = taa
          ? typeof taa === "string"
            ? taa
            : taa.toISOString()
          : null;
        const eva = user.emailVerifiedAt;
        token.emailVerifiedAt = eva
          ? typeof eva === "string"
            ? eva
            : eva.toISOString()
          : null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.image = (token.image as string) ?? null;
        session.user.termsAcceptedAt = token.termsAcceptedAt ?? null;
        session.user.emailVerifiedAt = token.emailVerifiedAt ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
