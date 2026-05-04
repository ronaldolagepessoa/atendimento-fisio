"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", { email, password, redirectTo: "/agenda" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email ou senha incorretos." };
    }
    throw error;
  }
}
