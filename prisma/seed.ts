import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env["DATABASE_URL"]!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "admin@clinica.com" },
    update: {},
    create: {
      email: "admin@clinica.com",
      name: "Admin",
      password: hash,
      role: Role.ADMIN,
    },
  });

  console.log("✅ Seed concluído — admin@clinica.com / admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
