# API Documentation — Eazy Visa Plateforme Backend

> **Base URL** : `http://localhost:3000/api`  
> **Format** : JSON  
> **Authentification** : Bearer Token JWT (header `Authorization: Bearer <token>`)

---

## Rôles

| Rôle | Description |
|---|---|
| `SUPERADMIN` | Accès complet — credentials dans `.env` |
| `MANAGER` | Manager d'une entreprise — créé en base |
| `EMPLOYE` | Employé standard |
| `CONSULTANT` | Consultant externe |

---

## 1. Authentification

### POST `/api/auth/login/superadmin`

Connexion du superadmin (credentials depuis `.env`).

**Accès** : Public

**Body**
```json
{
  "email": "dieng0097@gmail.com",
  "mot_de_passe": "123456"
}
```

**Réponse 200**
```json
{
  "message": "Connexion réussie",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "superadmin": {
    "email": "dieng0097@gmail.com",
    "role": "SUPERADMIN"
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | Email et mot de passe requis |
| 401 | Email ou mot de passe incorrect |
| 500 | Configuration serveur manquante |

---

### POST `/api/auth/login`

Connexion d'un utilisateur enregistré en base (ADMIN, MANAGER, EMPLOYE, CONSULTANT).

**Accès** : Public

**Body**
```json
{
  "email": "awa@example.com",
  "mot_de_passe": "secret123"
}
```

**Réponse 200**
```json
{
  "message": "Connexion réussie",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "awa@example.com",
    "prenom": "Awa",
    "nom": "Diallo",
    "role": "ADMIN",
    "entrepriseId": 1
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | Email et mot de passe requis |
| 401 | Email ou mot de passe incorrect |
| 403 | Compte bloqué. Contactez votre administrateur. |
| 500 | Erreur serveur |

---

## 2. Entreprises

> **Accès requis** : Token `SUPERADMIN` pour toutes les routes entreprises.

### POST `/api/entreprises`

Créer une nouvelle entreprise. L'`identifiant` (6 caractères alphanum. majuscule) est **auto-généré et unique**.

**Accès** : SUPERADMIN

**Headers**
```
Authorization: Bearer <token_superadmin>
```

**Body**
```json
{
  "nom": "Acme Corp",
  "adresse": "123 Rue Principale",
  "pays": "Sénégal",
  "region": "Dakar",
  "ville": "Dakar",
  "logo": "https://cdn.example.workers.dev/logos/acme.png"
}
```

> `logo` est **optionnel** — URL Cloudflare de la photo hébergée.

**Réponse 201**
```json
{
  "message": "Entreprise créée avec succès",
  "identifiant_genere": "B7K2MX",
  "entreprise": {
    "id": 1,
    "nom": "Acme Corp",
    "identifiant": "B7K2MX",
    "adresse": "123 Rue Principale",
    "pays": "Sénégal",
    "region": "Dakar",
    "ville": "Dakar",
    "logo": "https://cdn.example.workers.dev/logos/acme.png",
    "is_active": true,
    "createdAt": "2026-06-30T09:00:00.000Z",
    "updatedAt": "2026-06-30T09:00:00.000Z"
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | Tous les champs sont requis : nom, adresse |
| 401 | Token manquant ou invalide |
| 403 | Accès réservé au superadmin |
| 409 | Cet identifiant existe déjà |

---

### GET `/api/entreprises`

Lister toutes les entreprises avec le nombre d'employés, triées par date de création.

**Accès** : SUPERADMIN

**Headers**
```
Authorization: Bearer <token_superadmin>
```

**Réponse 200**
```json
[
  {
    "id": 1,
    "nom": "Acme Corp",
    "identifiant": "B7K2MX",
    "adresse": "Dakar, Sénégal",
    "is_active": true,
    "createdAt": "2026-06-30T09:00:00.000Z",
    "updatedAt": "2026-06-30T09:00:00.000Z",
    "_count": {
      "users": 5
    }
  }
]
```

---

### GET `/api/entreprises/:id`

Récupérer une entreprise avec la liste de ses employés.

**Accès** : SUPERADMIN

**Paramètre URL** : `id` (entier)

**Réponse 200**
```json
{
  "id": 1,
  "nom": "Acme Corp",
  "identifiant": "B7K2MX",
  "adresse": "Dakar, Sénégal",
  "is_active": true,
  "createdAt": "2026-06-30T09:00:00.000Z",
  "updatedAt": "2026-06-30T09:00:00.000Z",
  "users": [
    {
      "id": 1,
      "prenom": "Awa",
      "nom": "Diallo",
      "email": "awa@example.com",
      "poste": "Gestionnaire",
      "departement": "RH",
      "role": "ADMIN"
    }
  ]
}
```

**Erreurs**
| Code | Message |
|---|---|
| 404 | Entreprise non trouvée |

---

### PUT `/api/entreprises/:id`

Modifier les informations d'une entreprise. Tous les champs sont optionnels.

> `identifiant` et `matricule` sont **non modifiables** après création.

**Accès** : SUPERADMIN

**Paramètre URL** : `id` (entier)

**Body** *(tous les champs sont optionnels)*
```json
{
  "nom": "Nouveau nom",
  "adresse": "Nouvelle adresse",
  "pays": "Sénégal",
  "region": "Thiès",
  "ville": "Thiès",
  "logo": "https://cdn.example.workers.dev/logos/new.png"
}
```

**Réponse 200**
```json
{
  "message": "Entreprise mise à jour",
  "entreprise": {
    "id": 1,
    "nom": "Nouveau nom",
    "identifiant": "B7K2MX",
    "adresse": "Nouvelle adresse",
    "pays": "Sénégal",
    "region": "Thiès",
    "ville": "Thiès",
    "logo": "https://cdn.example.workers.dev/logos/new.png",
    "is_active": true,
    "createdAt": "2026-06-30T09:00:00.000Z",
    "updatedAt": "2026-06-30T09:30:00.000Z"
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 404 | Entreprise non trouvée |

---

### GET `/api/entreprises/:id/logo`

Obtenir une URL signée (valide 1h) pour afficher le logo de l'entreprise.

**Accès** : SUPERADMIN

**Paramètre URL** : `id` (entier)

**Réponse 200**
```json
{
  "logo_url": "https://4abec97e.r2.cloudflarestorage.com/logos/entreprises/1-uuid.png?X-Amz-Signature=..."
}
```

> Utiliser `logo_url` directement comme `src` d'une balise `<img>`.

**Erreurs**
| Code | Message |
|---|---|
| 404 | Entreprise non trouvée |
| 404 | Aucun logo pour cette entreprise |

---

### PATCH `/api/entreprises/:id/logo`

Uploader ou remplacer le logo d'une entreprise. Hébergé sur **Cloudflare R2** (accès sécurisé par URL signée).  
L'ancien logo est automatiquement supprimé du bucket.

**Accès** : SUPERADMIN

**Content-Type** : `multipart/form-data`

**Paramètre URL** : `id` (entier)

**Body** : champ `logo` (fichier image — max 5 Mo, formats acceptés : `image/*`)

**Réponse 200**
```json
{
  "message": "Logo mis à jour avec succès",
  "logo_url": "https://4abec97e.r2.cloudflarestorage.com/logos/entreprises/1-uuid.png?X-Amz-Signature=...",
  "entreprise": {
    "id": 1,
    "nom": "Acme Corp",
    "logo": "logos/entreprises/1-uuid.png",
    "logo_url": "https://4abec97e.r2.cloudflarestorage.com/..."
  }
}
```

> `logo` en base = clé R2 (chemin interne).  
> `logo_url` = URL signée valide **1 heure**, à utiliser pour afficher l'image.

**Erreurs**
| Code | Message |
|---|---|
| 400 | Fichier image requis |
| 400 | Seules les images sont acceptées |
| 404 | Entreprise non trouvée |

---

### PATCH `/api/entreprises/:id/statut`

Bloquer ou activer une entreprise (bascule automatique de `is_active`).

**Accès** : SUPERADMIN

**Paramètre URL** : `id` (entier)

**Body** : *(aucun)*

**Réponse 200 — activation**
```json
{
  "message": "Entreprise activée",
  "entreprise": {
    "id": 1,
    "is_active": true,
    ...
  }
}
```

**Réponse 200 — blocage**
```json
{
  "message": "Entreprise bloquée",
  "entreprise": {
    "id": 1,
    "is_active": false,
    ...
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 404 | Entreprise non trouvée |

---

## 3. Départements

> Les départements doivent être créés avant de pouvoir y affecter des employés.  
> Chaque département appartient à une entreprise.

### POST `/api/departements`

Créer un département pour une entreprise.

**Accès** : SUPERADMIN ou MANAGER (uniquement sa propre entreprise)

**Body**
```json
{
  "nom": "Ressources Humaines",
  "entrepriseId": 1
}
```

**Réponse 201**
```json
{
  "message": "Département créé avec succès",
  "departement": { "id": 1, "nom": "Ressources Humaines", "entrepriseId": 1 }
}
```

---

### GET `/api/departements/mon-entreprise`

Lister les départements de l'**entreprise de l'utilisateur connecté** (depuis le token JWT).  
Aucun paramètre requis.

**Accès** : SUPERADMIN ou MANAGER

**Réponse 200**
```json
{
  "total": 2,
  "departements": [
    { "id": 1, "nom": "Ressources Humaines", "entrepriseId": 1, "_count": { "users": 5 } },
    { "id": 2, "nom": "Informatique", "entrepriseId": 1, "_count": { "users": 3 } }
  ]
}
```

---

### GET `/api/departements?entrepriseId=1`

Lister les départements d'une entreprise *(nécessite `entrepriseId` en query param).*

**Accès** : SUPERADMIN ou MANAGER

**Réponse 200**
```json
{
  "total": 2,
  "departements": [
    { "id": 1, "nom": "Ressources Humaines", "entrepriseId": 1, "_count": { "users": 5 } },
    { "id": 2, "nom": "Informatique", "entrepriseId": 1, "_count": { "users": 3 } }
  ]
}
```

---

### PUT `/api/departements/:id`

Modifier le nom d'un département.

**Accès** : SUPERADMIN ou MANAGER

**Body** : `{ "nom": "Nouveau nom" }`

---

### DELETE `/api/departements/:id`

Supprimer un département *(impossible s'il contient encore des employés).*

**Accès** : SUPERADMIN ou MANAGER

---

## 4. Budgets Annuels

> **Accès requis** : Token `SUPERADMIN` ou `MANAGER` (uniquement sa propre entreprise).  
> Un MANAGER ne peut créer, modifier, supprimer ou consulter que les budgets de son entreprise.

### POST `/api/budgets-annuels`

Créer un budget annuel pour une entreprise. La `reference` (8 caractères alphanum. majuscule) est **auto-générée et unique**.

**Accès** : SUPERADMIN ou MANAGER

**Body**
```json
{
  "identifiant_entreprise": "B7K2MX",
  "annee": 2026,
  "date_debut": "2026-01-01",
  "date_fin": "2026-12-31",
  "budget": 50000000
}
```

> Pour un **SUPERADMIN**, `identifiant_entreprise` ou `entrepriseId` est requis.  
> Pour un **MANAGER**, l'entreprise est automatiquement déduite du token JWT.

**Réponse 201**
```json
{
  "message": "Budget annuel créé avec succès",
  "budgetAnnuel": {
    "id": 1,
    "reference": "X7B9K2M1",
    "identifiant_entreprise": "B7K2MX",
    "annee": 2026,
    "date_debut": "2026-01-01T00:00:00.000Z",
    "date_fin": "2026-12-31T00:00:00.000Z",
    "budget": "50000000",
    "est_active": false,
    "est_cloture": false,
    "createdAt": "2026-06-30T15:00:00.000Z"
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | annee, date_debut, date_fin et budget sont requis |
| 400 | identifiant_entreprise ou entrepriseId requis (SUPERADMIN) |
| 403 | Aucune entreprise associée à ce compte |
| 404 | Entreprise non trouvée |

---

### GET `/api/budgets-annuels`

Lister les budgets annuels.

**Accès** : SUPERADMIN (tous) ou MANAGER (uniquement son entreprise)

**Réponse 200**
```json
{
  "total": 2,
  "budgets": [
    {
      "id": 1,
      "reference": "X7B9K2M1",
      "identifiant_entreprise": "B7K2MX",
      "annee": 2026,
      "date_debut": "2026-01-01T00:00:00.000Z",
      "date_fin": "2026-12-31T00:00:00.000Z",
      "budget": "50000000",
      "est_active": true,
      "est_cloture": false,
      "createdAt": "2026-06-30T15:00:00.000Z",
      "entreprise": { "id": 1, "nom": "Acme Corp", "identifiant": "B7K2MX" },
      "_count": { "budgetDepartements": 3, "budgetPersonnels": 10 }
    }
  ]
}
```

---

### GET `/api/budgets-annuels/:id`

Récupérer un budget annuel avec ses budgets départementaux et personnels.

**Accès** : SUPERADMIN ou MANAGER

**Paramètre URL** : `id` (entier)

**Réponse 200**
```json
{
  "id": 1,
  "reference": "X7B9K2M1",
  "identifiant_entreprise": "B7K2MX",
  "annee": 2026,
  "date_debut": "2026-01-01T00:00:00.000Z",
  "date_fin": "2026-12-31T00:00:00.000Z",
  "budget": "50000000",
  "est_active": true,
  "est_cloture": false,
  "createdAt": "2026-06-30T15:00:00.000Z",
  "entreprise": { "id": 1, "nom": "Acme Corp", "identifiant": "B7K2MX" },
  "budgetDepartements": [
    {
      "id": 1,
      "reference": "X7B9K2M1",
      "departementId": 1,
      "montant_alloue": "15000000",
      "montant_utilise": "2000000",
      "montant_restant": "13000000",
      "createdAt": "2026-06-30T15:00:00.000Z",
      "departement": { "id": 1, "nom": "Ressources Humaines" }
    }
  ],
  "budgetPersonnels": [
    {
      "id": 1,
      "reference": "X7B9K2M1",
      "matricule": "A3T9KL",
      "montant_alloue": "500000",
      "montant_utilise": "50000",
      "montant_restant": "450000",
      "createdAt": "2026-06-30T15:00:00.000Z",
      "user": { "id": 1, "prenom": "Awa", "nom": "Diallo", "matricule": "A3T9KL" }
    }
  ]
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Budget annuel non trouvé |

---

### PUT `/api/budgets-annuels/:id`

Modifier un budget annuel. Impossible si le budget est **clôturé**.

**Accès** : SUPERADMIN ou MANAGER

**Paramètre URL** : `id` (entier)

**Body** *(tous optionnels)*
```json
{
  "annee": 2027,
  "date_debut": "2027-01-01",
  "date_fin": "2027-12-31",
  "budget": 60000000
}
```

**Réponse 200**
```json
{
  "message": "Budget annuel mis à jour",
  "budgetAnnuel": { ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Budget annuel non trouvé |
| 409 | Impossible de modifier un budget annuel clôturé |

---

### DELETE `/api/budgets-annuels/:id`

Supprimer un budget annuel. Impossible s'il est lié à des budgets départementaux ou personnels.

**Accès** : SUPERADMIN ou MANAGER

**Paramètre URL** : `id` (entier)

**Réponse 200**
```json
{ "message": "Budget annuel supprimé avec succès" }
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Budget annuel non trouvé |
| 409 | Impossible de supprimer : ce budget est lié à des budgets départementaux ou personnels |

---

### PATCH `/api/budgets-annuels/:id/activer`

Activer un budget annuel. Impossible s'il est déjà activé ou clôturé.

**Accès** : SUPERADMIN ou MANAGER

**Paramètre URL** : `id` (entier)

**Réponse 200**
```json
{
  "message": "Budget annuel activé",
  "budgetAnnuel": { "id": 1, "est_active": true, ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Budget annuel non trouvé |
| 409 | Ce budget annuel est déjà activé |
| 409 | Impossible d'activer un budget annuel clôturé |

---

### PATCH `/api/budgets-annuels/:id/cloturer`

Clôturer un budget annuel. Le budget doit être **activé** et ne pas être déjà clôturé.

**Accès** : SUPERADMIN ou MANAGER

**Paramètre URL** : `id` (entier)

**Réponse 200**
```json
{
  "message": "Budget annuel clôturé",
  "budgetAnnuel": { "id": 1, "est_cloture": true, ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Budget annuel non trouvé |
| 409 | Impossible de clôturer un budget annuel non activé |
| 409 | Ce budget annuel est déjà clôturé |

---

## 4.1 Allocation des budgets

> Ces endpoints permettent d'allouer le budget annuel aux départements et aux personnels.  
> Le `montant_restant` du budget annuel et des budgets départementaux est mis à jour automatiquement.  
> **Accès** : SUPERADMIN ou MANAGER (uniquement sa propre entreprise).

### POST `/api/budgets-annuels/:reference/departements`

Allouer un budget à un département à partir d'un budget annuel.

**Paramètre URL** : `reference` du budget annuel (ex: `X7B9K2M1`)

**Body**
```json
{
  "departementId": 1,
  "montant_alloue": 15000000
}
```

**Réponse 201**
```json
{
  "message": "Budget département alloué avec succès",
  "budgetDepartement": {
    "id": 1,
    "reference": "X7B9K2M1",
    "departementId": 1,
    "montant_alloue": "15000000",
    "montant_utilise": "0",
    "montant_restant": "15000000",
    "createdAt": "2026-06-30T15:00:00.000Z"
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | departementId et montant_alloue sont requis |
| 400 | montant_alloue doit être un nombre positif |
| 403 | Accès non autorisé |
| 404 | Budget annuel non trouvé |
| 404 | Département non trouvé |
| 409 | Le budget annuel doit être activé pour allouer |
| 409 | Impossible d'allouer sur un budget clôturé |
| 409 | Ce département a déjà un budget alloué pour cette référence |
| 409 | Montant alloué supérieur au restant du budget annuel |

---

### POST `/api/budgets-annuels/:reference/personnels`

Allouer un budget à un personnel. Deux modes possibles :

- **Direct** (depuis le budget annuel) : ne pas fournir `departementId`
- **Via département** : fournir `departementId` pour prélever sur le budget du département

**Paramètre URL** : `reference` du budget annuel

**Body**
```json
{
  "matricule": "A3T9KL",
  "montant_alloue": 500000,
  "departementId": 1
}
```

> `departementId` est **optionnel**. S'il est fourni, le montant est prélevé sur le budget du département (l'utilisateur doit appartenir à ce département).

**Réponse 201 — via département**
```json
{
  "message": "Budget personnel alloué via département avec succès",
  "budgetPersonnel": {
    "id": 1,
    "reference": "X7B9K2M1",
    "matricule": "A3T9KL",
    "montant_alloue": "500000",
    "montant_utilise": "0",
    "montant_restant": "500000",
    "createdAt": "2026-06-30T15:00:00.000Z"
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | matricule et montant_alloue sont requis |
| 400 | montant_alloue doit être un nombre positif |
| 403 | Accès non autorisé |
| 404 | Budget annuel non trouvé |
| 404 | Utilisateur non trouvé |
| 404 | Budget département non trouvé (si departementId fourni) |
| 409 | Le budget annuel doit être activé pour allouer |
| 409 | Impossible d'allouer sur un budget clôturé |
| 409 | Cet utilisateur a déjà un budget alloué pour cette référence |
| 409 | L'utilisateur n'appartient pas au département spécifié |
| 409 | Montant alloué supérieur au restant |

---

### GET `/api/budgets-annuels/:reference/departements`

Lister les budgets départementaux d'un budget annuel.

**Paramètre URL** : `reference`

**Réponse 200**
```json
{
  "total": 2,
  "budgets": [
    {
      "id": 1,
      "reference": "X7B9K2M1",
      "departementId": 1,
      "montant_alloue": "15000000",
      "montant_utilise": "2000000",
      "montant_restant": "13000000",
      "createdAt": "2026-06-30T15:00:00.000Z",
      "departement": { "id": 1, "nom": "Ressources Humaines" }
    }
  ]
}
```

---

### GET `/api/budgets-annuels/:reference/personnels`

Lister les budgets personnels d'un budget annuel.

**Paramètre URL** : `reference`

**Réponse 200**
```json
{
  "total": 2,
  "budgets": [
    {
      "id": 1,
      "reference": "X7B9K2M1",
      "matricule": "A3T9KL",
      "montant_alloue": "500000",
      "montant_utilise": "50000",
      "montant_restant": "450000",
      "createdAt": "2026-06-30T15:00:00.000Z",
      "user": {
        "id": 1,
        "prenom": "Awa",
        "nom": "Diallo",
        "matricule": "A3T9KL",
        "departement": { "id": 1, "nom": "Ressources Humaines" }
      }
    }
  ]
}
```

---

### PUT `/api/budgets-annuels/departements/:id`

Modifier le montant alloué d'un budget département.

**Paramètre URL** : `id` (entier)

**Body**
```json
{ "montant_alloue": 20000000 }
```

**Réponse 200**
```json
{
  "message": "Budget département mis à jour",
  "budgetDepartement": { ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Budget département non trouvé |
| 409 | Impossible de modifier sur un budget clôturé |
| 409 | Augmentation supérieure au restant du budget annuel |
| 409 | Le nouveau montant ne peut pas être inférieur au montant déjà utilisé |

---

### DELETE `/api/budgets-annuels/departements/:id`

Supprimer un budget département (impossible s'il a des budgets personnels liés).

**Paramètre URL** : `id` (entier)

**Réponse 200**
```json
{ "message": "Budget département supprimé avec succès" }
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Budget département non trouvé |
| 409 | Impossible de supprimer sur un budget clôturé |
| 409 | Impossible de supprimer : des budgets personnels sont liés à ce budget annuel |

---

### PUT `/api/budgets-annuels/personnels/:id`

Modifier le montant alloué d'un budget personnel.

**Paramètre URL** : `id` (entier)

**Body**
```json
{ "montant_alloue": 750000 }
```

**Réponse 200**
```json
{
  "message": "Budget personnel mis à jour",
  "budgetPersonnel": { ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Budget personnel non trouvé |
| 409 | Impossible de modifier sur un budget clôturé |
| 409 | Augmentation supérieure au restant |
| 409 | Le nouveau montant ne peut pas être inférieur au montant déjà utilisé |

---

### DELETE `/api/budgets-annuels/personnels/:id`

Supprimer un budget personnel.

**Paramètre URL** : `id` (entier)

**Réponse 200**
```json
{ "message": "Budget personnel supprimé avec succès" }
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Budget personnel non trouvé |
| 409 | Impossible de supprimer sur un budget clôturé |

---

## 5. Employés

### POST `/api/employes`

Créer un ou plusieurs employés pour une entreprise en une seule requête.  
Le `matricule` (6 caractères alphanum. majuscule) est **auto-généré et unique** pour chaque employé.  
Les doublons d'email sont ignorés silencieusement (`skipDuplicates`).

**Accès** : SUPERADMIN ou MANAGER (uniquement pour sa propre entreprise)

**Headers**
```
Authorization: Bearer <token>
```

**Body**
```json
{
  "entrepriseId": 1,
  "employes": [
    {
      "prenom": "Awa",
      "nom": "Diallo",
      "email": "awa@example.com",
      "departement": "Ressources Humaines",
      "poste": "Gestionnaire",
      "telephone": "77 000 00 00",
      "mot_de_passe": "secret123",
      "role": "MANAGER"
    },
    {
      "prenom": "Moussa",
      "nom": "Sow",
      "email": "moussa@example.com",
      "departement": "Informatique",
      "poste": "Développeur",
      "telephone": "78 111 11 11",
      "mot_de_passe": "pass456"
    }
  ]
}
```

> **Note** : `role` est optionnel — valeur par défaut : `EMPLOYE`.  
> Valeurs possibles : `MANAGER` | `EMPLOYE` | `CONSULTANT`  
> `departement` doit correspondre au **nom exact** d'un département existant pour l'entreprise (insensible à la casse).

**Réponse 201**
```json
{
  "message": "2 employé(s) créé(s) avec succès",
  "total_demande": 2,
  "total_cree": 2,
  "ignores": 0,
  "employes": [
    {
      "id": 1,
      "prenom": "Awa",
      "nom": "Diallo",
      "email": "awa@example.com",
      "matricule": "A3T9KL",
      "departementId": 1,
      "departement": { "id": 1, "nom": "Ressources Humaines" },
      "poste": "Gestionnaire",
      "telephone": "77 000 00 00",
      "role": "MANAGER",
      "entrepriseId": 1,
      "createdAt": "2026-06-30T09:00:00.000Z"
    }
  ]
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | `entrepriseId` et un tableau `employes[]` non vide sont requis |
| 400 | Employé #N : champs manquants — prenom, email, ... |
| 400 | Employé #N : département "X" non trouvé pour cette entreprise |
| 400 | L'entreprise est désactivée |
| 401 | Token manquant ou invalide |
| 403 | Vous ne pouvez créer des employés que pour votre propre entreprise (MANAGER) |
| 404 | Entreprise non trouvée |

---

### GET `/api/employes`

Retourner la liste de tous les employés.

**Accès** : SUPERADMIN (tous les employés) ou MANAGER (uniquement son entreprise)

**Réponse 200**
```json
{
  "total": 2,
  "employes": [
    {
      "id": 1,
      "prenom": "Awa",
      "nom": "Diallo",
      "email": "awa@example.com",
      "matricule": "A3T9KL",
      "departementId": 1,
      "departement": { "id": 1, "nom": "Ressources Humaines" },
      "poste": "Gestionnaire",
      "telephone": "77 000 00 00",
      "role": "MANAGER",
      "is_block": false,
      "entrepriseId": 1,
      "entreprise": { "nom": "Acme Corp", "identifiant": "B7K2MX" },
      "createdAt": "2026-06-30T09:00:00.000Z",
      "updatedAt": "2026-06-30T09:00:00.000Z"
    }
  ]
}
```

---

### GET `/api/employes/search`

Rechercher des employés par **matricule**, **email**, **téléphone** ou **nom d'entreprise** (recherche partielle insensible à la casse).

**Accès** : SUPERADMIN ou MANAGER (limité à son entreprise)

**Query param** : `q` — valeur à rechercher

**Exemples**
- `/api/employes/search?q=A3T9KL` — par matricule
- `/api/employes/search?q=awa@example.com` — par email
- `/api/employes/search?q=77 000 00 00` — par téléphone
- `/api/employes/search?q=Acme` — par nom d'entreprise (retourne tous les employés de l'entreprise)

**Réponse 200**
```json
{
  "total": 1,
  "employes": [
    {
      "id": 1,
      "prenom": "Awa",
      "nom": "Diallo",
      "email": "awa@example.com",
      "matricule": "A3T9KL",
      "departementId": 1,
      "departement": { "id": 1, "nom": "Ressources Humaines" },
      "poste": "Gestionnaire",
      "telephone": "77 000 00 00",
      "role": "MANAGER",
      "is_block": false,
      "entrepriseId": 1,
      "entreprise": { "nom": "Acme Corp", "identifiant": "B7K2MX" },
      "createdAt": "2026-06-30T09:00:00.000Z",
      "updatedAt": "2026-06-30T09:00:00.000Z"
    }
  ]
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | Paramètre q requis (matricule, email ou téléphone) |
| 404 | Aucun employé trouvé |

---

### GET `/api/employes/:id`

Récupérer les informations complètes d'un employé par son `id`.

**Accès** : SUPERADMIN ou MANAGER (limité à son entreprise)

**Paramètre URL** : `id` (entier)

**Réponse 200** : même structure que `/search`

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Employé non trouvé |

---

### PUT `/api/employes/:id`

Modifier les informations d'un employé. Tous les champs sont optionnels.

> `matricule` est **non modifiable**.  
> `departement` prend le **nom** d'un département existant pour l'entreprise.

**Accès** : SUPERADMIN ou MANAGER (limité à son entreprise)

**Paramètre URL** : `id` (entier)

**Body** *(tous optionnels)*
```json
{
  "prenom": "Awa",
  "nom": "Diallo",
  "email": "awa-new@example.com",
  "departement": "Finance",
  "poste": "Comptable",
  "telephone": "77 999 99 99",
  "role": "EMPLOYE",
  "mot_de_passe": "nouveauMotDePasse"
}
```

**Réponse 200**
```json
{
  "message": "Employé mis à jour",
  "employe": { ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Employé non trouvé |
| 400 | Département "X" non trouvé pour cette entreprise |
| 409 | Cet email existe déjà |

---

### PATCH `/api/employes/:id/bloquer`

Bloquer ou débloquer un employé (bascule automatique de `is_block`).  
Un employé bloqué ne peut plus se connecter.

**Accès** : SUPERADMIN ou MANAGER (limité à son entreprise)

**Paramètre URL** : `id` (entier)

**Body** : *(aucun)*

**Réponse 200 — blocage**
```json
{
  "message": "Employé bloqué",
  "employe": { "id": 1, "is_block": true, ... }
}
```

**Réponse 200 — déblocage**
```json
{
  "message": "Employé débloqué",
  "employe": { "id": 1, "is_block": false, ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Employé non trouvé |

---

### DELETE `/api/employes/:id`

Supprimer définitivement un employé.

**Accès** : SUPERADMIN ou MANAGER (limité à son entreprise)

**Paramètre URL** : `id` (entier)

**Réponse 200**
```json
{ "message": "Employé supprimé avec succès" }
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Employé non trouvé |

---

## Codes de statut HTTP

| Code | Signification |
|---|---|
| 200 | Succès |
| 201 | Ressource créée |
| 400 | Requête invalide (champ manquant ou incorrect) |
| 401 | Non authentifié (token absent ou expiré) |
| 403 | Non autorisé (rôle insuffisant) |
| 404 | Ressource non trouvée |
| 409 | Conflit (doublon) |
| 500 | Erreur interne serveur |

---

## Codes auto-générés

| Champ | Modèle | Format | Exemple |
|---|---|---|---|
| `identifiant` | Entreprise | 6 car. `[A-Z0-9]` | `B7K2MX` |
| `matricule` | User (Employé) | 6 car. `[A-Z0-9]` | `A3T9KL` |
| `reference` | BudgetAnnuel | 8 car. `[A-Z0-9]` | `X7B9K2M1` |

L'unicité est garantie à deux niveaux :
- **Applicatif** : vérification en boucle avant insertion + exclusion intra-lot
- **Base de données** : contrainte `@unique` sur les deux champs
