# Gestion des Transactions

Ce document décrit comment les transactions sont gérées dans l'application Eazy Visa Plateforme Backend pour garantir la cohérence des données.

## Table des matières

1. [Introduction](#introduction)
2. [Pourquoi les Transactions ?](#pourquoi-les-transactions)
3. [Cas Utilisant des Transactions](#cas-utilisant-des-transactions)
4. [Implémentation avec Prisma](#implémentation-avec-prisma)
5. [Exemples Concrets](#exemples-concrets)
6. [Bonnes Pratiques](#bonnes-pratiques)

---

## Introduction

Une transaction est une séquence d'opérations de base de données qui doit être exécutée comme une unité atomique. Soit toutes les opérations réussissent, soit aucune n'est appliquée.

**Propriétés ACID:**
- **A**tomicité: Toutes les opérations réussissent ou aucune
- **C**onsistance: La base de données passe d'un état valide à un autre état valide
- **I**solation: Les transactions concurrentes ne s'interfèrent pas
- **D**urabilité: Les modifications persistent même en cas de panne

---

## Pourquoi les Transactions ?

### Problème sans Transactions

Sans transactions, si une opération échoue après d'autres opérations réussies, les données peuvent être incohérentes:

```typescript
// ❌ SANS TRANSACTION - Problème potentiel
await prisma.reservationBillet.update({ ... }) // Succès
await prisma.budgetPersonnel.update({ ... })   // Succès
await prisma.auditBudget.create({ ... })      // ÉCHEC
// Résultat: ReservationBillet et BudgetPersonnel mis à jour, mais pas d'audit
// → Incohérence des données
```

### Solution avec Transactions

Avec transactions, toutes les opérations sont atomiques:

```typescript
// ✅ AVEC TRANSACTION - Cohérence garantie
await prisma.$transaction([
  prisma.reservationBillet.update({ ... }),
  prisma.budgetPersonnel.update({ ... }),
  prisma.auditBudget.create({ ... }),
])
// Si une opération échoue, toutes sont annulées (rollback)
```

---

## Cas Utilisant des Transactions

### 1. Allocation de Budget (budgetAllocation.controller.ts)

#### Allocation Budget Département

**Opérations atomiques:**
1. Création de `BudgetDepartement`
2. Mise à jour de `BudgetAnnuel` (soustraction du montant)

```typescript
const [budgetDept] = await prisma.$transaction([
  prisma.budgetDepartement.create({
    data: {
      reference,
      departementId: Number(departementId),
      montant_alloue: montantStr,
      montant_restant: montantStr,
    },
  }),
  prisma.budgetAnnuel.update({
    where: { reference },
    data: { montant_restant: String(restantAnnuel - montant) },
  }),
])
```

**Pourquoi transaction ?**
- Garantit que le budget annuel n'est débité que si le budget département est créé
- Évite les incohérences (budget département créé mais budget annuel non débité)

#### Allocation Budget Personnel via Département

**Opérations atomiques:**
1. Création de `BudgetPersonnel`
2. Mise à jour de `BudgetDepartement` (soustraction du montant)

```typescript
const [budgetPers] = await prisma.$transaction([
  prisma.budgetPersonnel.create({
    data: {
      reference,
      matricule,
      montant_alloue: montantStr,
      montant_restant: montantStr,
    },
  }),
  prisma.budgetDepartement.update({
    where: { id: budgetDept.id },
    data: {
      montant_restant: String(restantDept - montant),
      montant_utilise: String(Number(budgetDept.montant_utilise) + montant),
    },
  }),
])
```

#### Allocation Budget Personnel Directe

**Opérations atomiques:**
1. Création de `BudgetPersonnel`
2. Mise à jour de `BudgetAnnuel` (soustraction du montant)

```typescript
const [budgetPers] = await prisma.$transaction([
  prisma.budgetPersonnel.create({
    data: {
      reference,
      matricule,
      montant_alloue: montantStr,
      montant_restant: montantStr,
    },
  }),
  prisma.budgetAnnuel.update({
    where: { reference },
    data: { montant_restant: String(restantAnnuel - montant) },
  }),
])
```

#### Modification Budget Département

**Opérations atomiques:**
1. Mise à jour de `BudgetDepartement`
2. Mise à jour de `BudgetAnnuel` (ajustement de la différence)

```typescript
const [updated] = await prisma.$transaction([
  prisma.budgetDepartement.update({
    where: { id },
    data: {
      montant_alloue: montantStr,
      montant_restant: String(nouveauRestant),
    },
  }),
  prisma.budgetAnnuel.update({
    where: { reference: existing.reference },
    data: { montant_restant: String(Number(budgetAnnuel.montant_restant) - difference) },
  }),
])
```

#### Suppression Budget Département

**Opérations atomiques:**
1. Suppression de `BudgetDepartement`
2. Mise à jour de `BudgetAnnuel` (retour du montant restant)

```typescript
await prisma.$transaction([
  prisma.budgetDepartement.delete({ where: { id } }),
  prisma.budgetAnnuel.update({
    where: { reference: existing.reference },
    data: { montant_restant: String(Number(budgetAnnuel.montant_restant) + restantADegager) },
  }),
])
```

#### Modification Budget Personnel

**Opérations atomiques:**
1. Mise à jour de `BudgetPersonnel`
2. Mise à jour de `BudgetDepartement` ou `BudgetAnnuel` (selon la source)

```typescript
const operations: Promise<unknown>[] = [
  prisma.budgetPersonnel.update({
    where: { id },
    data: {
      montant_alloue: montantStr,
      montant_restant: String(nouveauRestant),
    },
  }),
]

if (deptBudget) {
  operations.push(
    prisma.budgetDepartement.update({
      where: { id: deptBudget.id },
      data: {
        montant_restant: String(Number(deptBudget.montant_restant) - difference),
        montant_utilise: String(Number(deptBudget.montant_utilise) + difference),
      },
    })
  )
} else {
  operations.push(
    prisma.budgetAnnuel.update({
      where: { reference: existing.reference },
      data: { montant_restant: String(Number(budgetAnnuel.montant_restant) - difference) },
    })
  )
}

const [updated] = await prisma.$transaction(operations)
```

#### Suppression Budget Personnel

**Opérations atomiques:**
1. Suppression de `BudgetPersonnel`
2. Mise à jour de `BudgetDepartement` ou `BudgetAnnuel` (retour du montant restant)

```typescript
const operations: Promise<unknown>[] = [
  prisma.budgetPersonnel.delete({ where: { id } }),
]

if (deptBudget) {
  operations.push(
    prisma.budgetDepartement.update({
      where: { id: deptBudget.id },
      data: {
        montant_restant: String(Number(deptBudget.montant_restant) + restantADegager),
        montant_utilise: String(Number(deptBudget.montant_utilise) - Number(existing.montant_alloue)),
      },
    })
  )
} else {
  operations.push(
    prisma.budgetAnnuel.update({
      where: { reference: existing.reference },
      data: { montant_restant: String(Number(budgetAnnuel.montant_restant) + restantADegager) },
    })
  )
}

await prisma.$transaction(operations)
```

#### Augmentation/Diminution Budget Département

**Opérations atomiques:**
1. Mise à jour de `BudgetDepartement`
2. Mise à jour de `BudgetAnnuel`

```typescript
const [updated] = await prisma.$transaction([
  prisma.budgetDepartement.update({
    where: { id },
    data: {
      montant_alloue: String(nouveauAlloue),
      montant_restant: String(nouveauRestant),
    },
  }),
  prisma.budgetAnnuel.update({
    where: { reference: existing.reference },
    data: { montant_restant: String(restantAnnuel - val) },
  }),
])
```

---

### 2. Réservation de Vol (flights.controller.ts)

#### bookFlight

**Opérations atomiques:**
1. Mise à jour de `ReservationBillet` (informations de réservation Duffel)
2. Mise à jour de `BudgetPersonnel` (débit du montant)
3. Création de `AuditBudget` (trace de l'opération)

```typescript
const montantFCFA = convertToFCFA(totalAmount, totalCurrency)
const nouveauMontantUtilise = budgetPersonnel.montant_utilise.toNumber() + montantFCFA
const nouveauMontantRestant = budgetPersonnel.montant_restant.toNumber() - montantFCFA

await prisma.$transaction([
  prisma.reservationBillet.update({
    where: { id: reservationBillet.id },
    data: {
      numeroReservation: bookingReference,
      numeroOrder: order.data.id,
      compagnieAerienne: ownerName,
      numeroVolAller: firstSegment?.marketing_carrier_flight_number,
      numeroVolRetour: secondFirstSegment?.marketing_carrier_flight_number,
      dateVolDepart: firstSegment?.departing_at ? new Date(firstSegment.departing_at) : null,
      dateVolArrivee: lastSegment?.arriving_at ? new Date(lastSegment.arriving_at) : null,
      dateVolRetourDepart: secondFirstSegment?.departing_at ? new Date(secondFirstSegment.departing_at) : null,
      dateVolRetourArrivee: secondLastSegment?.arriving_at ? new Date(secondLastSegment.arriving_at) : null,
      aeroportDepart: firstSegment?.origin?.iata_code,
      aeroportArrivee: lastSegment?.destination?.iata_code,
      classe: firstSegment?.passengers?.[0]?.cabin_class || 'Y',
      prix: totalAmount,
      devise: totalCurrency || 'XOF',
      statut: 'EMISE',
      numeroBillet: uniqueIdentifier,
      dateEmission: order.data.created_at ? new Date(order.data.created_at) : null,
    },
  }),
  prisma.budgetPersonnel.update({
    where: { id: budgetPersonnel.id },
    data: {
      montant_utilise: nouveauMontantUtilise,
      montant_restant: nouveauMontantRestant,
    },
  }),
  prisma.auditBudget.create({
    data: {
      reference: budgetPersonnel.reference,
      entrepriseId: user.entrepriseId,
      action: 'RESERVATION_BILLET',
      type_source: 'BUDGET_PERSONNEL',
      type_destination: 'RESERVATION_BILLET',
      montant: montantFCFA,
      montant_avant: budgetRestant,
      montant_apres: nouveauMontantRestant,
      description: `Réservation de vol - Référence: ${bookingReference}`,
      effectue_par: user.matricule,
      effectue_par_id: user.id,
      role_effectue_par: user.role,
      target_matricule: user.matricule,
    },
  }),
])
```

**Pourquoi transaction ?**
- Garantit que le budget n'est débité que si la réservation est mise à jour
- Garantit que l'audit est créé seulement si les deux opérations précédentes réussissent
- Évite les incohérences (réservation émise mais budget non débité, ou budget débité sans audit)

---

### 3. Approbation Demande de Voyage (demandeVoyage.controller.ts)

#### approuverDemandeVoyage

**Opérations atomiques:**
1. Mise à jour de `DemandeVoyage` (statut → APPROUVEE)
2. Création de `ReservationBillet`
3. Création de `ReservationHotel` (conditionnel)

```typescript
const operations: Promise<unknown>[] = [
  prisma.demandeVoyage.update({
    where: { id },
    data: { statut: 'APPROUVEE', commentaire: commentaire ?? existing.commentaire },
    include: {
      user: { select: { id: true, prenom: true, nom: true, matricule: true, role: true } },
      entreprise: { select: { id: true, nom: true, identifiant: true } },
    },
  }),
  prisma.reservationBillet.create({
    data: {
      demandeVoyageId: existing.id,
      matricule: existing.matricule,
      allerRetour: existing.allerRetour,
      numeroReservation: `RES-${Date.now()}`,
      dateVolDepart: existing.dateDepart,
      dateVolArrivee: null,
      dateVolRetourDepart: existing.allerRetour ? existing.dateRetour : null,
      dateVolRetourArrivee: null,
      aeroportDepart: existing.depart,
      aeroportArrivee: existing.arrive,
      classe: existing.classe,
      statut: 'EN_ATTENTE',
    },
  }),
]

if (existing.hotel !== 'NON_INCLUS') {
  operations.push(
    prisma.reservationHotel.create({
      data: {
        demandeVoyageId: existing.id,
        categorie: existing.hotel,
        ville: existing.ville,
        statut: 'EN_ATTENTE',
      },
    })
  )
}

const [demande, reservationBillet, reservationHotel] = await prisma.$transaction(operations) as [
  any,
  any,
  any | null
]
```

**Pourquoi transaction ?**
- Garantit que le statut APPROUVEE n'est appliqué que si les réservations sont créées
- Évite les incohérences (demande approuvée mais aucune réservation créée)
- Assure que toutes les réservations (billet + hôtel) sont créées ensemble ou aucune

---

## Implémentation avec Prisma

### Syntaxe de Base

Prisma fournit la méthode `$transaction` pour exécuter plusieurs opérations de manière atomique:

```typescript
await prisma.$transaction([
  prisma.model1.create({ ... }),
  prisma.model2.update({ ... }),
  prisma.model3.delete({ ... }),
])
```

### Transaction Conditionnelle

Pour les transactions avec des opérations conditionnelles:

```typescript
const operations: Promise<unknown>[] = [
  prisma.model1.update({ ... }),
  prisma.model2.update({ ... }),
]

if (condition) {
  operations.push(prisma.model3.create({ ... }))
}

await prisma.$transaction(operations)
```

### Gestion des Erreurs

Si une opération échoue, Prisma effectue automatiquement un rollback:

```typescript
try {
  await prisma.$transaction([
    prisma.model1.update({ ... }),
    prisma.model2.update({ ... }),
  ])
} catch (error) {
  // Rollback automatique si erreur
  console.error('Transaction échouée:', error)
  throw error
}
```

### Récupération des Résultats

Pour récupérer les résultats des opérations:

```typescript
const [result1, result2, result3] = await prisma.$transaction([
  prisma.model1.create({ ... }),
  prisma.model2.update({ ... }),
  prisma.model3.create({ ... }),
])
```

---

## Exemples Concrets

### Scénario 1: Allocation Budget Département

**Sans transaction:**
```
1. Créer BudgetDepartement (succès)
2. Débiter BudgetAnnuel (échoue - erreur serveur)
Résultat: BudgetDepartement existe mais BudgetAnnuel non débité
→ Incohérence: le budget département a reçu de l'argent qui n'a pas été débité du budget annuel
```

**Avec transaction:**
```
1. Créer BudgetDepartement (succès)
2. Débiter BudgetAnnuel (échoue - erreur serveur)
Résultat: Rollback automatique - aucune modification
→ Cohérence: aucun budget n'est modifié
```

### Scénario 2: Réservation de Vol

**Sans transaction:**
```
1. Mettre à jour ReservationBillet (succès)
2. Débiter BudgetPersonnel (succès)
3. Créer AuditBudget (échoue - contrainte unique)
Résultat: ReservationBillet mise à jour, BudgetPersonnel débité, mais pas d'audit
→ Incohérence: l'argent est débité mais aucune trace n'existe
```

**Avec transaction:**
```
1. Mettre à jour ReservationBillet (succès)
2. Débiter BudgetPersonnel (succès)
3. Créer AuditBudget (échoue - contrainte unique)
Résultat: Rollback automatique - aucune modification
→ Cohérence: aucune modification appliquée
```

### Scénario 3: Approbation Demande

**Sans transaction:**
```
1. Mettre statut à APPROUVEE (succès)
2. Créer ReservationBillet (échoue - erreur Duffel API)
Résultat: Demande approuvée mais aucune réservation créée
→ Incohérence: l'utilisateur pense que sa demande est validée mais ne peut pas réserver
```

**Avec transaction:**
```
1. Mettre statut à APPROUVEE (succès)
2. Créer ReservationBillet (échoue - erreur Duffel API)
Résultat: Rollback automatique - statut reste EN_ATTENTE
→ Cohérence: la demande reste en attente pour être traitée à nouveau
```

---

## Bonnes Pratiques

### 1. Identifier les Opérations Liées

Les transactions doivent être utilisées lorsque plusieurs opérations sont logiquement liées et doivent réussir ensemble:

**✅ Bon:**
- Allocation de budget (création + débit)
- Réservation (mise à jour + débit + audit)
- Approbation (changement statut + création réservations)

**❌ Mauvais:**
- Opérations indépendantes
- Opérations qui peuvent échouer sans conséquence critique

### 2. Garder les Transactions Courtes

Les transactions longues peuvent bloquer d'autres opérations et causer des deadlocks:

```typescript
// ❌ Éviter les transactions longues
await prisma.$transaction([
  prisma.model1.create({ ... }),
  // Opérations lourdes (calculs, appels API externes)
  prisma.model2.update({ ... }),
])

// ✅ Effectuer les calculs avant la transaction
const calculatedValue = heavyCalculation()
await prisma.$transaction([
  prisma.model1.create({ ... }),
  prisma.model2.update({ data: { value: calculatedValue } }),
])
```

### 3. Valider Avant la Transaction

Effectuer les validations avant de commencer la transaction:

```typescript
// ✅ Valider d'abord
if (montant > budgetRestant) {
  throw new BadRequestError('Budget insuffisant')
}

// Puis exécuter la transaction
await prisma.$transaction([
  prisma.reservationBillet.update({ ... }),
  prisma.budgetPersonnel.update({ ... }),
])
```

### 4. Gérer les Erreurs Appropriément

Propager les erreurs pour que le client puisse les gérer:

```typescript
try {
  await prisma.$transaction([
    prisma.model1.update({ ... }),
    prisma.model2.update({ ... }),
  ])
} catch (error) {
  console.error('Transaction échouée:', error)
  throw error // Propager l'erreur au client
}
```

### 5. Utiliser des Transactions Imbriquées avec Précaution

Prisma ne supporte pas les transactions imbriquées. Si nécessaire, utiliser une seule transaction pour toutes les opérations.

### 6. Logger les Transactions

Logger le début et la fin des transactions pour le debugging:

```typescript
console.log('Début transaction: allocation budget département')
await prisma.$transaction([
  prisma.budgetDepartement.create({ ... }),
  prisma.budgetAnnuel.update({ ... }),
])
console.log('Transaction réussie: allocation budget département')
```

---

## Résumé

### Transactions Implémentées

| Contrôleur | Fonction | Opérations |
|------------|----------|-------------|
| budgetAllocation | allouerBudgetDepartement | BudgetDepartement.create + BudgetAnnuel.update |
| budgetAllocation | allouerBudgetPersonnel (dept) | BudgetPersonnel.create + BudgetDepartement.update |
| budgetAllocation | allouerBudgetPersonnel (direct) | BudgetPersonnel.create + BudgetAnnuel.update |
| budgetAllocation | updateBudgetDepartement | BudgetDepartement.update + BudgetAnnuel.update |
| budgetAllocation | deleteBudgetDepartement | BudgetDepartement.delete + BudgetAnnuel.update |
| budgetAllocation | updateBudgetPersonnel | BudgetPersonnel.update + BudgetDepartement/BudgetAnnuel.update |
| budgetAllocation | deleteBudgetPersonnel | BudgetPersonnel.delete + BudgetDepartement/BudgetAnnuel.update |
| budgetAllocation | augmenterBudgetDepartement | BudgetDepartement.update + BudgetAnnuel.update |
| budgetAllocation | diminuerBudgetDepartement | BudgetDepartement.update + BudgetAnnuel.update |
| flights | bookFlight | ReservationBillet.update + BudgetPersonnel.update + AuditBudget.create |
| demandeVoyage | approuverDemandeVoyage | DemandeVoyage.update + ReservationBillet.create + ReservationHotel.create |

### Avantages

- **Cohérence des données**: Garantit que les données restent cohérentes
- **Intégrité**: Évite les incohérences entre les tables liées
- **Fiabilité**: Les opérations critiques sont atomiques
- **Audit**: Toutes les opérations budgétaires sont tracées

### Points d'Attention

- Les transactions bloquent les ressources pendant leur exécution
- Les transactions longues peuvent causer des deadlocks
- Les erreurs doivent être gérées correctement
- Les validations doivent être faites avant la transaction
