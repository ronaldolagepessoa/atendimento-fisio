import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    permissions: string[];
    fisioId?: string;
  }
  interface Session {
    user: {
      id: string;
      role: string;
      permissions: string[];
      fisioId?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    permissions?: string[];
    fisioId?: string;
  }
}
