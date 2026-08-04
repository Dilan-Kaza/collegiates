import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

// Auth.js (NextAuth v5) — email/password Credentials provider validated against
// the Prisma `users` table using Django-compatible PBKDF2. Sessions are JWTs
// stored in an httpOnly cookie; user_id + user_type are embedded so server
// actions and the UI can authorize without another DB round-trip. There is no
// /api/auth route handler — signIn/signOut run inside server actions and the
// session is read server-side via auth(), so nothing hits an API endpoint.
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
