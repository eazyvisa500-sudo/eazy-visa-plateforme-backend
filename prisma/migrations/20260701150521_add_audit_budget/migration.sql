-- AlterTable
ALTER TABLE "budget_annuel" ALTER COLUMN "montant_restant" DROP DEFAULT;

-- CreateTable
CREATE TABLE "audit_budgets" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "entrepriseId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "type_source" TEXT,
    "type_destination" TEXT,
    "montant" DECIMAL(65,30),
    "montant_avant" DECIMAL(65,30),
    "montant_apres" DECIMAL(65,30),
    "description" TEXT,
    "effectue_par" TEXT NOT NULL,
    "effectue_par_id" INTEGER,
    "target_id" INTEGER,
    "target_matricule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_budgets_pkey" PRIMARY KEY ("id")
);
