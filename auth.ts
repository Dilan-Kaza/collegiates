import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

/**
 * The Auth.js (NextAuth v5) configuration: an email/password Credentials
 * provider over the Prisma `users` table.
 *
 * @remarks
 * Passwords are verified with Django-compatible PBKDF2, so credentials
 * inherited from the previous backend still work — see {@link "lib/password"}.
 *
 * Sessions are **JWTs in an httpOnly cookie**, with no session table. Two
 * consequences follow, both handled in {@link "lib/auth"}:
 *
 * - The token carries `user_id`, `user_type`, and `token_version`, but those are
 *   a snapshot. `getCurrentUser` re-reads the user on every request rather than
 *   trusting them.
 * - Revocation has nowhere to live, so it is done by comparing `token_version`
 *   against the column, which a password change increments.
 *
 * `authorize` refuses an inactive account, so an unactivated user cannot sign in
 * even with correct credentials.
 *
 * There is **no `/api/auth/[...nextauth]` route handler** — unusually for
 * NextAuth. The server actions in {@link "functions/actions/auth"} are the whole
 * auth surface.
 */
export const { auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/signin" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const email = typeof creds?.email === "string" ? creds.email.trim().toLowerCase() : "";
        const password = typeof creds?.password === "string" ? creds.password : "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.is_active) return null;
        if (!verifyPassword(password, user.password)) return null;

        return { id: user.user_id, email: user.email, user_type: user.user_type, token_version: user.token_version };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.user_id = user.id;
        token.user_type = user.user_type;
        token.token_version = user.token_version;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.user_id = token.user_id ?? "";
        session.user.user_type = token.user_type ?? "";
        session.user.token_version = token.token_version ?? 0;
      }
      return session;
    },
  },
});
