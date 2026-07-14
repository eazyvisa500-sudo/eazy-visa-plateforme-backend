# Optimisation des Performances

Ce document décrit les mesures d'optimisation des performances mises en place dans l'application Eazy Visa Plateforme Backend.

## Table des matières

1. [Compression des Réponses](#compression-des-réponses)
2. [Optimisation du Pool de Connexions](#optimisation-du-pool-de-connexions)
3. [Optimisation des Requêtes Prisma](#optimisation-des-requêtes-prisma)
4. [Indexation de la Base de Données](#indexation-de-la-base-de-données)
5. [Logging Conditionnel](#logging-conditionnel)
6. [Bonnes Pratiques](#bonnes-pratiques)

---

## Compression des Réponses

### Middleware Compression

L'application utilise le middleware `compression` pour compresser automatiquement les réponses HTTP, réduisant la taille des données transférées.

```typescript
import compression from 'compression'

app.use(compression())
```

**Avantages:**
- Réduction de la taille des réponses (jusqu'à 70-90% pour le JSON)
- Diminution de la bande passante utilisée
- Temps de transfert réduit pour les clients

**Configuration par défaut:**
- Niveau de compression: défaut (6)
- Types de contenu compressés: text/*, application/json, application/javascript, etc.
- Seuil: 1KB (les réponses plus petites ne sont pas compressées)

**Personnalisation possible:**
```typescript
app.use(compression({
  level: 6, // Niveau de compression (0-9)
  threshold: 1024, // Seuil en octets
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false
    }
    return compression.filter(req, res)
  }
}))
```

---

## Optimisation du Pool de Connexions

### Configuration PostgreSQL Pool

Le pool de connexions PostgreSQL est optimisé pour gérer efficacement les connexions à la base de données.

```typescript
const pool = new Pool({
  connectionString,
  max: 20, // Maximum nombre de connexions dans le pool
  min: 5,  // Minimum nombre de connexions dans le pool
  idleTimeoutMillis: 30000, // Temps avant qu'une connexion inactive soit fermée
  connectionTimeoutMillis: 2000, // Temps maximum pour établir une connexion
})
```

**Paramètres:**

- **max: 20**
  - Nombre maximum de connexions simultanées
  - Évite la surcharge du serveur de base de données
  - Adapté pour une application de taille moyenne

- **min: 5**
  - Nombre minimum de connexions maintenues ouvertes
  - Réduit le temps d'établissement de connexion
  - Garantit une réactivité immédiate

- **idleTimeoutMillis: 30000**
  - Temps (30 secondes) avant qu'une connexion inactive soit fermée
  - Libère les ressources inutilisées
  - Équilibre entre performance et économie de ressources

- **connectionTimeoutMillis: 2000**
  - Temps maximum (2 secondes) pour établir une connexion
  - Évite les attentes infinies
  - Permet une détection rapide des problèmes de connexion

**Avantages:**
- Réutilisation des connexions existantes
- Meilleure gestion des ressources
- Temps de réponse réduit
- Protection contre les surcharges

---

## Optimisation des Requêtes Prisma

### Sélection de Champs Spécifiques

Au lieu de récupérer tous les champs d'un modèle, nous utilisons `select` pour ne récupérer que les champs nécessaires.

**❌ Avant (tous les champs):**
```typescript
const user = await prisma.user.findUnique({
  where: { matricule },
})
```

**✅ Après (champs nécessaires):**
```typescript
const user = await prisma.user.findUnique({
  where: { matricule },
  select: {
    id: true,
    prenom: true,
    nom: true,
    civilite: true,
    email: true,
    telephone: true,
    genre: true,
    numero_passport: true,
    date_expiration_passport: true,
    entrepriseId: true,
    matricule: true,
    role: true,
  },
})
```

**Avantages:**
- Réduction de la quantité de données transférées
- Temps de sérialisation réduit
- Moins de mémoire utilisée
- Meilleure utilisation de la bande passante

### Utilisation de Select pour les Vérifications

Pour les vérifications simples, nous ne sélectionnons que les champs nécessaires.

**✅ Exemple - Vérification d'entreprise:**
```typescript
const entreprise = await prisma.entreprise.findUnique({
  where: { id: user.entrepriseId },
  select: { identifiant: true },
})
```

**Avantages:**
- Requête plus légère
- Temps d'exécution réduit
- Moins de charge sur la base de données

### Constantes de Sélection

Pour les requêtes fréquentes, nous utilisons des constantes de sélection pour éviter la duplication.

```typescript
const USER_SELECT = {
  id: true,
  prenom: true,
  nom: true,
  email: true,
  matricule: true,
  departementId: true,
  departement: { select: { id: true, nom: true } },
  poste: true,
  telephone: true,
  role: true,
  is_block: true,
  entrepriseId: true,
  civilite: true,
  genre: true,
  numero_passport: true,
  date_expiration_passport: true,
  createdAt: true,
  updatedAt: true,
} as const

const employes = await prisma.user.findMany({
  where,
  select: { ...USER_SELECT, entreprise: { select: { nom: true, identifiant: true } } },
  orderBy: { createdAt: 'desc' },
})
```

**Avantages:**
- Cohérence des données retournées
- Maintenance facilitée
- Évite les erreurs de sélection

---

## Indexation de la Base de Données

### Index Ajoutés

Des index ont été ajoutés sur les champs fréquemment utilisés dans les requêtes pour optimiser les performances.

#### Index sur Departement
```prisma
model Departement {
  id           Int        @id @default(autoincrement())
  nom          String
  entrepriseId Int

  @@index([entrepriseId])
  @@index([nom])
  @@map("departements")
}
```

**Justification:**
- `entrepriseId`: Requêtes fréquentes pour récupérer les départements d'une entreprise
- `nom`: Recherche de département par nom (insensitive)

#### Index sur User
```prisma
model User {
  id           Int        @id @default(autoincrement())
  entrepriseId Int
  departementId Int
  role         Role
  is_block     Boolean

  @@index([entrepriseId])
  @@index([departementId])
  @@index([role])
  @@index([is_block])
  @@map("users")
}
```

**Justification:**
- `entrepriseId`: Filtre par entreprise pour les managers
- `departementId`: Jointures avec le département
- `role`: Filtre par rôle (SUPERADMIN, MANAGER, EMPLOYE)
- `is_block`: Filtre des utilisateurs bloqués

#### Index sur BudgetDepartement
```prisma
model BudgetDepartement {
  reference       String
  departementId   Int
  bloquer         Boolean

  @@index([reference])
  @@index([departementId])
  @@index([bloquer])
  @@map("budget_departements")
}
```

**Justification:**
- `reference`: Jointures avec BudgetAnnuel
- `departementId`: Recherche par département
- `bloquer`: Filtre des budgets bloqués

#### Index sur BudgetPersonnel
```prisma
model BudgetPersonnel {
  reference       String
  matricule       String
  bloquer         Boolean

  @@index([reference])
  @@index([matricule])
  @@index([bloquer])
  @@map("budget_personnels")
}
```

**Justification:**
- `reference`: Jointures avec BudgetAnnuel
- `matricule`: Recherche par utilisateur
- `bloquer`: Filtre des budgets bloqués

#### Index sur AuditBudget
```prisma
model AuditBudget {
  reference          String
  entrepriseId       Int
  createdAt          DateTime
  target_matricule   String?

  @@index([reference])
  @@index([entrepriseId])
  @@index([createdAt])
  @@index([target_matricule])
  @@map("audit_budgets")
}
```

**Justification:**
- `reference`: Jointures avec les budgets
- `entrepriseId`: Filtre par entreprise
- `createdAt`: Tri chronologique pour les audits
- `target_matricule`: Recherche par utilisateur cible

#### Index sur DemandeVoyage
```prisma
model DemandeVoyage {
  matricule              String
  identifiant_entreprise String
  statut                 StatutDemande
  dateDepart             DateTime

  @@index([matricule])
  @@index([identifiant_entreprise])
  @@index([statut])
  @@index([dateDepart])
  @@map("demande_voyages")
}
```

**Justification:**
- `matricule`: Recherche des demandes d'un utilisateur
- `identifiant_entreprise`: Filtre par entreprise
- `statut`: Filtre par statut (EN_ATTENTE, APPROUVEE, etc.)
- `dateDepart`: Tri et filtre par date de voyage

#### Index sur ReservationBillet
```prisma
model ReservationBillet {
  matricule             String?
  statut                StatutReservation
  numeroOrder           String?

  @@index([matricule])
  @@index([statut])
  @@index([numeroOrder])
  @@map("reservation_billets")
}
```

**Justification:**
- `matricule`: Recherche des réservations d'un utilisateur
- `statut`: Filtre par statut de réservation
- `numeroOrder`: Recherche par numéro de commande Duffel

#### Index sur ReservationHotel
```prisma
model ReservationHotel {
  statut                StatutReservationHotel

  @@index([statut])
  @@map("reservation_hotels")
}
```

**Justification:**
- `statut`: Filtre par statut de réservation d'hôtel

**Avantages des index:**
- Requêtes plus rapides sur les grands volumes de données
- Réduction de la charge CPU du serveur de base de données
- Meilleure expérience utilisateur
- Scalabilité améliorée

---

## Logging Conditionnel

### Configuration Prisma

Le logging Prisma est configuré de manière conditionnelle selon l'environnement.

```typescript
const prisma = new PrismaClient({
  adapter,
  log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
})
```

**En développement:**
- `query`: Log toutes les requêtes SQL
- `error`: Log les erreurs
- `warn`: Log les avertissements

**En production:**
- `error`: Log uniquement les erreurs

**Avantages:**
- Débogage facilité en développement
- Performance optimale en production
- Réduction de la charge I/O
- Logs plus pertinents

---

## Bonnes Pratiques

### 1. Éviter les Requêtes N+1

**❌ Problème N+1:**
```typescript
const users = await prisma.user.findMany()
for (const user of users) {
  const dept = await prisma.departement.findUnique({ where: { id: user.departementId } })
  // ...
}
```

**✅ Solution avec include:**
```typescript
const users = await prisma.user.findMany({
  include: { departement: true },
})
```

### 2. Utiliser la Pagination

Pour les grandes listes, utilisez toujours la pagination.

```typescript
const page = Number(req.query.page) || 1
const limit = Number(req.query.limit) || 20
const skip = (page - 1) * limit

const users = await prisma.user.findMany({
  skip,
  take: limit,
  orderBy: { createdAt: 'desc' },
})
```

### 3. Limiter les Résultats

Utilisez `take` pour limiter le nombre de résultats.

```typescript
const recentUsers = await prisma.user.findMany({
  take: 10,
  orderBy: { createdAt: 'desc' },
})
```

### 4. Utiliser les Constantes de Sélection

Définissez des constantes pour les sélections récurrentes.

```typescript
const USER_SELECT = {
  id: true,
  prenom: true,
  nom: true,
  // ...
} as const
```

### 5. Éviter les Calculs dans les Requêtes

Effectuez les calculs avant les requêtes de base de données.

```typescript
// ✅ Calcul avant
const calculatedValue = heavyCalculation()
await prisma.$transaction([
  prisma.model1.update({ data: { value: calculatedValue } }),
])
```

### 6. Utiliser les Transactions Courtes

Gardez les transactions aussi courtes que possible.

```typescript
// ✅ Validation avant transaction
if (!isValid) {
  throw new Error('Invalid')
}
await prisma.$transaction([
  prisma.model1.update({ ... }),
  prisma.model2.update({ ... }),
])
```

### 7. Activer le Monitoring en Production

Surveillez les performances en production.

```typescript
// Ajouter des métriques de temps
const startTime = Date.now()
const result = await prisma.user.findMany({ ... })
const duration = Date.now() - startTime
if (duration > 1000) {
  console.warn(`Requête lente: ${duration}ms`)
}
```

---

## Résumé des Optimisations

| Optimisation | Impact | Implémentation |
|--------------|--------|----------------|
| Compression des réponses | Réduction 70-90% taille | Middleware compression |
| Pool de connexions optimisé | Réduction latence connexion | max: 20, min: 5 |
| Sélection de champs spécifiques | Réduction données transférées | Prisma select |
| Indexation de base de données | Accélère requêtes fréquentes | 20+ index ajoutés |
| Logging conditionnel | Réduction overhead | NODE_ENV dépendant |

---

## Recommandations Futures

### 1. Mise en Cache

Implémenter un cache (Redis) pour les données fréquemment accédées:
- Liste des entreprises
- Liste des départements
- Politiques des utilisateurs

### 2. Pagination Cursor-based

Pour les grandes listes, utiliser la pagination cursor-based au lieu de offset-based.

### 3. Optimisation des Requêtes Complexes

Analyser et optimiser les requêtes complexes avec EXPLAIN ANALYZE.

### 4. Monitoring Avancé

Implémenter un monitoring avancé (APM) pour:
- Tracer les requêtes lentes
- Identifier les goulots d'étranglement
- Surveiller les métriques de performance

### 5. CDN pour les Fichiers Statiques

Utiliser un CDN pour les fichiers statiques (logos, documents).

### 6. Lazy Loading

Implémenter le lazy loading pour les relations rarement utilisées.
