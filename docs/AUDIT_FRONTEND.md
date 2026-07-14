# Guide Frontend — Affichage des Logs d'Audit (AuditBudget)

## 1. Vue d'ensemble

Toutes les actions sur les budgets (création, modification, suppression, activation, clôture, allocation, augmentation, diminution) sont tracées dans la table `audit_budgets`.

**Objectif côté frontend :** fournir une interface de consultation (liste + filtres) permettant à un `SUPERADMIN` ou un `MANAGER` de tracer qui a fait quoi, quand, et avec quel rôle.

---

## 2. Endpoint API

### `GET /api/budgets-annuels/audits`

Récupère la liste paginée des logs d'audit.

### Headers requis

```http
Authorization: Bearer <token>
Content-Type: application/json
```

### Paramètres de requête (Query String)

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `reference` | `string` | Non | Filtre sur la référence du budget annuel (ex: `BUDGET-2026-ABC`) |
| `action` | `string` | Non | Filtre sur le type d'action (voir liste ci-dessous) |
| `role_effectue_par` | `string` | Non | Filtre sur le rôle de l'utilisateur (`SUPERADMIN`, `MANAGER`, `ADMIN`) |
| `page` | `number` | Non | Numéro de page (défaut: `1`) |
| `limit` | `number` | Non | Nombre d'éléments par page (défaut: `50`, max recommandé: `100`) |

### Actions disponibles (`action`)

| Action | Description |
|--------|-------------|
| `CREER_BUDGET_ANNUEL` | Création d'un budget annuel |
| `MODIFIER_BUDGET_ANNUEL` | Mise à jour d'un budget annuel |
| `SUPPRIMER_BUDGET_ANNUEL` | Suppression d'un budget annuel |
| `ACTIVER_BUDGET_ANNUEL` | Activation d'un budget annuel |
| `CLOTURER_BUDGET_ANNUEL` | Clôture d'un budget annuel |
| `ALLOUER_BUDGET_DEPARTEMENT` | Allocation vers un département |
| `ALLOUER_BUDGET_PERSONNEL` | Allocation vers un personnel |
| `MODIFIER_BUDGET_PERSONNEL` | Modification d'un budget personnel |
| `SUPPRIMER_BUDGET_PERSONNEL` | Suppression d'un budget personnel |
| `AUGMENTER_BUDGET_ANNUEL` | Augmentation du budget annuel |
| `DIMINUER_BUDGET_ANNUEL` | Diminution du budget annuel |
| `AUGMENTER_BUDGET_DEPARTEMENT` | Augmentation d'un budget département |
| `DIMINUER_BUDGET_DEPARTEMENT` | Diminution d'un budget département |
| `AUGMENTER_BUDGET_PERSONNEL` | Augmentation d'un budget personnel |
| `DIMINUER_BUDGET_PERSONNEL` | Diminution d'un budget personnel |

---

## 3. Format de réponse

### Réponse HTTP `200 OK`

```json
{
  "total": 2,
  "page": 1,
  "limit": 50,
  "audits": [
    {
      "id": 1,
      "reference": "BUDGET-2026-ABC",
      "entrepriseId": 3,
      "action": "CREER_BUDGET_ANNUEL",
      "type_source": null,
      "type_destination": "ANNUEL",
      "montant": "500000.00",
      "montant_avant": null,
      "montant_apres": null,
      "description": "Budget annuel créé pour l'année 2026",
      "effectue_par": "superadmin@entreprise.com",
      "effectue_par_id": 1,
      "role_effectue_par": "SUPERADMIN",
      "target_id": null,
      "target_matricule": null,
      "createdAt": "2026-07-01T14:30:00.000Z"
    },
    {
      "id": 2,
      "reference": "BUDGET-2026-ABC",
      "entrepriseId": 3,
      "action": "ACTIVER_BUDGET_ANNUEL",
      "type_source": null,
      "type_destination": "ANNUEL",
      "montant": null,
      "montant_avant": null,
      "montant_apres": null,
      "description": "Budget annuel BUDGET-2026-ABC activé",
      "effectue_par": "admin@entreprise.com",
      "effectue_par_id": 2,
      "role_effectue_par": "ADMIN",
      "target_id": null,
      "target_matricule": null,
      "createdAt": "2026-07-01T15:00:00.000Z"
    }
  ]
}
```

### Champs importants pour l'affichage

| Champ | Utilité frontend |
|-------|------------------|
| `action` | Badge/coloration selon le type (création = vert, suppression = rouge, etc.) |
| `effectue_par` | Email de l'utilisateur (affichage + tooltip) |
| `role_effectue_par` | Badge de rôle (`SUPERADMIN`, `MANAGER`, `ADMIN`) |
| `description` | Texte récapitulatif lisible par l'utilisateur |
| `montant` / `montant_avant` / `montant_apres` | Différence monétaire à afficher pour les actions de modification |
| `createdAt` | Date/heure de l'action (formatée côté frontend) |
| `reference` | Lien cliquable vers le détail du budget annuel |

---

## 4. Suggestions d'interface (UI/UX)

### 4.1 Tableau de logs (Audit Trail)

```
┌─────────────┬────────────────────────┬─────────────┬────────────────────────────────────────┬──────────────┐
│ Date        │ Action                 │ Rôle        │ Description                            │ Par          │
├─────────────┼────────────────────────┼─────────────┼────────────────────────────────────────┼──────────────┤
│ 01/07 15:00 │ ACTIVER_BUDGET_ANNUEL  │ [ADMIN]     │ Budget annuel BUDGET-2026-ABC activé   │ admin@...    │
│ 01/07 14:30 │ CREER_BUDGET_ANNUEL    │ [SUPERADMIN]│ Budget annuel créé pour l'année 2026   │ superadmin@..│
└─────────────┴────────────────────────┴─────────────┴────────────────────────────────────────┴──────────────┘
```

**Recommandations :**
- **Couleurs des badges d'action**
  - `CREER_*` → vert
  - `MODIFIER_*` / `AUGMENTER_*` / `DIMINUER_*` → orange/jaune
  - `SUPPRIMER_*` → rouge
  - `ACTIVER_*` → bleu
  - `CLOTURER_*` → gris
- **Format de date** : `DD/MM/YYYY HH:mm` (locale française) ou `toLocaleString('fr-FR')`
- **Montants** : formatés en devise locale (`500 000 FCFA` ou `€`)

### 4.2 Filtres recommandés

Barre de filtres au-dessus du tableau :

- **Référence budget** : champ texte avec autocomplete
- **Type d'action** : multi-select ou dropdown avec les 15 actions listées
- **Rôle** : dropdown (`Tous`, `SUPERADMIN`, `ADMIN`, `MANAGER`)
- **Date range** : datepicker `du` / `au` (filtrage côté client ou API si supporté)
- **Utilisateur** : champ texte (filtre sur `effectue_par`)

### 4.3 Détail d'une ligne (Drawer / Modal)

Au clic sur une ligne, afficher :
- Tous les champs JSON formatés
- Montant avant → après (avec flèche et delta)
- Lien vers le budget concerné (`/budgets-annuels/:reference`)

---

## 5. Exemples de requêtes frontend (TypeScript / React)

### 5.1 Récupérer tous les logs (paginés)

```typescript
const fetchAudits = async (page = 1, limit = 50) => {
  const res = await fetch(
    `/api/budgets-annuels/audits?page=${page}&limit=${limit}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.json(); // { total, page, limit, audits }
};
```

### 5.2 Filtrer par action et par rôle

```typescript
// Ex: logs de création faites par un SUPERADMIN
const fetchCreationBySuperAdmin = async () => {
  const params = new URLSearchParams({
    action: 'CREER_BUDGET_ANNUEL',
    role_effectue_par: 'SUPERADMIN',
    page: '1',
    limit: '50',
  });
  const res = await fetch(`/api/budgets-annuels/audits?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};
```

### 5.3 Filtrer par référence de budget

```typescript
const fetchBudgetAudits = async (reference: string) => {
  const res = await fetch(
    `/api/budgets-annuels/audits?reference=${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.json();
};
```

---

## 6. Gestion des rôles côté frontend

| Rôle | Accès suggéré |
|------|---------------|
| `SUPERADMIN` | Voir **tous** les logs de **toutes** les entreprises + filtres complets |
| `ADMIN` | Voir les logs de **son entreprise** uniquement + filtres par utilisateur |
| `MANAGER` | Voir les logs de **son entreprise** uniquement (filtrage automatique côté API) |

> **Note** : l'API applique déjà un filtre automatique pour les `MANAGER` (ils ne voient que les logs liés à leur entreprise).

---

## 7. Codes d'erreur

| Code | Signification | Action frontend |
|------|---------------|-----------------|
| `401` | Token manquant ou invalide | Redirection vers la page de login |
| `403` | Accès interdit | Afficher un message "Accès refusé" |
| `500` | Erreur serveur | Afficher un toast d'erreur générique |

---

## 8. Bonnes pratiques

1. **Toujours récupérer les données côté serveur** : ne pas stocker les logs en cache local longtemps (données sensibles).
2. **Pagination obligatoire** : la table peut contenir des milliers de lignes.
3. **Formatage des montants** : utiliser `Intl.NumberFormat('fr-FR')` pour la cohérence.
4. **Timezones** : les dates sont en UTC (`createdAt`). Convertir en heure locale côté frontend.
5. **Dégradés de couleur** : utiliser les couleurs de manière accessible (contraste suffisant pour les badges).
