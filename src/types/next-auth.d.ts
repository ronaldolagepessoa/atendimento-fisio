import type { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    fisioId?: string;
  }
  interface Session {
    user: {
      role: Role;
      fisioId?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    fisioId?: string;
  }
}
