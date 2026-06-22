-- DropForeignKey
ALTER TABLE "schools" DROP CONSTRAINT "schools_principal_id_fkey";

-- AlterTable
ALTER TABLE "schools" ALTER COLUMN "principal_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_principal_id_fkey" FOREIGN KEY ("principal_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
