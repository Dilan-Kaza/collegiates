import type { DefaultSession } from "next-auth";

/**
 * Module augmentation for the extra fields embedded in the JWT and session.
 *
 * @remarks
 * `user_id`, `user_type`, and `token_version` are set by the callbacks in
 * {@link "auth"}. Declaring them here is what makes them typed at every read
 * site rather than needing a cast.
 *
 * @packageDocumentation
 */
declare module "next-auth" {
  interface Session {
    user: {
      user_id: string;
      user_type: string;
      token_version: number;
    } & DefaultSession["user"];
  }

  interface User {
    user_type?: string;
    token_version?: number;
  }
}

// JWT lives in @auth/core/jwt and is only re-exported by next-auth/jwt, so the
// augmentation must target @auth/core/jwt or it creates an ignored interface.
declare module "@auth/core/jwt" {
  interface JWT {
    user_id?: string;
    user_type?: string;
    token_version?: number;
  }
}
