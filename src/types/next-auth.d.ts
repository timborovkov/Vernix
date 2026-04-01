import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    image?: string | null;
    termsAcceptedAt?: Date | string | null;
    emailVerifiedAt?: Date | string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      termsAcceptedAt?: string | null;
      emailVerifiedAt?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    image?: string | null;
    termsAcceptedAt?: string | null;
    emailVerifiedAt?: string | null;
  }
}
