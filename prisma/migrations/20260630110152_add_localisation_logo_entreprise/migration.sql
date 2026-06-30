/*
  Warnings:

  - Added the required column `pays` to the `entreprises` table without a default value. This is not possible if the table is not empty.
  - Added the required column `region` to the `entreprises` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ville` to the `entreprises` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "entreprises"
ADD COLUMN "logo" TEXT,
ADD COLUMN "pays" TEXT NOT NULL DEFAULT '',
ADD COLUMN "region" TEXT NOT NULL DEFAULT '',
ADD COLUMN "ville" TEXT NOT NULL DEFAULT '';

ALTER TABLE "entreprises"
ALTER COLUMN "pays" DROP DEFAULT,
ALTER COLUMN "region" DROP DEFAULT,
ALTER COLUMN "ville" DROP DEFAULT;
