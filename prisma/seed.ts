import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) {
  throw new Error("DATABASE_URL não definida. Configure no .env antes de rodar o seed.");
}
const adapter = new PrismaPg({ connectionString });
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
      roleId: "role-admin",
    },
  });

  console.log("✅ Seed concluído — admin@clinica.com / admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
