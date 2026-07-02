# Isolation des budgets annuels — Garanties d'indépendance

## Principe

Une entreprise peut posséder **plusieurs budgets annuels** (même pour la même année).  
Chaque budget annuel est une entité totalement indépendante : ses créations, modifications, allocations, suppressions ou clôtures n'affectent **jamais** les autres budgets de la même entreprise.

---

## 1. Clé d'isolation : `reference`

| Modèle | Champ d'isolation | Type | Contrainte |
|--------|-------------------|------|------------|
| `BudgetAnnuel` | `reference` | `String` | `@unique` |
| `BudgetDepartement` | `reference` | `String` | FK vers `BudgetAnnuel.reference` |
| `BudgetPersonnel` | `reference` | `String` | FK vers `BudgetAnnuel.reference` |
| `AuditBudget` | `reference` | `String` | Log lié au budget concerné |

> **Règle d'or** : toute opération métier (allocation, augmentation, diminution, suppression d'un sous-budget) cible **un et un seul** `BudgetAnnuel` via sa `reference` unique.

---

## 2. Constat sur le schéma Prisma

```prisma
model BudgetAnnuel {
  id                     Int      @id @default(autoincrement())
  reference              String   @unique        // ← clé d'isolation
  identifiant_entreprise String
  annee                  Int                     // ← pas de contrainte d'unicité
  ...
}
```

- `reference` est unique au niveau global (pas deux budgets ne partagent la même référence).
- `annee` **n'est pas** contrainte en unique avec `identifiant_entreprise` : une entreprise peut donc avoir `N` budgets pour la même année.
- `BudgetDepartement` et `BudgetPersonnel` sont reliés par `reference`, pas par entreprise + année.

---

## 3. Vérification des opérations API

### Création (`POST /api/budgets-annuels`)
- Génère une nouvelle `reference` unique via `generateReferenceBudget()`.
- Aucune vérification de doublon sur `(entreprise, annee)` : plusieurs budgets peuvent être créés librement.

### Lecture
- `GET /api/budgets-annuels` → liste tous les budgets (filtrée par rôle pour un MANAGER).
- `GET /api/budgets-annuels/:id` → retourne **un** budget par son `id`.
- `GET /api/budgets-annuels/entreprise/:identifiant` → retourne tous les budgets de l'entreprise (pas de fusion).

### Modification / Activation / Clôture / Suppression
- Toutes utilisent `where: { id }` ou `where: { reference }`.
- **Aucun** `updateMany`, `deleteMany` ou requête globale par `identifiant_entreprise`.

### Allocation département (`POST /api/budgets-allocation/:reference/departements`)
```typescript
const budgetAnnuel = await prisma.budgetAnnuel.findUnique({ where: { reference } })
// Vérifie que le département n'a pas déjà un budget pour CETTE référence
const existing = await prisma.budgetDepartement.findFirst({
  where: { reference, departementId },
})
```
→ Le contrôle de doublon est **par référence**, pas par entreprise + année.

### Allocation personnel (`POST /api/budgets-allocation/:reference/personnels`)
- Même logique : la `reference` du budget annuel est passée en paramètre d'URL.
- Le montant est prélevé sur `montant_restant` de **ce** budget annuel uniquement.

### Augmentation / Diminution budget annuel
```typescript
await prisma.budgetAnnuel.update({
  where: { reference },  // ← cible un seul budget
  data: { budget: ..., montant_restant: ... },
})
```

### Suppression budget personnel
```typescript
await prisma.budgetPersonnel.delete({ where: { id } })
// Le restant est restitué au budget annuel identifié par existing.reference
await prisma.budgetAnnuel.update({
  where: { reference: existing.reference },
  data: { montant_restant: ... },
})
```

---

## 4. Ce qui est impossible (par design)

| Scénario risqué | Pourquoi c'est bloqué |
|-------------------|----------------------|
| Allouer un montant sur le budget A et débiter le budget B | Le `montant_restant` est lu depuis `findUnique({ where: { reference } })` |
| Supprimer un budget annuel et perdre les données d'un autre | `delete` utilise `where: { id }` (unique) |
| Modifier plusieurs budgets en une seule requête | Aucun `updateMany` ni `deleteMany` dans le code |
| Confondre deux budgets d'une même entreprise | `reference` est unique et passée explicitement dans chaque endpoint |

---

## 5. Impact pour le frontend

### URLs et navigation
- Toujours transporter la `reference` du budget annuel courant dans l'URL ou le state.
- Exemple de route frontend suggérée :
  ```
  /entreprises/:identifiant/budgets-annuels          → liste
  /entreprises/:identifiant/budgets-annuels/:reference → détail + allocations
  ```

### Sélecteur de budget
- Si une entreprise a plusieurs budgets, afficher un dropdown ou une liste pour choisir le budget actif.
- Une fois sélectionné, toutes les actions (allouer, augmenter, voir départements/personnels) utilisent cette `reference`.

### Exemple de state React
```typescript
const [selectedBudget, setSelectedBudget] = useState<string>(
  budgets[0]?.reference ?? ''
);

// Allocation
await fetch(`/api/budgets-allocation/${selectedBudget}/departements`, {
  method: 'POST',
  body: JSON.stringify({ departementId: 3, montant_alloue: 50000 }),
});
```

---

## 6. Résumé des garanties

1. **Unicité** : `reference` est globalement unique (`@unique`).
2. **Isolation des données** : `BudgetDepartement` et `BudgetPersonnel` sont attachés à une `reference`, pas à une entreprise.
3. **Isolation des opérations** : chaque endpoint utilise `where: { reference }` ou `where: { id }`.
4. **Pas d'effet de bord** : aucune requête en masse (`updateMany` / `deleteMany`) n'existe dans les controllers.
5. **Traçabilité** : chaque audit log enregistre la `reference` du budget concerné, permettant de tracer l'historique indépendamment pour chaque budget.
