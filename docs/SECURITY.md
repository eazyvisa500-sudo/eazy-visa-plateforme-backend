# Gestion de la Sécurité

Ce document décrit les mesures de sécurité mises en place dans l'application Eazy Visa Plateforme Backend.

## Table des matières

1. [Headers de Sécurité](#headers-de-sécurité)
2. [Rate Limiting](#rate-limiting)
3. [CORS Configuration](#cors-configuration)
4. [Authentification JWT](#authentification-jwt)
5. [Autorisation par Rôle](#autorisation-par-rôle)
6. [Validation des Entrées](#validation-des-entrées)
7. [Protection des Données Sensibles](#protection-des-données-sensibles)
8. [Variables d'Environnement](#variables-denvironnement)

---

## Headers de Sécurité

### Helmet

L'application utilise **Helmet** pour sécuriser les headers HTTP et protéger contre diverses vulnérabilités:

```typescript
import helmet from 'helmet'
app.use(helmet())
```

**Headers ajoutés par Helmet:**
- `X-Content-Type-Options: nosniff` - Empêche le MIME-sniffing
- `X-Frame-Options: DENY` - Protection contre le clickjacking
- `X-XSS-Protection: 1; mode=block` - Protection XSS
- `Strict-Transport-Security` - Force HTTPS (en production)
- `Content-Security-Policy` - Restreint les sources de contenu

---

## Rate Limiting

### Limitation Globale

Toutes les routes API sont protégées par un rate limiting:

```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par IP
  message: 'Trop de requêtes, veuillez réessayer plus tard',
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', limiter)
```

**Configuration:**
- Fenêtre: 15 minutes
- Limite: 100 requêtes par IP
- Message d'erreur personnalisé en français

### Limitation Stricte pour l'Authentification

Les routes d'authentification ont une protection renforcée contre les attaques brute force:

```typescript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 5 requêtes par IP
  message: 'Trop de tentatives de connexion, veuillez réessayer plus tard',
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/auth', authLimiter, authRoutes)
```

**Configuration:**
- Fenêtre: 15 minutes
- Limite: 5 requêtes par IP
- Protège contre les attaques brute force sur login

---

## CORS Configuration

### Configuration Restrictive

Le CORS est configuré de manière restrictive pour limiter les origines autorisées:

```typescript
const corsOptions = {
  origin: process.env['FRONTEND_URL'] || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}
app.use(cors(corsOptions))
```

**Paramètres:**
- **Origin**: Limité à l'URL du frontend (configurable via `FRONTEND_URL`)
- **Credentials**: Activé pour les cookies/tokens
- **Methods**: Seules les méthodes nécessaires sont autorisées
- **Headers**: Seuls `Content-Type` et `Authorization` sont autorisés

**Variable d'environnement:**
```env
FRONTEND_URL=http://localhost:5173
```

---

## Authentification JWT

### Middleware d'Authentification

Le middleware `requireAuth` vérifie la présence et la validité du token JWT:

```typescript
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: "Token d'authentification manquant" })
    return
  }
  const token = authHeader.substring(7)
  const secret = process.env['JWT_SECRET']
  if (!secret) {
    res.status(500).json({ message: 'Configuration JWT manquante' })
    return
  }
  try {
    const payload = jwt.verify(token, secret) as AuthPayload
    req.user = payload
    next()
  } catch {
    res.status(401).json({ message: 'Token invalide ou expiré' })
  }
}
```

**Payload du Token:**
```typescript
interface AuthPayload {
  id?: number
  email: string
  role: string
  entrepriseId?: number
  matricule?: string
  identifiantEntreprise?: string
}
```

**Sécurité:**
- Token requis dans le header `Authorization: Bearer <token>`
- Vérification de la signature avec `JWT_SECRET`
- Gestion des tokens expirés

---

## Autorisation par Rôle

### Middleware d'Autorisation

L'application utilise trois niveaux d'autorisation:

#### 1. SuperAdmin Uniquement

```typescript
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'SUPERADMIN') {
    res.status(403).json({ message: 'Accès réservé au superadmin' })
    return
  }
  next()
}
```

**Routes protégées:**
- Gestion des entreprises (création, modification, suppression)
- Opérations administratives sensibles

#### 2. Manager ou SuperAdmin

```typescript
export const requireManagerOrSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const role = req.user?.role
  if (role !== 'SUPERADMIN' && role !== 'MANAGER') {
    res.status(403).json({ message: 'Accès non autorisé' })
    return
  }
  next()
}
```

**Routes protégées:**
- Gestion des employés
- Gestion des départements
- Gestion des budgets
- Approbation des demandes de voyage
- Recherche de vols

#### 3. Contrôle d'Accès Spécifique

Certains contrôleurs implémentent une vérification supplémentaire pour les managers:

```typescript
async function checkBudgetOwnership(
  user: Express.Request['user'],
  identifiant_entreprise: string
): Promise<void> {
  if (user?.role === 'MANAGER') {
    const entreprise = await prisma.entreprise.findUnique({ where: { id: user.entrepriseId } })
    if (!entreprise || entreprise.identifiant !== identifiant_entreprise) {
      throw new ForbiddenError()
    }
  }
}
```

**Principe:**
- Les managers ne peuvent accéder qu'aux ressources de leur propre entreprise
- Les superadmins ont accès à toutes les ressources

---

## Validation des Entrées

### Validation des Champs Requis

Les contrôleurs valident les champs requis avant toute opération:

```typescript
if (!departementId || montant_alloue === undefined || montant_alloue === null) {
  throw new BadRequestError('departementId et montant_alloue sont requis', 'MISSING_FIELDS')
}
```

### Validation des Types

```typescript
const montant = Number(montantStr)
if (isNaN(montant) || montant <= 0) {
  throw new BadRequestError('montant_alloue doit être un nombre positif', 'INVALID_AMOUNT')
}
```

### Validation des Valeurs Autorisées

```typescript
const validHotels = ['1', '2', '3', '4', '5', 'NON_INCLUS']
if (hotel && !validHotels.includes(hotel)) {
  throw new BadRequestError('Hotel doit être 1, 2, 3, 4, 5 ou NON_INCLUS', 'INVALID_HOTEL')
}
```

### Validation des Politiques

```typescript
async function verifierPolitiqueClasse(matricule: string, classe: string): Promise<void> {
  const politique = await prisma.politique.findUnique({ where: { matricule } })
  if (!politique) {
    return // pas de politique = pas de restriction
  }
  const classeUpper = classe.toUpperCase()
  const autorisations: Record<string, boolean> = {
    Y: politique.y,
    W: politique.w,
    J: politique.j,
    F: politique.f,
  }
  if (!autorisations[classeUpper]) {
    throw new ConflictError(
      `La classe ${classeUpper} n'est pas autorisée par la politique de l'employé`,
      'CLASSE_NON_AUTORISEE'
    )
  }
}
```

---

## Protection des Données Sensibles

### Mots de Passe

Les mots de passe sont hachés avec bcrypt avant stockage:

```typescript
import bcrypt from 'bcryptjs'
const hashedPassword = await bcrypt.hash(emp.mot_de_passe, 10)
```

**Configuration:**
- Algorithme: bcrypt
- Cost factor: 10 (équilibre sécurité/performance)

### Passeport

Les informations de passeport sont obligatoires pour les réservations:

```typescript
if (!user.numero_passport || !user.date_expiration_passport) {
  res.status(400).json({ 
    message: 'Les informations de passeport (numéro et date d\'expiration) sont obligatoires pour la réservation' 
  })
  return
}
```

### Audit Trail

Toutes les opérations budgétaires sont tracées dans `AuditBudget`:

```typescript
await prisma.auditBudget.create({
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
})
```

---

## Variables d'Environnement

### Fichier .env.example

Un fichier `.env.example` est fourni avec des placeholders sécurisés:

```env
# Database
DATA_BASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Admin credentials (DO NOT use weak passwords in production)
email_admin=admin@example.com
Mot_de_passe_admin=CHANGE_THIS_STRONG_PASSWORD

# JWT Secret (Generate a strong random string in production)
JWT_SECRET=CHANGE_THIS_TO_A_STRONG_RANDOM_SECRET

# Server
PORT=3000
FRONTEND_URL=http://localhost:5173

# Cloudflare R2 Storage
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-public-url.r2.dev

# Duffel API
DUFFEL_API_KEY=duffel_test_your_api_key
```

### .gitignore

Le fichier `.gitignore` empêche la commit des données sensibles:

```
# Environment variables
.env
.env.local
.env.production
```

---

## Recommandations pour la Production

### 1. Mots de Passe Forts

- Changer le mot de passe admin par défaut (`123456`)
- Utiliser un générateur de mots de passe forts
- Minimum 12 caractères, majuscules, minuscules, chiffres, caractères spéciaux

### 2. JWT Secret

- Générer un secret JWT fort et aléatoire:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
- Ne jamais partager le secret
- Le faire tourner régulièrement en production

### 3. Clés API

- Utiliser des clés API de production (pas de clés test)
- Roter les clés régulièrement
- Limiter les permissions des clés API

### 4. FRONTEND_URL

- Configurer avec l'URL de production du frontend
- Ne pas utiliser `*` ou des origines multiples
- Utiliser HTTPS en production

### 5. Base de Données

- Utiliser SSL/TLS pour la connexion
- Restreindre l'accès par IP
- Effectuer des sauvegardes régulières

### 6. Monitoring

- Surveiller les logs d'erreurs d'authentification
- Alerter sur les tentatives de brute force
- Surveiller les patterns de requêtes anormaux

---

## Checklist de Sécurité

- [x] Headers de sécurité (Helmet)
- [x] Rate limiting global
- [x] Rate limiting strict pour l'auth
- [x] CORS restrictif
- [x] Authentification JWT
- [x] Autorisation par rôle
- [x] Validation des entrées
- [x] Hachage des mots de passe
- [x] Audit trail des opérations
- [x] Variables d'environnement protégées
- [x] .gitignore configuré
- [ ] HTTPS en production
- [ ] Rotation des secrets
- [ ] Monitoring et alertes
