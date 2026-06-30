-- CreateTable
CREATE TABLE "budget_annuel" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "identifiant_entreprise" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "est_active" BOOLEAN NOT NULL DEFAULT false,
    "est_cloture" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_annuel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "budget_annuel_reference_key" ON "budget_annuel"("reference");

-- AddForeignKey
ALTER TABLE "budget_annuel" ADD CONSTRAINT "budget_annuel_identifiant_entreprise_fkey" FOREIGN KEY ("identifiant_entreprise") REFERENCES "entreprises"("identifiant") ON DELETE RESTRICT ON UPDATE CASCADE;
