/*
  Warnings:

  - Added the required column `montant_restant` to the `budget_annuel` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "budget_annuel" ADD COLUMN     "montant_restant" DECIMAL(65,30) NOT NULL DEFAULT 0,
ALTER COLUMN "budget" DROP DEFAULT;
