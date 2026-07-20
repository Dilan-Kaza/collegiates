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

declare module "next-auth/jwt" {
  interface JWT {
    user_id?: string;
    user_type?: string;
  }
}
