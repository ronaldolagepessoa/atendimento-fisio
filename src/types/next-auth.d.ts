import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    fisioId?: string;
  }
  interface Session {
    user: {
      role: string;
      fisioId?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    fisioId?: string;
  }
}
