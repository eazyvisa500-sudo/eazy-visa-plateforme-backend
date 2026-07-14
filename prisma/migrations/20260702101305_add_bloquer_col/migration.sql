-- AlterTable
ALTER TABLE "budget_departements" ADD COLUMN     "bloquer" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "budget_personnels" ADD COLUMN     "bloquer" BOOLEAN NOT NULL DEFAULT false;
