import type { User } from "@prisma/client";
import prisma from "./prisma";
import { auth } from "@/auth";

// Resolves the authenticated user from the Auth.js session cookie, or null.
// Callable inside route handlers / server components with no arguments.
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();
  const userId = session?.user?.user_id;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { user_id: userId } });
}

type UserTypeHolder = { user_type: string } | null | undefined;

export const isOrganizer = (user: UserTypeHolder): boolean => user?.user_type === "O";
export const isCompetitor = (user: UserTypeHolder): boolean => user?.user_type === "C";
