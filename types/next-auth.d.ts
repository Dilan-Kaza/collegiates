import type { DefaultSession } from "next-auth";

// Module augmentation so the extra fields we embed in the JWT/session
// (user_id + user_type, set in auth.ts callbacks) are strongly typed.
declare module "next-auth" {
  interface Session {
    user: {
      user_id: string;
      user_type: string;
    } & DefaultSession["user"];
  }

  interface User {
    user_type?: string;
  }
}

// The JWT interface lives in @auth/core/jwt and is only re-exported by
// next-auth/jwt, so the augmentation must target @auth/core/jwt to actually
// merge (augmenting next-auth/jwt would create a separate, ignored interface).
declare module "@auth/core/jwt" {
  interface JWT {
    user_id?: string;
    user_type?: string;
  }
}
