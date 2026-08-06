import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

// Auth.js (NextAuth v5) email/password Credentials provider over the Prisma `users` table with
// Django-compatible PBKDF2. JWT session in an httpOnly cookie; no /api/auth route handler.
export const { auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/signin" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const email = typeof creds?.email === "string" ? creds.email : "";
        const password = typeof creds?.password === "string" ? creds.password : "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.is_active) return null;
        if (!verifyPassword(password, user.password)) return null;

        return { id: user.user_id, email: user.email, user_type: user.user_type };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.user_id = user.id;
        token.user_type = user.user_type;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.user_id = token.user_id ?? "";
        session.user.user_type = token.user_type ?? "";
      }
      return session;
    },
  },
});
