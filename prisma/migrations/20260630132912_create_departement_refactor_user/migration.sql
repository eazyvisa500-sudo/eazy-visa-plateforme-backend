-- CreateTable
CREATE TABLE "departements" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "entrepriseId" INTEGER NOT NULL,

    CONSTRAINT "departements_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey departements → entreprises
ALTER TABLE "departements" ADD CONSTRAINT "departements_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "entreprises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrer les données : créer un enregistrement dans departements pour chaque (departement, entrepriseId) unique
INSERT INTO "departements" ("nom", "entrepriseId")
SELECT DISTINCT "departement", "entrepriseId"
FROM "users"
WHERE "departement" IS NOT NULL;

-- Ajouter departementId nullable pour la transition
ALTER TABLE "users" ADD COLUMN "departementId" INTEGER;

-- Lier chaque user à son département
UPDATE "users" u
SET "departementId" = d."id"
FROM "departements" d
WHERE d."nom" = u."departement"
  AND d."entrepriseId" = u."entrepriseId";

-- Rendre departementId NOT NULL
ALTER TABLE "users" ALTER COLUMN "departementId" SET NOT NULL;

-- Supprimer l'ancienne colonne
ALTER TABLE "users" DROP COLUMN "departement";

-- AddForeignKey users → departements
ALTER TABLE "users" ADD CONSTRAINT "users_departementId_fkey" FOREIGN KEY ("departementId") REFERENCES "departements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
