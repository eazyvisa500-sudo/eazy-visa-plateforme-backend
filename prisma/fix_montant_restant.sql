-- Met à jour montant_restant des budgets annuels où il est à 0
-- mais le budget est > 0 (cas des budgets créés avant l'ajout du champ)
UPDATE "budget_annuel"
SET "montant_restant" = "budget"
WHERE "montant_restant" = 0 AND "budget" > 0;
