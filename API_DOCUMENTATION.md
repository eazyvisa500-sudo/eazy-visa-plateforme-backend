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

## 0. Dashboard

### GET `/api/dashboard/overview`

Vue d'ensemble pour les managers et superadmins, incluant les statistiques de l'entreprise.

**Accès** : SUPERADMIN ou MANAGER

**Headers**
```
Authorization: Bearer <token>
```

**Query params**
| Paramètre | Type | Description | Défaut |
|---|---|---|---|
| annee | number | Année pour filtrer les données | Année courante |

**Exemple**
```
GET /api/dashboard/overview?annee=2026
```

**Réponse 200**
```json
{
  "entreprise": {
    "totalEmployes": 25,
    "totalDepartements": 5
  },
  "demandesVoyage": {
    "total": 15,
    "parStatut": [
      { "statut": "EN_ATTENTE", "count": 5 },
      { "statut": "APPROUVEE", "count": 8 },
      { "statut": "REJETEE", "count": 2 }
    ],
    "dernes": [...]
  },
  "reservations": {
    "billets": {
      "total": 10,
      "parStatut": [
        { "statut": "EN_ATTENTE", "count": 3 },
        { "statut": "EMISE", "count": 7 }
      ]
    },
    "hotels": {
      "total": 8,
      "parStatut": [
        { "statut": "EN_ATTENTE", "count": 2 },
        { "statut": "CONFIRMEE", "count": 6 }
      ]
    },
    "dernieres": [...]
  },
  "budget": {
    "annuel": {
      "annee": 2026,
      "budget": 50000000,
      "montant_restant": 25000000,
      "nombreBudgets": 1,
      "details": [
        {
          "reference": "BUD-2026",
          "budget": 50000000,
          "montant_restant": 25000000,
          "est_active": true,
          "est_cloture": false
        }
      ]
    },
    "departements": {
      "total": 5,
      "totalAlloue": 50000000,
      "totalUtilise": 25000000,
      "totalRestant": 25000000,
      "details": [...]
    },
    "personnels": {
      "total": 25,
      "totalAlloue": 30000000,
      "totalUtilise": 15000000,
      "totalRestant": 15000000,
      "details": [...]
    }
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 500 | Erreur lors de la récupération de la vue d'ensemble |

---

### GET `/api/dashboard/details`

Vue détaillée pour les managers et superadmins, incluant toutes les données de l'entreprise.

**Accès** : SUPERADMIN ou MANAGER

**Headers**
```
Authorization: Bearer <token>
```

**Query params**
| Paramètre | Type | Description | Défaut |
|---|---|---|---|
| annee | number | Année pour filtrer les données | Année courante |

**Exemple**
```
GET /api/dashboard/details?annee=2026
```

**Réponse 200**
```json
{
  "entreprise": {
    "employes": [
      {
        "id": 1,
        "prenom": "Awa",
        "nom": "Diallo",
        "email": "awa@example.com",
        "matricule": "A3T9KL",
        "poste": "Gestionnaire",
        "telephone": "77 000 00 00",
        "role": "MANAGER",
        "is_block": false,
        "departement": "Ressources Humaines",
        "civilite": "Mme",
        "genre": "F",
        "numero_passport": "123456789",
        "date_expiration_passport": "2030-01-15",
        "createdAt": "2026-06-30T09:00:00.000Z"
      }
    ],
    "departements": [
      {
        "id": 1,
        "nom": "Ressources Humaines",
        "nombreEmployes": 5
      }
    ]
  },
  "demandesVoyage": [
    {
      "id": 1,
      "matricule": "A3T9KL",
      "depart": "Dakar",
      "arrive": "Paris",
      "allerRetour": true,
      "dateDepart": "2026-08-01T10:00:00.000Z",
      "dateRetour": "2026-08-10T10:00:00.000Z",
      "classe": "J",
      "hotel": "4",
      "ville": "Paris",
      "motif": "Réunion client",
      "statut": "APPROUVEE",
      "commentaire": null,
      "user": { ... },
      "createdAt": "2026-07-02T14:00:00.000Z"
    }
  ],
  "reservations": {
    "billets": [
      {
        "id": 1,
        "demandeVoyageId": 10,
        "matricule": "A3T9KL",
        "numeroReservation": "RES-1719876543210",
        "numeroOrder": "ord_0000B7xJ48O26NuJhCgNSn",
        "compagnieAerienne": "Air France",
        "numeroVolAller": "AF123",
        "numeroVolRetour": "AF456",
        "dateVolDepart": "2026-08-01T10:00:00.000Z",
        "dateVolArrivee": "2026-08-01T14:00:00.000Z",
        "dateVolRetourDepart": "2026-08-10T10:00:00.000Z",
        "dateVolRetourArrivee": "2026-08-10T14:00:00.000Z",
        "aeroportDepart": "DKR",
        "aeroportArrivee": "CDG",
        "classe": "J",
        "prix": 500000,
        "devise": "XOF",
        "statut": "EMISE",
        "numeroBillet": "BIL-123456",
        "dateEmission": "2026-07-02T15:00:00.000Z",
        "commentaire": null,
        "user": { ... },
        "createdAt": "2026-07-02T15:00:00.000Z"
      }
    ],
    "hotels": [
      {
        "id": 1,
        "demandeVoyageId": 10,
        "nomHotel": "Hilton Paris",
        "categorie": "4",
        "adresse": "1 Avenue des Champs-Élysées",
        "ville": "Paris",
        "pays": "France",
        "dateArrivee": "2026-08-01T15:00:00.000Z",
        "dateDepart": "2026-08-10T11:00:00.000Z",
        "nombreNuits": 9,
        "prixParNuit": 50000,
        "prixTotal": 450000,
        "devise": "XOF",
        "statut": "CONFIRMEE",
        "numeroConfirmation": "CONF-789012",
        "commentaire": null,
        "user": { ... },
        "createdAt": "2026-07-02T16:00:00.000Z"
      }
    ]
  },
  "budget": {
    "annuel": {
      "annee": 2026,
      "budget": 50000000,
      "montant_restant": 25000000,
      "nombreBudgets": 1,
      "details": [
        {
          "id": 1,
          "reference": "BUD-2026",
          "identifiant_entreprise": "B7K2MX",
          "annee": 2026,
          "budget": 50000000,
          "montant_restant": 25000000,
          "est_active": true,
          "est_cloture": false,
          "date_debut": "2026-01-01T00:00:00.000Z",
          "date_fin": "2026-12-31T23:59:59.000Z",
          "createdAt": "2026-01-01T00:00:00.000Z"
        }
      ]
    },
    "departements": [
      {
        "id": 1,
        "reference": "BUD-2026",
        "departement": "Ressources Humaines",
        "departementId": 1,
        "montant_alloue": 10000000,
        "montant_utilise": 5000000,
        "montant_restant": 5000000,
        "bloquer": false,
        "createdAt": "2026-01-01T00:00:00.000Z"
      }
    ],
    "personnels": [
      {
        "id": 1,
        "reference": "BUD-2026",
        "matricule": "A3T9KL",
        "user": { ... },
        "montant_alloue": 2000000,
        "montant_utilise": 1000000,
        "montant_restant": 1000000,
        "bloquer": false,
        "createdAt": "2026-01-01T00:00:00.000Z"
      }
    ],
    "audit": [
      {
        "id": 1,
        "reference": "BUD-2026",
        "action": "DEDUCTION",
        "type_source": "BUDGET_PERSONNEL",
        "type_destination": "RESERVATION",
        "montant": 500000,
        "montant_avant": 1500000,
        "montant_apres": 1000000,
        "description": "Réservation de vol",
        "effectue_par": "Awa Diallo",
        "effectue_par_id": 1,
        "role_effectue_par": "MANAGER",
        "target_matricule": "A3T9KL",
        "createdAt": "2026-07-02T15:00:00.000Z"
      }
    ]
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 500 | Erreur lors de la récupération des détails |

---

### GET `/api/dashboard/global-analytics`

Analytiques globales pour le superadmin, incluant les statistiques de toutes les entreprises.

**Accès** : SUPERADMIN uniquement

**Headers**
```
Authorization: Bearer <token>
```

**Query params**
| Paramètre | Type | Description | Défaut |
|---|---|---|---|
| annee | number | Année pour filtrer les données | Année courante |

**Exemple**
```
GET /api/dashboard/global-analytics?annee=2026
```

**Réponse 200**
```json
{
  "annee": 2026,
  "entreprises": {
    "total": 10,
    "actives": 8,
    "inactives": 2,
    "topEmployes": [
      {
        "id": 1,
        "nom": "Acme Corp",
        "identifiant": "ENT-001",
        "is_active": true,
        "totalEmployes": 50,
        "totalDepartements": 5,
        "totalDemandesVoyage": 120,
        "forfait": {
          "nombre_user_autorise": 100,
          "nombre_user_actuel": 50
        }
      }
    ],
    "topDemandes": [...],
    "details": [...]
  },
  "utilisateurs": {
    "total": 250,
    "managers": 10,
    "employes": 220,
    "consultants": 20,
    "bloques": 5
  },
  "departements": {
    "total": 30
  },
  "demandesVoyage": {
    "total": 500,
    "parStatut": [
      { "statut": "EN_ATTENTE", "count": 50 },
      { "statut": "APPROUVEE", "count": 300 },
      { "statut": "REJETEE", "count": 30 },
      { "statut": "ANNULEE", "count": 20 },
      { "statut": "EN_COURS", "count": 80 },
      { "statut": "TERMINEE", "count": 20 }
    ],
    "mensuelles": [
      { "mois": 1, "count": 40 },
      { "mois": 2, "count": 35 },
      { "mois": 3, "count": 45 },
      { "mois": 4, "count": 50 },
      { "mois": 5, "count": 55 },
      { "mois": 6, "count": 60 },
      { "mois": 7, "count": 65 },
      { "mois": 8, "count": 70 },
      { "mois": 9, "count": 75 },
      { "mois": 10, "count": 80 },
      { "mois": 11, "count": 85 },
      { "mois": 12, "count": 90 }
    ]
  },
  "reservations": {
    "billets": {
      "total": 400,
      "parStatut": [
        { "statut": "EN_ATTENTE", "count": 50 },
        { "statut": "CONFIRMEE", "count": 100 },
        { "statut": "EMISE", "count": 200 },
        { "statut": "ANNULEE", "count": 30 },
        { "statut": "REMBOURSEE", "count": 20 }
      ]
    },
    "hotels": {
      "total": 150,
      "parStatut": [
        { "statut": "EN_ATTENTE", "count": 30 },
        { "statut": "CONFIRMEE", "count": 80 },
        { "statut": "ANNULEE", "count": 20 },
        { "statut": "REMBOURSEE", "count": 20 }
      ]
    }
  },
  "budget": {
    "annuel": {
      "total": 500000000,
      "montant_restant": 250000000,
      "nombreBudgets": 10,
      "actifs": 8,
      "clotures": 2
    },
    "departements": {
      "total": 30,
      "totalAlloue": 300000000,
      "totalUtilise": 150000000,
      "totalRestant": 150000000,
      "bloques": 3
    },
    "personnels": {
      "total": 250,
      "totalAlloue": 200000000,
      "totalUtilise": 100000000,
      "totalRestant": 100000000,
      "bloques": 5
    }
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé (SUPERADMIN uniquement) |
| 500 | Erreur lors de la récupération des analytiques globales |

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
    "matricule": "A3T9KL",
    "role": "ADMIN",
    "entrepriseId": 1,
    "identifiantEntreprise": "ENT-001"
  }
}
```

> **Note** : Le token JWT contient également les champs `civilite`, `genre`, `numero_passport`, `date_expiration_passport` (si renseignés) pour faciliter les réservations de vols.

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

Créer une nouvelle entreprise. L'`identifiant` (6 caractères alphanum. majuscule) est **auto-généré et unique**. Un forfait est créé automatiquement pour l'entreprise.

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
  "logo": "https://cdn.example.workers.dev/logos/acme.png",
  "nombre_user_autorise": 50
}
```

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| nom | string | Oui | Nom de l'entreprise |
| adresse | string | Oui | Adresse de l'entreprise |
| pays | string | Oui | Pays |
| region | string | Oui | Région |
| ville | string | Oui | Ville |
| logo | string | Non | URL du logo (optionnel) |
| nombre_user_autorise | number | Oui | Nombre d'utilisateurs autorisés par le forfait |

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
  },
  "forfait": {
    "id": 1,
    "entrepriseId": 1,
    "nombre_user_autorise": 50,
    "nombre_user_actuel": 0,
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

Lister toutes les entreprises avec le nombre d'employés et les informations de forfait, triées par date de création.

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
    },
    "forfait": {
      "id": 1,
      "nombre_user_autorise": 50,
      "nombre_user_actuel": 5
    }
  }
]
```

---

### GET `/api/entreprises/:id`

Récupérer une entreprise avec la liste de ses employés et les informations de forfait.

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
  ],
  "forfait": {
    "id": 1,
    "nombre_user_autorise": 50,
    "nombre_user_actuel": 5
  }
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

### GET `/api/budgets-annuels/entreprise/:identifiant`

Lister tous les budgets annuels d'une entreprise (par son identifiant).

**Accès** : SUPERADMIN ou MANAGER (uniquement sa propre entreprise)

**Paramètre URL** : `identifiant` (string, ex: `ENT-2026-001`)

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
      "montant_restant": "35000000",
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
      ],
      "_count": { "budgetDepartements": 3, "budgetPersonnels": 5 }
    }
  ]
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Entreprise non trouvée |

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

### POST `/api/budgets-annuels/:reference/augmenter`

Augmenter le budget annuel global (budget + restant).

**Paramètre URL** : `reference`

**Body**
```json
{ "montant": 5000000 }
```

**Réponse 200**
```json
{
  "message": "Budget annuel augmenté",
  "budgetAnnuel": { "budget": "55000000", "montant_restant": "55000000", ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | montant est requis / doit être un nombre positif |
| 403 | Accès non autorisé |
| 404 | Budget annuel non trouvé |
| 409 | Impossible de modifier un budget clôturé |

---

### POST `/api/budgets-annuels/:reference/diminuer`

Diminuer le budget annuel global (budget + restant).

**Paramètre URL** : `reference`

**Body**
```json
{ "montant": 2000000 }
```

**Réponse 200**
```json
{
  "message": "Budget annuel diminué",
  "budgetAnnuel": { "budget": "48000000", "montant_restant": "48000000", ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | montant est requis / doit être un nombre positif |
| 403 | Accès non autorisé |
| 404 | Budget annuel non trouvé |
| 409 | Impossible de modifier un budget clôturé |
| 409 | Diminution supérieure au restant |

---

### POST `/api/budgets-annuels/departements/:id/augmenter`

Augmenter le montant alloué d'un budget département (prélèvement sur le budget annuel).

**Paramètre URL** : `id` (entier)

**Body**
```json
{ "montant": 3000000 }
```

**Réponse 200**
```json
{
  "message": "Budget département augmenté",
  "budgetDepartement": { "montant_alloue": "18000000", "montant_restant": "18000000", ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | montant est requis / doit être un nombre positif |
| 403 | Accès non autorisé |
| 404 | Budget département non trouvé |
| 409 | Impossible de modifier un budget clôturé |
| 409 | Augmentation supérieure au restant du budget annuel |

---

### POST `/api/budgets-annuels/departements/:id/diminuer`

Diminuer le montant alloué d'un budget département (retour au budget annuel).

**Paramètre URL** : `id` (entier)

**Body**
```json
{ "montant": 1000000 }
```

**Réponse 200**
```json
{
  "message": "Budget département diminué",
  "budgetDepartement": { "montant_alloue": "14000000", "montant_restant": "14000000", ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | montant est requis / doit être un nombre positif |
| 403 | Accès non autorisé |
| 404 | Budget département non trouvé |
| 409 | Impossible de modifier un budget clôturé |
| 409 | Le montant à diminuer ne peut pas être supérieur au restant du budget département |

---

### POST `/api/budgets-annuels/personnels/:id/augmenter`

Augmenter le montant alloué d'un budget personnel.

**Paramètre URL** : `id` (entier)

**Body**
```json
{ "montant": 200000 }
```

**Réponse 200**
```json
{
  "message": "Budget personnel augmenté",
  "budgetPersonnel": { "montant_alloue": "700000", "montant_restant": "700000", ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | montant est requis / doit être un nombre positif |
| 403 | Accès non autorisé |
| 404 | Budget personnel non trouvé |
| 409 | Impossible de modifier un budget clôturé |
| 409 | Augmentation supérieure au restant |

---

### POST `/api/budgets-annuels/personnels/:id/diminuer`

Diminuer le montant alloué d'un budget personnel.

**Paramètre URL** : `id` (entier)

**Body**
```json
{ "montant": 100000 }
```

**Réponse 200**
```json
{
  "message": "Budget personnel diminué",
  "budgetPersonnel": { "montant_alloue": "400000", "montant_restant": "400000", ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | montant est requis / doit être un nombre positif |
| 403 | Accès non autorisé |
| 404 | Budget personnel non trouvé |
| 409 | Impossible de modifier un budget clôturé |
| 409 | Le montant à diminuer ne peut pas être supérieur au restant du budget personnel |

---

### PATCH `/api/budgets-annuels/departements/:id/bloquer`

Bloquer un budget département. Empêche toute modification ultérieure du montant (augmenter, diminuer, modifier, supprimer).

**Paramètre URL** : `id` (entier)

**Réponse 200**
```json
{
  "message": "Budget département bloqué",
  "budgetDepartement": { "id": 2, "bloquer": true, ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Budget département non trouvé |
| 409 | Ce budget département est déjà bloqué |

---

### PATCH `/api/budgets-annuels/departements/:id/debloquer`

Débloquer un budget département. Permet à nouveau les modifications de montant.

**Paramètre URL** : `id` (entier)

**Réponse 200**
```json
{
  "message": "Budget département débloqué",
  "budgetDepartement": { "id": 2, "bloquer": false, ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Budget département non trouvé |
| 409 | Ce budget département n'est pas bloqué |

---

### PATCH `/api/budgets-annuels/personnels/:id/bloquer`

Bloquer un budget personnel. Empêche toute modification ultérieure du montant (augmenter, diminuer, modifier, supprimer).

**Paramètre URL** : `id` (entier)

**Réponse 200**
```json
{
  "message": "Budget personnel bloqué",
  "budgetPersonnel": { "id": 3, "bloquer": true, ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Budget personnel non trouvé |
| 409 | Ce budget personnel est déjà bloqué |

---

### PATCH `/api/budgets-annuels/personnels/:id/debloquer`

Débloquer un budget personnel. Permet à nouveau les modifications de montant.

**Paramètre URL** : `id` (entier)

**Réponse 200**
```json
{
  "message": "Budget personnel débloqué",
  "budgetPersonnel": { "id": 3, "bloquer": false, ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Budget personnel non trouvé |
| 409 | Ce budget personnel n'est pas bloqué |

---

### GET `/api/budgets-annuels/audits`

Consulter l'historique des actions sur les budgets (traçabilité).

**Query params (optionnels)**
- `reference` : filtrer par référence de budget annuel
- `action` : filtrer par type d'action (ex: `ALLOUER_BUDGET_DEPARTEMENT`, `AUGMENTER_BUDGET_ANNUEL`)
- `role_effectue_par` : filtrer par rôle de l'utilisateur (`SUPERADMIN`, `MANAGER`, `ADMIN`)
- `page` : numéro de page (défaut: 1)
- `limit` : nombre d'éléments par page (défaut: 50, max: 100)

**Réponse 200**
```json
{
  "total": 120,
  "page": 1,
  "limit": 50,
  "audits": [
    {
      "id": 1,
      "reference": "YH8M3E5J",
      "entrepriseId": 3,
      "action": "ALLOUER_BUDGET_DEPARTEMENT",
      "type_source": "ANNUEL",
      "type_destination": "DEPARTEMENT",
      "montant": "10000000",
      "montant_avant": "50000000",
      "montant_apres": "40000000",
      "description": "Budget département alloué : 10000000 pris du budget annuel YH8M3E5J",
      "effectue_par": "manager@example.com",
      "effectue_par_id": 5,
      "target_id": 2,
      "target_matricule": null,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |

---

### GET `/api/budgets-allocation/audits/employe/:matricule`

Retourne tous les logs d'audit liés à un employé ou consultant (actions effectuées sur lui ou par lui).

**Accès**
- `SUPERADMIN` : tout employé de toutes les entreprises
- `MANAGER` : employés de sa propre entreprise uniquement
- `EMPLOYE` / `CONSULTANT` : son propre matricule uniquement

**Paramètre URL** : `matricule` de l'employé/consultant

**Query params (optionnels)**
- `page` : numéro de page (défaut: 1)
- `limit` : nombre d'éléments par page (défaut: 50, max: 100)

**Réponse 200**
```json
{
  "total": 3,
  "page": 1,
  "limit": 50,
  "employe": {
    "id": 5,
    "prenom": "Jean",
    "nom": "Dupont",
    "matricule": "AB1234",
    "role": "EMPLOYE"
  },
  "audits": [
    {
      "id": 12,
      "reference": "BUDGET-2026-ABC",
      "entrepriseId": 3,
      "action": "ALLOUER_BUDGET_PERSONNEL",
      "type_source": "ANNUEL",
      "type_destination": "PERSONNEL",
      "montant": "150000",
      "montant_avant": null,
      "montant_apres": null,
      "description": "Budget personnel alloué à AB1234 directement depuis le budget annuel : 150000",
      "effectue_par": "manager@entreprise.com",
      "effectue_par_id": 2,
      "role_effectue_par": "MANAGER",
      "target_id": null,
      "target_matricule": "AB1234",
      "createdAt": "2026-07-01T14:30:00.000Z"
    },
    {
      "id": 15,
      "reference": "BUDGET-2026-ABC",
      "action": "AUGMENTER_BUDGET_PERSONNEL",
      "montant": 20000,
      "montant_avant": 150000,
      "montant_apres": 170000,
      "description": "Budget personnel 3 augmenté de 20000 depuis le budget annuel",
      "effectue_par": "superadmin@entreprise.com",
      "role_effectue_par": "SUPERADMIN",
      "target_matricule": "AB1234",
      "createdAt": "2026-07-01T15:00:00.000Z"
    }
  ]
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé (MANAGER hors de son entreprise, ou EMPLOYE/CONSULTANT consultant un autre matricule) |
| 404 | Employé non trouvé |

---

### GET `/api/budgets-allocation/mes-budgets`

Retourne tous les budgets personnels alloués à l'utilisateur connecté (employé ou consultant), avec les détails du budget annuel associé.

**Accès** : Tout utilisateur authentifié

**Réponse 200**
```json
{
  "total": 2,
  "employe": {
    "id": 5,
    "prenom": "Jean",
    "nom": "Dupont",
    "matricule": "AB1234",
    "role": "EMPLOYE"
  },
  "budgets": [
    {
      "id": 3,
      "reference": "BUDGET-2026-ABC",
      "matricule": "AB1234",
      "montant_alloue": "150000",
      "montant_utilise": "50000",
      "montant_restant": "100000",
      "createdAt": "2026-07-01T14:30:00.000Z",
      "budgetAnnuel": {
        "reference": "BUDGET-2026-ABC",
        "annee": 2026,
        "date_debut": "2026-01-01T00:00:00.000Z",
        "date_fin": "2026-12-31T00:00:00.000Z",
        "budget": "500000",
        "identifiant_entreprise": "ENT001",
        "est_active": true,
        "est_cloture": false
      }
    }
  ]
}
```

**Erreurs**
| Code | Message |
|---|---|
| 401 | Token manquant ou invalide |
| 403 | Accès refusé (id utilisateur manquant) |
| 404 | Utilisateur non trouvé |

---

### GET `/api/budgets-allocation/employe/:matricule/budgets`

Retourne tous les budgets personnels alloués à un employé ou consultant spécifique, avec les détails du budget annuel associé.

**Accès**
- `SUPERADMIN` : tout employé de toutes les entreprises
- `MANAGER` : employés de sa propre entreprise uniquement
- `EMPLOYE` / `CONSULTANT` : son propre matricule uniquement

**Paramètre URL** : `matricule` de l'employé/consultant

**Réponse 200**
```json
{
  "total": 2,
  "employe": {
    "id": 5,
    "prenom": "Jean",
    "nom": "Dupont",
    "matricule": "AB1234",
    "role": "EMPLOYE"
  },
  "budgets": [
    {
      "id": 3,
      "reference": "BUDGET-2026-ABC",
      "matricule": "AB1234",
      "montant_alloue": "150000",
      "montant_utilise": "50000",
      "montant_restant": "100000",
      "createdAt": "2026-07-01T14:30:00.000Z",
      "budgetAnnuel": {
        "reference": "BUDGET-2026-ABC",
        "annee": 2026,
        "date_debut": "2026-01-01T00:00:00.000Z",
        "date_fin": "2026-12-31T00:00:00.000Z",
        "budget": "500000",
        "identifiant_entreprise": "ENT001",
        "est_active": true,
        "est_cloture": false
      }
    }
  ]
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé (MANAGER hors de son entreprise, ou EMPLOYE/CONSULTANT consultant un autre matricule) |
| 404 | Employé non trouvé |

---

## 5. Politiques de voyage

Définit les conditions de voyage pour chaque employé (classes aériennes autorisées, nombre d'étoiles hôtel max).

**Accès**
- `SUPERADMIN` : toutes les politiques
- `MANAGER` : politiques des employés de son entreprise uniquement
- `EMPLOYE` / `CONSULTANT` : sa propre politique uniquement

### POST `/api/politiques`

Créer une politique de voyage pour un employé.

**Headers**
```
Authorization: Bearer <token>
```

**Body**
```json
{
  "matricule": "AB1234",
  "y": true,
  "w": false,
  "j": false,
  "f": false,
  "hotel": 3
}
```

- **y** : classe Économique (défaut: `false`)
- **w** : Économie Premium (défaut: `false`)
- **j** : Affaires / Business (défaut: `false`)
- **f** : Première classe (défaut: `false`)
- **hotel** : nombre d'étoiles max autorisé (défaut: `0`)

**Réponse 201**
```json
{
  "message": "Politique créée",
  "politique": {
    "id": 1,
    "matricule": "AB1234",
    "y": true,
    "w": false,
    "j": false,
    "f": false,
    "hotel": 3,
    "createdAt": "2026-07-02T10:00:00.000Z",
    "updatedAt": "2026-07-02T10:00:00.000Z"
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | matricule est requis |
| 403 | Accès non autorisé |
| 404 | Employé non trouvé |
| 409 | Une politique existe déjà pour cet employé |

---

### GET `/api/politiques`

Lister toutes les politiques de voyage (manager/superadmin uniquement).

**Headers**
```
Authorization: Bearer <token>
```

**Réponse 200**
```json
{
  "total": 2,
  "politiques": [
    {
      "id": 1,
      "matricule": "AB1234",
      "y": true,
      "w": false,
      "j": false,
      "f": false,
      "hotel": 3,
      "user": {
        "id": 5,
        "prenom": "Jean",
        "nom": "Dupont",
        "matricule": "AB1234",
        "role": "EMPLOYE",
        "entrepriseId": 1
      }
    }
  ]
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |

---

### GET `/api/politiques/:matricule`

Récupérer la politique de voyage d'un employé spécifique.

**Paramètre URL** : `matricule`

**Réponse 200**
```json
{
  "politique": {
    "id": 1,
    "matricule": "AB1234",
    "y": true,
    "w": false,
    "j": false,
    "f": false,
    "hotel": 3,
    "user": {
      "id": 5,
      "prenom": "Jean",
      "nom": "Dupont",
      "matricule": "AB1234",
      "role": "EMPLOYE"
    }
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Politique non trouvée |

---

### PUT `/api/politiques/:matricule`

Modifier la politique de voyage d'un employé.

**Paramètre URL** : `matricule`

**Body** (tous les champs sont optionnels)
```json
{
  "y": true,
  "w": true,
  "j": false,
  "f": false,
  "hotel": 4
}
```

**Réponse 200**
```json
{
  "message": "Politique mise à jour",
  "politique": {
    "id": 1,
    "matricule": "AB1234",
    "y": true,
    "w": true,
    "j": false,
    "f": false,
    "hotel": 4,
    "updatedAt": "2026-07-02T11:00:00.000Z"
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Politique non trouvée |

---

### DELETE `/api/politiques/:matricule`

Supprimer la politique de voyage d'un employé.

**Paramètre URL** : `matricule`

**Réponse 200**
```json
{
  "message": "Politique supprimée"
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Politique non trouvée |

---

## 6. Forfaits

Gère les forfaits d'entreprises, définissant le nombre d'utilisateurs autorisés et le nombre actuel.

**Accès** : SUPERADMIN pour la gestion, MANAGER pour consulter son propre forfait

### GET `/api/forfaits/mon-forfait`

Récupérer le forfait de l'entreprise de l'utilisateur connecté (manager ou superadmin).

**Accès** : Tous les utilisateurs authentifiés (MANAGER, SUPERADMIN, EMPLOYE, CONSULTANT)

**Headers**
```
Authorization: Bearer <token>
```

**Réponse 200**
```json
{
  "id": 1,
  "entrepriseId": 1,
  "nombre_user_autorise": 50,
  "nombre_user_actuel": 25,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z",
  "entreprise": {
    "id": 1,
    "nom": "Ma Entreprise",
    "identifiant": "ENT-001"
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | Utilisateur non authentifié ou sans entreprise |
| 404 | Aucun forfait trouvé pour votre entreprise |
| 500 | Erreur serveur |

---

### POST `/api/forfaits`

Créer un forfait pour une entreprise.

**Headers**
```
Authorization: Bearer <token>
```

**Body**
```json
{
  "entrepriseId": 1,
  "nombre_user_autorise": 50
}
```

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| entrepriseId | number | Oui | ID de l'entreprise |
| nombre_user_autorise | number | Oui | Nombre d'utilisateurs autorisés par le forfait |

**Réponse 201**
```json
{
  "message": "Forfait créé avec succès",
  "forfait": {
    "id": 1,
    "entrepriseId": 1,
    "nombre_user_autorise": 50,
    "nombre_user_actuel": 0,
    "createdAt": "2026-07-10T10:00:00.000Z",
    "updatedAt": "2026-07-10T10:00:00.000Z",
    "entreprise": {
      "id": 1,
      "nom": "Ma Entreprise",
      "identifiant": "ENT-001"
    }
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | Champs manquants |
| 404 | Entreprise non trouvée |
| 409 | Un forfait existe déjà pour cette entreprise |
| 500 | Erreur serveur |

---

### GET `/api/forfaits`

Récupérer tous les forfaits.

**Headers**
```
Authorization: Bearer <token>
```

**Réponse 200**
```json
{
  "total": 2,
  "forfaits": [
    {
      "id": 1,
      "entrepriseId": 1,
      "nombre_user_autorise": 50,
      "nombre_user_actuel": 25,
      "createdAt": "2026-07-10T10:00:00.000Z",
      "updatedAt": "2026-07-10T10:00:00.000Z",
      "entreprise": {
        "id": 1,
        "nom": "Ma Entreprise",
        "identifiant": "ENT-001"
      }
    }
  ]
}
```

**Erreurs**
| Code | Message |
|---|---|
| 500 | Erreur serveur |

---

### GET `/api/forfaits/:id`

Récupérer un forfait par son ID.

**Paramètre URL** : `id`

**Réponse 200**
```json
{
  "id": 1,
  "entrepriseId": 1,
  "nombre_user_autorise": 50,
  "nombre_user_actuel": 25,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z",
  "entreprise": {
    "id": 1,
    "nom": "Ma Entreprise",
    "identifiant": "ENT-001"
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 404 | Forfait non trouvé |
| 500 | Erreur serveur |

---

### GET `/api/forfaits/entreprise/:entrepriseId`

Récupérer le forfait d'une entreprise par son ID.

**Paramètre URL** : `entrepriseId`

**Réponse 200**
```json
{
  "id": 1,
  "entrepriseId": 1,
  "nombre_user_autorise": 50,
  "nombre_user_actuel": 25,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z",
  "entreprise": {
    "id": 1,
    "nom": "Ma Entreprise",
    "identifiant": "ENT-001"
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 404 | Aucun forfait trouvé pour cette entreprise |
| 500 | Erreur serveur |

---

### PUT `/api/forfaits/:id`

Mettre à jour un forfait.

**Paramètre URL** : `id`

**Body**
```json
{
  "nombre_user_autorise": 100,
  "nombre_user_actuel": 30
}
```

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| nombre_user_autorise | number | Non | Nouveau nombre d'utilisateurs autorisés |
| nombre_user_actuel | number | Non | Nouveau nombre d'utilisateurs actuels |

**Réponse 200**
```json
{
  "message": "Forfait mis à jour avec succès",
  "forfait": {
    "id": 1,
    "entrepriseId": 1,
    "nombre_user_autorise": 100,
    "nombre_user_actuel": 30,
    "createdAt": "2026-07-10T10:00:00.000Z",
    "updatedAt": "2026-07-10T10:30:00.000Z",
    "entreprise": {
      "id": 1,
      "nom": "Ma Entreprise",
      "identifiant": "ENT-001"
    }
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | Le nombre d'utilisateurs actuels ne peut pas dépasser le nombre autorisé |
| 404 | Forfait non trouvé |
| 500 | Erreur serveur |

---

### PATCH `/api/forfaits/:id/increment`

Incrémenter le nombre d'utilisateurs actuels d'un forfait.

**Paramètre URL** : `id`

**Réponse 200**
```json
{
  "message": "Nombre d'utilisateurs incrémenté avec succès",
  "forfait": {
    "id": 1,
    "entrepriseId": 1,
    "nombre_user_autorise": 50,
    "nombre_user_actuel": 26,
    "createdAt": "2026-07-10T10:00:00.000Z",
    "updatedAt": "2026-07-10T10:35:00.000Z",
    "entreprise": {
      "id": 1,
      "nom": "Ma Entreprise",
      "identifiant": "ENT-001"
    }
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | Le nombre maximum d'utilisateurs autorisés est atteint |
| 404 | Forfait non trouvé |
| 500 | Erreur serveur |

---

### PATCH `/api/forfaits/:id/decrement`

Décrémenter le nombre d'utilisateurs actuels d'un forfait.

**Paramètre URL** : `id`

**Réponse 200**
```json
{
  "message": "Nombre d'utilisateurs décrémenté avec succès",
  "forfait": {
    "id": 1,
    "entrepriseId": 1,
    "nombre_user_autorise": 50,
    "nombre_user_actuel": 24,
    "createdAt": "2026-07-10T10:00:00.000Z",
    "updatedAt": "2026-07-10T10:36:00.000Z",
    "entreprise": {
      "id": 1,
      "nom": "Ma Entreprise",
      "identifiant": "ENT-001"
    }
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | Le nombre d'utilisateurs actuels ne peut pas être négatif |
| 404 | Forfait non trouvé |
| 500 | Erreur serveur |

---

### DELETE `/api/forfaits/:id`

Supprimer un forfait.

**Paramètre URL** : `id`

**Réponse 200**
```json
{
  "message": "Forfait supprimé avec succès"
}
```

**Erreurs**
| Code | Message |
|---|---|
| 404 | Forfait non trouvé |
| 500 | Erreur serveur |

---

## 7. Demandes de voyage

Gestion des demandes de voyage des employés avec validation des politiques de classe et workflow d'approbation.

**Accès**
- `SUPERADMIN` : toutes les demandes
- `MANAGER` : demandes de son entreprise uniquement (peut approuver/rejeter)
- `EMPLOYE` / `CONSULTANT` : ses propres demandes uniquement

### POST `/api/demandes-voyage`

Créer une demande de voyage.

**Headers**
```
Authorization: Bearer <token>
```

**Body**
```json
{
  "depart": "Dakar",
  "arrive": "Paris",
  "allerRetour": true,
  "dateDepart": "2026-08-01T10:00:00.000Z",
  "dateRetour": "2026-08-10T10:00:00.000Z",
  "classe": "J",
  "hotel": "4",
  "ville": "Paris",
  "pays": "France",
  "etat": "Île-de-France",
  "region": "Paris",
  "motif": "Réunion client"
}
```

> **Note** : `matricule` et `identifiant_entreprise` sont automatiquement extraits du token JWT de l'utilisateur connecté.
> `hotel` est optionnel. Valeurs acceptées : `1`, `2`, `3`, `4`, `5`, `NON_INCLUS`. Par défaut : `NON_INCLUS`.
> `ville`, `pays`, `etat`, `region` sont optionnels.

**Réponse 201**
```json
{
  "message": "Demande de voyage créée",
  "demande": {
    "id": 1,
    "matricule": "AB1234",
    "identifiant_entreprise": "ENT001",
    "depart": "Dakar",
    "arrive": "Paris",
    "allerRetour": true,
    "dateDepart": "2026-08-01T10:00:00.000Z",
    "dateRetour": "2026-08-10T10:00:00.000Z",
    "classe": "J",
    "hotel": "4",
    "ville": "Paris",
    "pays": "France",
    "etat": "Île-de-France",
    "region": "Paris",
    "motif": "Réunion client",
    "statut": "EN_ATTENTE",
    "createdAt": "2026-07-02T12:00:00.000Z"
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | Champs requis manquants |
| 400 | Informations utilisateur manquantes dans le token |
| 400 | Hotel doit être 1, 2, 3, 4, 5 ou NON_INCLUS |
| 400 | dateRetour est requis pour un aller-retour |
| 404 | Employé ou entreprise non trouvé(e) |
| 409 | La classe demandée n'est pas autorisée par la politique de l'employé |

---

### GET `/api/demandes-voyage/mes-demandes`

Lister ses propres demandes de voyage (pour EMPLOYE/CONSULTANT).

**Réponse 200**
```json
{
  "total": 3,
  "demandes": [
    {
      "id": 1,
      "depart": "Dakar",
      "arrive": "Paris",
      "statut": "EN_ATTENTE",
      "classe": "J",
      "dateDepart": "2026-08-01T10:00:00.000Z",
      "createdAt": "2026-07-02T12:00:00.000Z",
      "entreprise": { "id": 1, "nom": "Eazy Visa", "identifiant": "ENT001" }
    }
  ]
}
```

---

### GET `/api/demandes-voyage`

Lister toutes les demandes de voyage (manager/superadmin).

**Réponse 200**
```json
{
  "total": 5,
  "demandes": [
    {
      "id": 1,
      "matricule": "AB1234",
      "depart": "Dakar",
      "arrive": "Paris",
      "statut": "EN_ATTENTE",
      "user": { "id": 5, "prenom": "Jean", "nom": "Dupont", "matricule": "AB1234", "role": "EMPLOYE" },
      "entreprise": { "id": 1, "nom": "Eazy Visa", "identifiant": "ENT001" }
    }
  ]
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |

---

### GET `/api/demandes-voyage/:id`

Récupérer une demande de voyage par son ID.

**Réponse 200**
```json
{
  "demande": {
    "id": 1,
    "matricule": "AB1234",
    "depart": "Dakar",
    "arrive": "Paris",
    "allerRetour": true,
    "dateDepart": "2026-08-01T10:00:00.000Z",
    "dateRetour": "2026-08-10T10:00:00.000Z",
    "classe": "J",
    "motif": "Réunion client",
    "statut": "EN_ATTENTE",
    "commentaire": null,
    "user": { "id": 5, "prenom": "Jean", "nom": "Dupont", "matricule": "AB1234", "role": "EMPLOYE" },
    "entreprise": { "id": 1, "nom": "Eazy Visa", "identifiant": "ENT001" }
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Demande de voyage non trouvée |

---

### PUT `/api/demandes-voyage/:id`

Modifier une demande (uniquement si statut = `EN_ATTENTE`).

**Body** (tous optionnels)
```json
{
  "depart": "Dakar",
  "arrive": "Londres",
  "allerRetour": false,
  "dateDepart": "2026-08-05T10:00:00.000Z",
  "classe": "Y",
  "hotel": "3",
  "ville": "Londres",
  "pays": "Royaume-Uni",
  "etat": "Angleterre",
  "region": "Londres",
  "motif": "Formation"
}
```

> **Note** : `hotel` est optionnel. Valeurs acceptées : `1`, `2`, `3`, `4`, `5`, `NON_INCLUS`.
> `ville`, `pays`, `etat`, `region` sont optionnels.

**Réponse 200**
```json
{
  "message": "Demande de voyage mise à jour",
  "demande": { "id": 1, "classe": "Y", "statut": "EN_ATTENTE", ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | Hotel doit être 1, 2, 3, 4, 5 ou NON_INCLUS |
| 403 | Accès non autorisé |
| 404 | Demande non trouvée |
| 409 | Impossible de modifier une demande qui n'est pas en attente |
| 409 | La classe demandée n'est pas autorisée par la politique |

---

### PATCH `/api/demandes-voyage/:id/approuver`

Approuver une demande (manager/superadmin).

**Body** (optionnel)
```json
{
  "commentaire": "Approuvé par le manager"
}
```

**Réponse 200**
```json
{
  "message": "Demande approuvée",
  "demande": { "id": 1, "statut": "APPROUVEE", ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Demande non trouvée |
| 409 | Seules les demandes en attente peuvent être approuvées |

---

### PATCH `/api/demandes-voyage/:id/rejeter`

Rejeter une demande (manager/superadmin).

**Body** (optionnel)
```json
{
  "commentaire": "Budget insuffisant"
}
```

**Réponse 200**
```json
{
  "message": "Demande rejetée",
  "demande": { "id": 1, "statut": "REJETEE", ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Demande non trouvée |
| 409 | Seules les demandes en attente peuvent être rejetées |

---

### PATCH `/api/demandes-voyage/:id/annuler`

Annuler une demande (créateur, manager ou superadmin).

**Réponse 200**
```json
{
  "message": "Demande annulée",
  "demande": { "id": 1, "statut": "ANNULEE", ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Demande non trouvée |
| 409 | Demande déjà annulée ou terminée |

---

### PATCH `/api/demandes-voyage/:id/cloturer`

Clôturer une demande (marquer comme terminée — manager/superadmin).

**Réponse 200**
```json
{
  "message": "Demande clôturée",
  "demande": { "id": 1, "statut": "TERMINEE", ... }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Demande non trouvée |
| 409 | Seules les demandes approuvées ou en cours peuvent être clôturées |

---

## 7. Réservations

### GET `/api/reservations/entreprise`

Lister toutes les réservations (billets et hôtels) de l'entreprise (manager/superadmin).

**Accès** : SUPERADMIN ou MANAGER

**Headers**
```
Authorization: Bearer <token>
```

**Réponse 200**
```json
{
  "billets": {
    "total": 5,
    "data": [
      {
        "id": 1,
        "demandeVoyageId": 10,
        "allerRetour": true,
        "numeroReservation": "RES-1719876543210",
        "numeroOrder": "ord_0000B7xJ48O26NuJhCgNSn",
        "compagnieAerienne": null,
        "numeroVolAller": null,
        "numeroVolRetour": null,
        "dateVolDepart": "2026-08-01T10:00:00.000Z",
        "dateVolArrivee": null,
        "dateVolRetourDepart": "2026-08-10T10:00:00.000Z",
        "dateVolRetourArrivee": null,
        "aeroportDepart": "Dakar",
        "aeroportArrivee": "Paris",
        "classe": "J",
        "prix": null,
        "devise": "XOF",
        "statut": "EN_ATTENTE",
        "numeroBillet": null,
        "dateEmission": null,
        "commentaire": null,
        "createdAt": "2026-07-02T14:00:00.000Z",
        "demandeVoyage": {
          "id": 10,
          "matricule": "AB1234",
          "depart": "Dakar",
          "arrive": "Paris",
          "statut": "APPROUVEE",
          "user": { "id": 5, "prenom": "Jean", "nom": "Dupont", "matricule": "AB1234", "role": "EMPLOYE" },
          "entreprise": { "id": 1, "nom": "Eazy Visa", "identifiant": "ENT001" }
        }
      }
    ]
  },
  "hotels": {
    "total": 3,
    "data": [
      {
        "id": 1,
        "demandeVoyageId": 10,
        "nomHotel": null,
        "categorie": "4",
        "adresse": null,
        "ville": "Paris",
        "pays": null,
        "dateArrivee": null,
        "dateDepart": null,
        "nombreNuits": null,
        "prixParNuit": null,
        "prixTotal": null,
        "devise": "XOF",
        "statut": "EN_ATTENTE",
        "numeroConfirmation": null,
        "commentaire": null,
        "createdAt": "2026-07-02T14:00:00.000Z",
        "demandeVoyage": {
          "id": 10,
          "matricule": "AB1234",
          "depart": "Dakar",
          "arrive": "Paris",
          "statut": "APPROUVEE",
          "user": { "id": 5, "prenom": "Jean", "nom": "Dupont", "matricule": "AB1234", "role": "EMPLOYE" },
          "entreprise": { "id": 1, "nom": "Eazy Visa", "identifiant": "ENT001" }
        }
      }
    ]
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |

---

### GET `/api/reservations/mes-reservations`

Lister ses propres réservations (billets et hôtels) pour EMPLOYE/CONSULTANT.

**Accès** : EMPLOYE ou CONSULTANT

**Headers**
```
Authorization: Bearer <token>
```

**Réponse 200**
```json
{
  "billets": {
    "total": 2,
    "data": [
      {
        "id": 1,
        "demandeVoyageId": 10,
        "numeroReservation": "RES-1719876543210",
        "numeroOrder": "ord_0000B7xJ48O26NuJhCgNSn",
        "statut": "EN_ATTENTE",
        "demandeVoyage": {
          "id": 10,
          "matricule": "AB1234",
          "depart": "Dakar",
          "arrive": "Paris",
          "statut": "APPROUVEE"
        }
      }
    ]
  },
  "hotels": {
    "total": 1,
    "data": [
      {
        "id": 1,
        "demandeVoyageId": 10,
        "categorie": "4",
        "ville": "Paris",
        "statut": "EN_ATTENTE",
        "demandeVoyage": {
          "id": 10,
          "matricule": "AB1234",
          "statut": "APPROUVEE"
        }
      }
    ]
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |

---

### GET `/api/reservations/billets/:id`

Récupérer une réservation de billet par son ID.

**Accès** : Tous les rôles (avec contrôle d'accès)

**Headers**
```
Authorization: Bearer <token>
```

**Réponse 200**
```json
{
  "reservation": {
    "id": 1,
    "demandeVoyageId": 10,
    "allerRetour": true,
    "numeroReservation": "RES-1719876543210",
    "numeroOrder": "ord_0000B7xJ48O26NuJhCgNSn",
    "compagnieAerienne": null,
    "numeroVolAller": null,
    "numeroVolRetour": null,
    "dateVolDepart": "2026-08-01T10:00:00.000Z",
    "dateVolArrivee": null,
    "dateVolRetourDepart": "2026-08-10T10:00:00.000Z",
    "dateVolRetourArrivee": null,
    "aeroportDepart": "Dakar",
    "aeroportArrivee": "Paris",
    "classe": "J",
    "prix": null,
    "devise": "XOF",
    "statut": "EN_ATTENTE",
    "numeroBillet": null,
    "dateEmission": null,
    "commentaire": null,
    "createdAt": "2026-07-02T14:00:00.000Z",
    "updatedAt": "2026-07-02T14:00:00.000Z",
    "demandeVoyage": {
      "id": 10,
      "matricule": "AB1234",
      "identifiant_entreprise": "ENT001",
      "depart": "Dakar",
      "arrive": "Paris",
      "allerRetour": true,
      "dateDepart": "2026-08-01T10:00:00.000Z",
      "dateRetour": "2026-08-10T10:00:00.000Z",
      "classe": "J",
      "hotel": "4",
      "ville": "Paris",
      "motif": "Réunion client",
      "statut": "APPROUVEE",
      "commentaire": null,
      "createdAt": "2026-07-02T12:00:00.000Z",
      "updatedAt": "2026-07-02T14:00:00.000Z",
      "user": {
        "id": 5,
        "email": "jean.dupont@example.com",
        "mot_de_passe": "$2b$10$...",
        "prenom": "Jean",
        "nom": "Dupont",
        "role": "EMPLOYE",
        "matricule": "AB1234",
        "entrepriseId": 1,
        "is_block": false,
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
      },
      "entreprise": {
        "id": 1,
        "nom": "Eazy Visa",
        "identifiant": "ENT001",
        "email": "contact@eazyvisa.com",
        "telephone": "+221338000000",
        "adresse": "Dakar, Sénégal",
        "pays": "Sénégal",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
      }
    }
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Réservation de billet non trouvée |

---

### GET `/api/reservations/hotels/:id`

Récupérer une réservation d'hôtel par son ID.

**Accès** : Tous les rôles (avec contrôle d'accès)

**Headers**
```
Authorization: Bearer <token>
```

**Réponse 200**
```json
{
  "reservation": {
    "id": 1,
    "demandeVoyageId": 10,
    "nomHotel": null,
    "categorie": "4",
    "adresse": null,
    "ville": "Paris",
    "pays": null,
    "dateArrivee": null,
    "dateDepart": null,
    "nombreNuits": null,
    "prixParNuit": null,
    "prixTotal": null,
    "devise": "XOF",
    "statut": "EN_ATTENTE",
    "numeroConfirmation": null,
    "commentaire": null,
    "createdAt": "2026-07-02T14:00:00.000Z",
    "updatedAt": "2026-07-02T14:00:00.000Z",
    "demandeVoyage": {
      "id": 10,
      "matricule": "AB1234",
      "identifiant_entreprise": "ENT001",
      "depart": "Dakar",
      "arrive": "Paris",
      "allerRetour": true,
      "dateDepart": "2026-08-01T10:00:00.000Z",
      "dateRetour": "2026-08-10T10:00:00.000Z",
      "classe": "J",
      "hotel": "4",
      "ville": "Paris",
      "motif": "Réunion client",
      "statut": "APPROUVEE",
      "commentaire": null,
      "createdAt": "2026-07-02T12:00:00.000Z",
      "updatedAt": "2026-07-02T14:00:00.000Z",
      "user": {
        "id": 5,
        "email": "jean.dupont@example.com",
        "mot_de_passe": "$2b$10$...",
        "prenom": "Jean",
        "nom": "Dupont",
        "role": "EMPLOYE",
        "matricule": "AB1234",
        "entrepriseId": 1,
        "is_block": false,
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
      },
      "entreprise": {
        "id": 1,
        "nom": "Eazy Visa",
        "identifiant": "ENT001",
        "email": "contact@eazyvisa.com",
        "telephone": "+221338000000",
        "adresse": "Dakar, Sénégal",
        "pays": "Sénégal",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
      }
    }
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 403 | Accès non autorisé |
| 404 | Réservation d'hôtel non trouvée |

---

### POST `/api/reservations/filter`

Filtrer les réservations de billets en attente par date de vol et/ou aéroports.

**Accès** : MANAGER ou SUPERADMIN

**Headers**
```
Authorization: Bearer <token>
```

**Body**
```json
{
  "date": "2026-07-08", //obligatoire
  "dateRetour": "2026-07-15",//optionnel
  "aeroportDepart": "DSS", //obligatoire
  "aeroportArrivee": "CDG", //obligatoire
  "classe": "Y" ,//obligatoire
}
```

**Paramètres du body**
| Champ | Type | Requis | Description |
|---|---|---|---|
| date | string (ISO 8601) | Oui | Date de vol de départ (format YYYY-MM-DD). Filtre sur toute la journée |
| dateRetour | string (ISO 8601) | Non | Date de vol de retour (format YYYY-MM-DD). Filtre sur toute la journée |
| aeroportDepart | string | Oui | Code IATA de l'aéroport de départ (ex: DSS, CDG) |
| aeroportArrivee | string | Oui | Code IATA de l'aéroport d'arrivée (ex: DSS, CDG) |
| classe | string | Oui | Classe de vol (ex: Y, C, F, W) |

**Note** : Le statut est automatiquement fixé à `EN_ATTENTE` pour toutes les recherches. Si `dateRetour` n'est pas fourni, seuls les vols aller-simple (`allerRetour=false`) sont retournés.

**Réponse 200**
```json
{
  "total": 2,
  "data": [
    {
      "id": 1,
      "demandeVoyageId": 10,
      "numeroReservation": "RES-1719876543210",
      "numeroOrder": "ord_0000B7xJ48O26NuJhCgNSn",
      "compagnieAerienne": "Air France",
      "numeroVolAller": "AF1234",
      "numeroVolRetour": "AF5678",
      "dateVolDepart": "2026-07-08T10:00:00.000Z",
      "dateVolArrivee": "2026-07-08T14:00:00.000Z",
      "dateVolRetourDepart": "2026-07-15T10:00:00.000Z",
      "dateVolRetourArrivee": "2026-07-15T14:00:00.000Z",
      "aeroportDepart": "DSS",
      "aeroportArrivee": "CDG",
      "classe": "Y",
      "prix": "250000",
      "devise": "XOF",
      "statut": "EN_ATTENTE",
      "numeroBillet": null,
      "dateEmission": "2026-07-08T09:00:00.000Z",
      "commentaire": null,
      "createdAt": "2026-07-02T14:00:00.000Z",
      "updatedAt": "2026-07-08T09:00:00.000Z",
      "demandeVoyage": {
        "id": 10,
        "matricule": "AB1234",
        "depart": "Dakar",
        "arrive": "Paris",
        "statut": "APPROUVEE",
        "user": { "id": 5, "prenom": "Jean", "nom": "Dupont", "matricule": "AB1234", "role": "EMPLOYE" },
        "entreprise": { "id": 1, "nom": "Eazy Visa", "identifiant": "ENT001" }
      }
    }
  ],
  "filters": {
    "statut": "EN_ATTENTE",
    "date": "2026-07-08",
    "dateRetour": "2026-07-15",
    "aeroportDepart": "DSS",
    "aeroportArrivee": "CDG",
    "classe": "Y"
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | Format de date invalide |
| 403 | Accès non autorisé |

---

### POST `/api/reservations/check-budgets`

Vérifier si les budgets des utilisateurs sont suffisants pour une dépense donnée.

**Accès** : MANAGER ou SUPERADMIN

**Headers**
```
Authorization: Bearer <token>
```

**Body**
```json
{
  "matricules": ["AB1234", "AB5678", "AB9012"],
  "somme": 1500,
  "devise": "EUR"
}
```

**Paramètres du body**
| Champ | Type | Requis | Description |
|---|---|---|---|
| matricules | string[] | Oui | Liste des matricules des utilisateurs à vérifier |
| somme | number | Oui | Montant total à répartir entre les utilisateurs |
| devise | string | Oui | Devise du montant (USD, EUR, XOF) |

**Réponse 200 - Budgets suffisants**
```json
{
  "ok": true,
  "message": "Tous les utilisateurs ont un budget suffisant",
  "montantParPersonne": 325000
}
```

**Réponse 200 - Budgets insuffisants**
```json
{
  "ok": false,
  "message": "Certains utilisateurs ont un budget insuffisant",
  "montantParPersonne": 325000,
  "usersInsuffisants": [
    {
      "user": {
        "id": 5,
        "prenom": "Jean",
        "nom": "Dupont",
        "matricule": "AB1234",
        "email": "jean.dupont@example.com"
      },
      "montantRestant": 200000,
      "montantRequis": 325000,
      "difference": 125000
    }
  ]
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | matricules est requis et doit être un tableau non vide |
| 400 | somme est requis et doit être supérieur à 0 |
| 400 | devise est requis |
| 400 | Les matricules suivants n'ont pas de budget: ... |
| 403 | Accès non autorisé |

---

## 8. Recherche de Vols

### POST `/api/reference-data/flights/search`

Rechercher des vols via l'API Duffel.

**Accès** : Public (pas d'authentification requise)

**Body**
```json
{
  "origin": "DKR",
  "destination": "CDG",
  "departureDate": "2026-08-01",
  "returnDate": "2026-08-10",
  "passengers": 1,
  "cabinClass": "business"
}
```

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| origin | string | Oui | Code IATA aéroport de départ (ex: DKR) |
| destination | string | Oui | Code IATA aéroport d'arrivée (ex: CDG) |
| departureDate | string | Oui | Date de départ (format ISO: 2026-08-01) |
| returnDate | string | Non | Date de retour pour aller-retour |
| passengers | number | Non | Nombre de passagers (défaut: 1) |
| cabinClass | string | Non | Classe (economy, premium_economy, business, first) |

**Réponse 200**

> **Note** : La réponse est la réponse brute de l'API Duffel (version v2). La structure peut varier selon les données retournées par Duffel.

```json
{
  "data": {
    "id": "orq_0000B7xJ3wDRviHYLANgKu",
    "offers": [
      {
        "id": "off_0000B7xJ48O26NuJhCgNSn",
        "total_amount": "5017.27",
        "base_amount": "3862.46",
        "currency": "EUR",
        "slices": [...]
      }
    ],
    "slices": [...],
    "passengers": [...]
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | origin, destination et departureDate sont requis |
| 500 | Erreur lors de la recherche de vols |

---

## 9. Recherche de Vols (SDK Duffel)

### POST `/api/flights/search`

Rechercher des vols via le SDK Duffel.

**Accès** : Manager ou SuperAdmin

**Body**
```json
{
  "origin": "DKR",
  "destination": "CDG",
  "departureDate": "2026-08-01",
  "returnDate": "2026-08-10",
  "passengers": 1,
  "cabinClass": "business",
  "maxStops": 1,
  "limit": 20,
  "offset": 0
}
```

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| origin | string | Oui | Code IATA aéroport de départ (ex: DKR) |
| destination | string | Oui | Code IATA aéroport d'arrivée (ex: CDG) |
| departureDate | string | Oui | Date de départ (format ISO: 2026-08-01) |
| returnDate | string | Non | Date de retour pour aller-retour |
| passengers | number | Non | Nombre de passagers (défaut: 1) |
| cabinClass | string | Non | Classe (economy, premium_economy, business, first) |
| maxStops | number | Non | Nombre maximum d'escales (0, 1, ou 2) |
| limit | number | Non | Nombre d'offres par page (défaut: 20) |
| offset | number | Non | Offset pour pagination (défaut: 0) |

**Réponse 200**
```json
{
  "offer_request_id": "orq_0000B7xJ3wDRviHYLANgKu",
  "offers": [
    {
      "id": "off_0000B7xJ48O26NuJhCgNSn",
      "total_amount": "5017.27",
      "base_amount": "3862.46",
      "currency": "EUR",
      "slices": [...]
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | origin, destination et departureDate sont requis |
| 500 | Erreur lors de la recherche de vols |

---

### POST `/api/flights/search-advanced`

Rechercher des vols via le SDK Duffel avec paramètres avancés.

**Accès** : Manager ou SuperAdmin

**Body**
```json
{
  "dateDepart": "2026-07-11",
  "dateRetour": "2026-07-15",
  "aeroportDepart": "DSS",
  "aeroportArrivee": "LHR",
  "classe": "economy",
  "nombrePassenger": 3
}
```

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| dateDepart | string | Oui | Date de départ (format ISO: 2026-07-11) |
| dateRetour | string | Non | Date de retour pour aller-retour |
| aeroportDepart | string | Oui | Code IATA aéroport de départ (ex: DSS) |
| aeroportArrivee | string | Oui | Code IATA aéroport d'arrivée (ex: LHR) |
| classe | string | Oui | Classe (economy, premium_economy, business, first) |
| nombrePassenger | number | Oui | Nombre de passagers (adultes) |

**Réponse 200**
```json
{
  "offer_request_id": "orq_0000B7xJ3wDRviHYLANgKu",
  "offers": [
    {
      "id": "off_0000B7xJ48O26NuJhCgNSn",
      "total_amount": "5017.27",
      "base_amount": "3862.46",
      "currency": "EUR",
      "slices": [...]
    }
  ],
  "total": 25
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | dateDepart, aeroportDepart, aeroportArrivee, classe et nombrePassenger sont requis |
| 500 | Erreur lors de la recherche de vols |

---

### POST `/api/flights/book`

Réserver un vol via le SDK Duffel.

**Accès** : Manager ou SuperAdmin

**Body**
```json
{
  "selected_offers": ["off_0000B7xJ48O26NuJhCgNSn"],
  "matricule": "A3T9KL",
  "passenger_id": "passenger_1",
  "demandeVoyageId": 1
}
```

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| selected_offers | array | Oui | Liste des IDs des offres à réserver |
| matricule | string | Oui | Matricule de l'utilisateur (les informations passager sont récupérées automatiquement depuis le profil utilisateur) |
| passenger_id | string | Oui | ID unique du passager pour la réservation Duffel |
| demandeVoyageId | number | Oui | ID de la demande de voyage associée pour identifier la réservation à mettre à jour |

**Comportement**

> **Note** : La réservation effectue les opérations suivantes :
> 1. Récupère les informations du passager depuis le profil utilisateur (prénom, nom, civilité, email, téléphone, genre, numéro de passeport, date d'expiration)
> 2. Rafraîchit l'offre Duffel pour obtenir le prix à jour
> 3. Vérifie le budget de l'utilisateur (budget non bloqué et montant suffisant)
> 4. Convertit le prix en FCFA selon la devise (USD → 550 FCFA, EUR → 650 FCFA, XOF → 1)
> 5. Crée la réservation via l'API Duffel
> 6. Met à jour ReservationBillet avec les détails de la réservation (numéro de réservation, compagnie, vols, dates, aéroports, classe, prix, statut EMISE, numéro de billet, numéro d'ordre Duffel)
> 7. Déduit le montant du budget personnel de l'utilisateur
> 8. Crée une entrée AuditBudget pour tracer la transaction

**Réponse 200**

> **Note** : La réponse est la réponse brute de l'API Duffel. La structure peut varier selon les données retournées par Duffel.

```json
{
  "id": "ord_0000B7xJ48O26NuJhCgNSn",
  "booking_reference": "ABC123",
  "total_amount": "5017.27",
  "currency": "EUR",
  "slices": [...],
  "passengers": [...],
  "documents": [...]
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | selected_offers, matricule et passenger_id sont requis |
| 400 | Budget insuffisant |
| 403 | Budget bloqué pour cet utilisateur |
| 404 | Utilisateur non trouvé |
| 404 | Aucun budget trouvé pour cet utilisateur |
| 404 | Aucune réservation de billet trouvée pour cet utilisateur |
| 409 | Cette réservation n'est pas en attente |
| 500 | Erreur lors de la réservation du vol |

---

### POST `/api/flights/book-group`

Réserver un vol pour plusieurs passagers via le SDK Duffel.

**Accès** : Manager ou SuperAdmin

**Body**
```json
{
  "selected_offers": ["off_0000B7xJ48O26NuJhCgNSn"],
  "matricules": ["A3T9KL", "B4X5MN", "C7Y8OP"],
  "passenger_ids": ["passenger_1", "passenger_2", "passenger_3"],
  "demandeVoyageIds": [1, 2, 3]
}
```

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| selected_offers | array | Oui | Liste des IDs des offres à réserver |
| matricules | array | Oui | Tableau des matricules des passagers |
| passenger_ids | array | Oui | Tableau des IDs uniques des passagers pour la réservation Duffel |
| demandeVoyageIds | array | Oui | Tableau des IDs des demandes de voyage associées pour identifier les réservations à mettre à jour |

**Comportement**

> **Note** : La réservation groupée effectue les opérations suivantes :
> 1. Vérifie que les tableaux matricules, passenger_ids et demandeVoyageIds ont la même longueur
> 2. Récupère les informations de tous les passagers depuis leurs profils utilisateurs
> 3. Vérifie que tous les passagers ont des informations de passeport valides
> 4. Rafraîchit l'offre Duffel pour obtenir le prix à jour
> 5. Vérifie le budget de chaque utilisateur (budget non bloqué et montant suffisant)
> 6. Convertit le prix en FCFA selon la devise (USD → 550 FCFA, EUR → 650 FCFA, XOF → 1)
> 7. Crée la réservation groupée via l'API Duffel
> 8. Met à jour toutes les ReservationBillet avec les détails de la réservation
> 9. Déduit le montant du budget personnel de chaque utilisateur
> 10. Crée des entrées AuditBudget pour tracer chaque transaction

**Réponse 200**
```json
{
  "order": {
    "id": "ord_0000B7xJ48O26NuJhCgNSn",
    "booking_reference": "ABC123",
    "total_amount": "5017.27",
    "currency": "EUR",
    "slices": [...],
    "passengers": [...],
    "documents": [...]
  },
  "passengers": ["A3T9KL", "B4X5MN", "C7Y8OP"],
  "totalPassengers": 3
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | selected_offers est requis |
| 400 | matricules est requis (tableau non vide) |
| 400 | passenger_ids est requis (tableau non vide) |
| 400 | demandeVoyageIds est requis (tableau non vide) |
| 400 | Les tableaux matricules, passenger_ids et demandeVoyageIds doivent avoir la même longueur |
| 400 | Certains utilisateurs n'ont pas de passeport valide |
| 400 | Certains utilisateurs ont un budget insuffisant |
| 403 | Certains budgets sont bloqués |
| 404 | Certains utilisateurs n'ont pas été trouvés |
| 404 | Certains utilisateurs n'ont pas de budget |
| 404 | Certaines réservations de billet n'ont pas été trouvées |
| 409 | Certaines réservations ne sont pas en attente |
| 500 | Erreur lors de la réservation du vol groupé |

---

### POST `/api/flights/cancel/check`

Vérifier les conditions d'annulation d'une commande de vol via le SDK Duffel.

**Accès** : Manager ou SuperAdmin

**Body**
```json
{
  "orderId": "ord_0000B7xJ48O26NuJhCgNSn"
}
```

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| orderId | string | Oui | ID de la commande Duffel à vérifier |

**Comportement**

> **Note** : Cette API ne réalise pas l'annulation, elle vérifie uniquement les conditions d'annulation via l'API Duffel (duffel.orderCancellations.create). Le frontend peut ensuite décider de procéder à l'annulation en fonction du quote reçu.

**Réponse 200**

> **Note** : La réponse est le quote d'annulation Duffel. La structure peut varier selon les données retournées par Duffel.

```json
{
  "data": {
    "refund_to": "balance",
    "refund_currency": "EUR",
    "refund_amount": "175.71",
    "confirmed_at": null,
    "airline_credits": [],
    "order_id": "ord_0000B840AJ5huC6TxhrLFY",
    "created_at": "2026-07-07T10:59:44.844470Z",
    "live_mode": false,
    "expires_at": "2026-07-07T11:59:44Z",
    "id": "ore_0000B85gVdnD8wtvggg9w1"
  }
}
```

**Réponse 422 (Erreur)**

> **Note** : Si la commande ne peut pas être annulée, l'API retourne l'erreur Duffel telle quelle.

```json
{
  "errors": [
    {
      "documentation_url": "https://duffel.com/docs/api/overview/response-handling",
      "title": "Order already cancelled",
      "type": "invalid_state_error",
      "message": "This order has already been cancelled.",
      "code": "already_cancelled"
    }
  ],
  "meta": {
    "request_id": "GL_86OCGHajTw_oAA7AB",
    "status": 422
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | orderId est requis |
| 422 | Erreur Duffel (commande déjà annulée, etc.) |
| 500 | Erreur lors de la vérification des conditions d'annulation |

---

## Guide d'utilisation Frontend

Voici comment traiter les différents types de réponses pour l'endpoint POST `/api/flights/cancel/check`:

### Exemple de code (JavaScript/TypeScript)

```typescript
async function checkCancellationConditions(orderId: string) {
  try {
    const response = await fetch('/api/flights/cancel/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId }),
    })

    const data = await response.json()

    // Succès - Quote d'annulation disponible
    if (response.ok && response.status === 200) {
      const quote = data.data
      console.log('Quote d\'annulation:', quote)

      // Afficher les conditions d'annulation à l'utilisateur
      const refundAmount = quote.refund_amount
      const refundCurrency = quote.refund_currency
      const expiresAt = new Date(quote.expires_at)

      return {
        success: true,
        canCancel: true,
        refundAmount,
        refundCurrency,
        expiresAt,
        quoteId: quote.id,
      }
    }

    // Erreur 422 - Erreur Duffel (commande déjà annulée, etc.)
    if (response.status === 422) {
      const errors = data.errors || []
      const firstError = errors[0]

      console.error('Erreur Duffel:', firstError)

      // Codes d'erreur Duffel courants
      const errorMessages: Record<string, string> = {
        'already_cancelled': 'Cette commande a déjà été annulée.',
        'order_not_cancellable': 'Cette commande ne peut pas être annulée.',
        'invalid_state_error': 'État de la commande invalide pour l\'annulation.',
        'cancellation_deadline_passed': 'Le délai d\'annulation est dépassé.',
      }

      const message = errorMessages[firstError?.code] || firstError?.message || 'Erreur lors de la vérification des conditions d\'annulation.'

      return {
        success: false,
        canCancel: false,
        error: message,
        errorCode: firstError?.code,
        duffelError: firstError,
      }
    }

    // Erreur 400 - Champs manquants
    if (response.status === 400) {
      return {
        success: false,
        canCancel: false,
        error: data.message || 'Paramètres invalides',
      }
    }

    // Erreur 401 - Non authentifié
    if (response.status === 401) {
      return {
        success: false,
        canCancel: false,
        error: 'Non authentifié. Veuillez vous reconnecter.',
      }
    }

    // Erreur 403 - Pas les droits
    if (response.status === 403) {
      return {
        success: false,
        canCancel: false,
        error: 'Vous n\'avez pas les droits pour effectuer cette action.',
      }
    }

    // Erreur 500 - Erreur serveur
    if (response.status === 500) {
      return {
        success: false,
        canCancel: false,
        error: 'Erreur serveur. Veuillez réessayer plus tard.',
      }
    }

    // Autres erreurs
    return {
      success: false,
      canCancel: false,
      error: 'Erreur inconnue',
    }
  } catch (error) {
    console.error('Erreur réseau:', error)
    return {
      success: false,
      canCancel: false,
      error: 'Erreur de connexion. Veuillez vérifier votre réseau.',
    }
  }
}
```

### Exemple d'utilisation dans un composant React

```typescript
import { useState } from 'react'

function CancellationCheckButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleCheck = async () => {
    setLoading(true)
    setResult(null)

    const result = await checkCancellationConditions(orderId)
    setResult(result)
    setLoading(false)
  }

  return (
    <div>
      <button onClick={handleCheck} disabled={loading}>
        {loading ? 'Vérification...' : 'Vérifier les conditions d\'annulation'}
      </button>

      {result && (
        <div>
          {result.success ? (
            <div className="success">
              <h3>Annulation possible</h3>
              <p>Remboursement: {result.refundAmount} {result.refundCurrency}</p>
              <p>Expire le: {result.expiresAt.toLocaleString()}</p>
              <button>Confirmer l'annulation</button>
            </div>
          ) : (
            <div className="error">
              <h3>Annulation impossible</h3>
              <p>{result.error}</p>
              {result.errorCode && <p>Code: {result.errorCode}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

### Codes d'erreur Duffel courants

| Code | Message | Action suggérée |
|------|---------|-----------------|
| `already_cancelled` | Cette commande a déjà été annulée. | Informer l'utilisateur que la commande est déjà annulée |
| `order_not_cancellable` | Cette commande ne peut pas être annulée. | Informer l'utilisateur que l'annulation n'est pas possible |
| `invalid_state_error` | État de la commande invalide pour l'annulation. | Vérifier l'état de la commande |
| `cancellation_deadline_passed` | Le délai d'annulation est dépassé. | Informer l'utilisateur que le délai est dépassé |

---

### POST `/api/flights/cancel/confirm`

Annuler une commande de vol via le SDK Duffel (combine la création du quote et la confirmation).

**Accès** : Manager ou SuperAdmin

**Body**
```json
{
  "orderId": "ord_0000B7xJ48O26NuJhCgNSn"
}
```

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| orderId | string | Oui | ID de la commande Duffel à annuler |

**Comportement**

> **Note** : Cette API combine plusieurs étapes en une seule requête :
> 1. Récupère la réservation de billet correspondant à l'orderId
> 2. Vérifie que la réservation n'est pas déjà annulée
> 3. Récupère l'utilisateur et son budget personnel
> 4. Crée un quote d'annulation via `duffel.orderCancellations.create()`
> 5. Récupère l'ID du quote créé
> 6. Confirme l'annulation via `duffel.orderCancellations.confirm(cancellationId)`
> 7. Met à jour la base de données en transaction atomique :
>    - Met le statut de `ReservationBillet` à `ANNULEE`
>    - Rembourse le montant au budget personnel de l'utilisateur
>    - Crée une entrée `AuditBudget` pour tracer la transaction
> 8. Retourne la réponse de confirmation Duffel

**Réponse 200**

> **Note** : La réponse est la confirmation d'annulation Duffel. La structure peut varier selon les données retournées par Duffel.

```json
{
  "data": {
    "refund_to": "balance",
    "refund_currency": "EUR",
    "refund_amount": "38.95",
    "confirmed_at": "2026-07-07T12:16:05.123456Z",
    "airline_credits": [],
    "order_id": "ord_0000B85inQFjvrP9DB0vZs",
    "live_mode": false,
    "created_at": "2026-07-07T12:16:01.343051Z",
    "expires_at": "2026-07-07T13:16:01Z",
    "id": "ore_0000B85nJgiwd1HTNYJbSy"
  }
}
```

**Réponse 422 (Erreur)**

> **Note** : Si la commande ne peut pas être annulée, l'API retourne l'erreur Duffel telle quelle.

```json
{
  "errors": [
    {
      "documentation_url": "https://duffel.com/docs/api/overview/response-handling",
      "title": "Order already cancelled",
      "type": "invalid_state_error",
      "message": "This order has already been cancelled.",
      "code": "already_cancelled"
    }
  ],
  "meta": {
    "request_id": "GL_86OCGHajTw_oAA7AB",
    "status": 422
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | orderId est requis |
| 404 | Réservation de billet, utilisateur ou budget non trouvé |
| 409 | Cette réservation est déjà annulée |
| 422 | Erreur Duffel (commande déjà annulée, etc.) |
| 500 | Erreur lors de l'annulation de la commande |

---

## Guide d'utilisation Frontend - Annulation Complète

Voici comment utiliser l'endpoint POST `/api/flights/cancel/confirm` pour annuler directement une commande:

### Exemple de code (JavaScript/TypeScript)

```typescript
async function cancelOrder(orderId: string) {
  try {
    const response = await fetch('/api/flights/cancel/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId }),
    })

    const data = await response.json()

    // Succès - Annulation confirmée
    if (response.ok && response.status === 200) {
      const confirmation = data.data
      console.log('Annulation confirmée:', confirmation)

      return {
        success: true,
        cancelled: true,
        refundAmount: confirmation.refund_amount,
        refundCurrency: confirmation.refund_currency,
        confirmedAt: new Date(confirmation.confirmed_at),
        cancellationId: confirmation.id,
      }
    }

    // Erreur 422 - Erreur Duffel
    if (response.status === 422) {
      const errors = data.errors || []
      const firstError = errors[0]

      const errorMessages: Record<string, string> = {
        'already_cancelled': 'Cette commande a déjà été annulée.',
        'order_not_cancellable': 'Cette commande ne peut pas être annulée.',
        'invalid_state_error': 'État de la commande invalide pour l\'annulation.',
        'cancellation_deadline_passed': 'Le délai d\'annulation est dépassé.',
      }

      const message = errorMessages[firstError?.code] || firstError?.message || 'Erreur lors de l\'annulation.'

      return {
        success: false,
        cancelled: false,
        error: message,
        errorCode: firstError?.code,
      }
    }

    // Autres erreurs
    return {
      success: false,
      cancelled: false,
      error: 'Erreur lors de l\'annulation',
    }
  } catch (error) {
    console.error('Erreur réseau:', error)
    return {
      success: false,
      cancelled: false,
      error: 'Erreur de connexion.',
    }
  }
}
```

### Exemple d'utilisation dans un composant React

```typescript
import { useState } from 'react'

function CancelOrderButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleCancel = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) {
      return
    }

    setLoading(true)
    setResult(null)

    const result = await cancelOrder(orderId)
    setResult(result)
    setLoading(false)
  }

  return (
    <div>
      <button onClick={handleCancel} disabled={loading}>
        {loading ? 'Annulation en cours...' : 'Annuler la commande'}
      </button>

      {result && (
        <div>
          {result.success ? (
            <div className="success">
              <h3>Commande annulée avec succès</h3>
              <p>Remboursement: {result.refundAmount} {result.refundCurrency}</p>
              <p>Confirmé le: {result.confirmedAt.toLocaleString()}</p>
            </div>
          ) : (
            <div className="error">
              <h3>Échec de l'annulation</h3>
              <p>{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## Modèle Billet

Le modèle `Billet` stocke les informations sur les billets de vol émis via Duffel.

**Champs**
| Champ | Type | Description |
|---|---|---|
| id | Int | Identifiant unique (auto-incrémenté) |
| numeroOrder | String | Numéro de commande Duffel (unique) |
| url | String? | URL du billet électronique (optionnel) |
| statut | StatutBillet | Statut du billet (EN_ATTENTE, DISPONIBLE) |
| createdAt | DateTime | Date de création |
| updatedAt | DateTime | Date de dernière mise à jour |

**StatutBillet**
| Valeur | Description |
|---|---|
| EN_ATTENTE | Billet en attente d'émission |
| DISPONIBLE | Billet disponible/émis |

---

## Modèle Forfait

Le modèle `Forfait` stocke les informations sur le forfait d'une entreprise, définissant le nombre d'utilisateurs autorisés et le nombre actuel.

**Champs**
| Champ | Type | Description |
|---|---|---|
| id | Int | Identifiant unique (auto-incrémenté) |
| entrepriseId | Int | ID de l'entreprise (unique) |
| nombre_user_autorise | Int | Nombre d'utilisateurs autorisés par le forfait |
| nombre_user_actuel | Int | Nombre d'utilisateurs actuels (défaut: 0) |
| createdAt | DateTime | Date de création |
| updatedAt | DateTime | Date de dernière mise à jour |

**Relations**
| Relation | Type | Modèle cible |
|---|---|---|
| entreprise | Many-to-One | Entreprise |

---

### GET `/api/flights/orders/:id`

Récupérer les détails d'une commande Duffel par son ID.

**Accès** : Manager ou SuperAdmin

**Paramètres**
| Paramètre | Type | Requis | Description |
|---|---|---|---|
| id | string | Oui | ID de la commande Duffel (ex: ord_0000B7xvmYqhkSGWjKgsr2) |

**Réponse 200**

> **Note** : La réponse est la réponse brute de l'API Duffel. La structure peut varier selon les données retournées par Duffel.

```json
{
  "id": "ord_0000B7xJ48O26NuJhCgNSn",
  "booking_reference": "ABC123",
  "total_amount": "5017.27",
  "currency": "EUR",
  "slices": [...],
  "passengers": [...],
  "documents": [...]
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | ID de commande requis |
| 500 | Erreur lors de la récupération de la commande |

---

## 10. Employés

### POST `/api/employes`

Créer un ou plusieurs employés pour une entreprise en une seule requête.  
Le `matricule` (6 caractères alphanum. majuscule) est **auto-généré et unique** pour chaque employé.  
Les doublons d'email sont ignorés silencieusement (`skipDuplicates`).  
Le nombre d'employés créés est vérifié par rapport au forfait de l'entreprise.

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
      "role": "MANAGER",
      "civilite": "Mme",
      "genre": "F",
      "numero_passport": "123456789",
      "date_expiration_passport": "2030-01-15"
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
> `civilite`, `genre`, `numero_passport`, `date_expiration_passport` sont optionnels (utilisés pour les réservations de vols).  
> Le nombre d'employés créés ne peut pas dépasser les places disponibles dans le forfait de l'entreprise.

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
      "civilite": "Mme",
      "genre": "F",
      "numero_passport": "123456789",
      "date_expiration_passport": "2030-01-15",
      "entrepriseId": 1,
      "createdAt": "2026-06-30T09:00:00.000Z"
    }
  ],
  "forfait": {
    "nombre_user_autorise": 50,
    "nombre_user_actuel": 7,
    "places_restantes": 43
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | `entrepriseId` et un tableau `employes[]` non vide sont requis |
| 400 | Employé #N : champs manquants — prenom, email, ... |
| 400 | Employé #N : département "X" non trouvé pour cette entreprise |
| 400 | L'entreprise est désactivée |
| 400 | Aucun forfait trouvé pour cette entreprise |
| 400 | Limite du forfait atteinte. Places disponibles: X, Demandées: Y |
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
      "civilite": "Mme",
      "genre": "F",
      "numero_passport": "123456789",
      "date_expiration_passport": "2030-01-15",
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

### GET `/api/employes/:matricule/overview`

Obtenir une vue d'ensemble complète d'un employé avec tous ses détails.

**Accès** : Tous les utilisateurs authentifiés
- **EMPLOYE** : Peut voir uniquement ses propres données (son matricule)
- **MANAGER** : Peut voir les employés de son entreprise
- **SUPERADMIN** : Peut voir tous les employés

**Paramètre URL** : `matricule` (string)

**Réponse 200**

> **Note** : La réponse inclut toutes les informations de l'employé, son budget, ses réservations, ses demandes de voyage, sa politique et des statistiques.

```json
{
  "employee": {
    "id": 1,
    "prenom": "Jean",
    "nom": "Dupont",
    "email": "jean.dupont@example.com",
    "matricule": "A3T9KL",
    "departementId": 1,
    "departement": { "id": 1, "nom": "IT" },
    "poste": "Développeur",
    "telephone": "+221771234567",
    "role": "EMPLOYE",
    "is_block": false,
    "entrepriseId": 1,
    "entreprise": { "id": 1, "nom": "TechCorp", "identifiant": "ENT-001" },
    "civilite": "M.",
    "genre": "H",
    "numero_passport": "AB1234567",
    "date_expiration_passport": "2030-12-31",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-01T00:00:00Z"
  },
  "budgetPersonnel": {
    "id": 1,
    "reference": "BUD-05TZARd-2026/personnels",
    "matricule": "A3T9KL",
    "montant_alloue": 500000,
    "montant_utilise": 150000,
    "montant_restant": 350000,
    "bloquer": false
  },
  "reservationBillets": [
    {
      "id": 1,
      "numeroReservation": "ABC123",
      "numeroOrder": "ord_0000B7xJ48O26NuJhCgNSn",
      "statut": "CONFIRMEE",
      "prix": 500,
      "devise": "EUR"
    }
  ],
  "reservationHotels": [
    {
      "id": 1,
      "nomHotel": "Hilton Paris",
      "statut": "CONFIRMEE",
      "prixTotal": 300,
      "devise": "EUR"
    }
  ],
  "demandesVoyage": [
    {
      "id": 1,
      "depart": "Dakar",
      "arrive": "Paris",
      "statut": "APPROUVEE",
      "dateDepart": "2026-06-26"
    }
  ],
  "politique": {
    "id": 1,
    "classe": "Y",
    "hotel": "3",
    "politique": "Politique standard"
  },
  "auditBudgets": [
    {
      "id": 1,
      "action": "RESERVATION_BILLET",
      "montant": 500,
      "montant_avant": 350000,
      "montant_apres": 300000
    }
  ],
  "statistiques": {
    "demandes": {
      "total": 10,
      "approuvees": 7,
      "enCours": 2,
      "rejetees": 1,
      "annulees": 0
    },
    "vols": {
      "total": 5,
      "confirmes": 4,
      "enAttente": 1,
      "annules": 0
    },
    "hotels": {
      "total": 3,
      "confirmes": 2,
      "enAttente": 1,
      "annules": 0
    }
  }
}
```

**Erreurs**
| Code | Message |
|---|---|
| 400 | matricule est requis |
| 403 | Accès non autorisé (employé ne peut voir que ses propres données) |
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
