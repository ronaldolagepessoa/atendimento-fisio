import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const ADMIN_ONLY_ROUTES = [
  "/pagamentos",
  "/relatorios",
  "/procedimentos",
  "/fisios",
];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthRoute = req.nextUrl.pathname.startsWith("/login");
  const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");

  if (isApiAuthRoute) return NextResponse.next();

  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/agenda", req.url));
  }

  const role = req.auth?.user?.role;
  if (role === "FISIO") {
    const blocked = ADMIN_ONLY_ROUTES.some((r) =>
      req.nextUrl.pathname.startsWith(r)
    );
    if (blocked) {
      return NextResponse.redirect(new URL("/agenda", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
