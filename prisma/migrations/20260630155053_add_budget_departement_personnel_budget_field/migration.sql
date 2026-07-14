/*
  Warnings:

  - Added the required column `budget` to the `budget_annuel` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "budget_annuel" ADD COLUMN     "budget" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "budget_departements" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "departementId" INTEGER NOT NULL,
    "montant_alloue" DECIMAL(65,30) NOT NULL,
    "montant_utilise" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "montant_restant" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_departements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_personnels" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "montant_alloue" DECIMAL(65,30) NOT NULL,
    "montant_utilise" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "montant_restant" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_personnels_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "budget_departements" ADD CONSTRAINT "budget_departements_reference_fkey" FOREIGN KEY ("reference") REFERENCES "budget_annuel"("reference") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_departements" ADD CONSTRAINT "budget_departements_departementId_fkey" FOREIGN KEY ("departementId") REFERENCES "departements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_personnels" ADD CONSTRAINT "budget_personnels_reference_fkey" FOREIGN KEY ("reference") REFERENCES "budget_annuel"("reference") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_personnels" ADD CONSTRAINT "budget_personnels_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "users"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;
