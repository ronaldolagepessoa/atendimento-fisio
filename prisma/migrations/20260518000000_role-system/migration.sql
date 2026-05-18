-- Step 1: Add nullable roleId column to User (while old "role" enum column still exists)
ALTER TABLE "User" ADD COLUMN "roleId" TEXT;

-- Step 2: Drop old enum type FIRST (rename trick: alter type before creating table)
-- We need to temporarily rename the enum so we can create the table named "Role"
ALTER TYPE "Role" RENAME TO "_Role_old";

-- Step 3: Create the new Role table
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "permissoes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_nome_key" ON "Role"("nome");

-- Insert 3 system roles
INSERT INTO "Role" ("id", "nome", "permissoes", "sistema", "criadoEm") VALUES
  ('role-admin', 'ADMIN', ARRAY[]::TEXT[], true, NOW()),
  ('role-fisio', 'FISIO', ARRAY['/agenda', '/taping']::TEXT[], true, NOW()),
  ('role-recepcionista', 'RECEPCIONISTA', ARRAY['/agenda', '/pacientes', '/taping', '/pacotes', '/pagamentos']::TEXT[], true, NOW());

-- Step 4: Populate roleId from existing role enum values
UPDATE "User" SET "roleId" = 'role-admin' WHERE "role"::text = 'ADMIN';
UPDATE "User" SET "roleId" = 'role-fisio' WHERE "role"::text = 'FISIO';

-- Step 5: Make roleId NOT NULL
ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;

-- Step 6: AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 7: Drop old role column (uses old enum type)
ALTER TABLE "User" DROP COLUMN "role";

-- Step 8: Drop old renamed enum type
DROP TYPE "_Role_old";
