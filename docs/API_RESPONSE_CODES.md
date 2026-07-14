# Codes de Retour HTTP - API Eazy Visa Plateforme

Ce document documente tous les codes de retour HTTP pour chaque endpoint de l'API backend.

## Codes HTTP Généraux

| Code | Signification | Utilisation |
|------|---------------|-------------|
| 200 | OK | Succès pour GET, PUT, DELETE, PATCH |
| 201 | Created | Ressource créée avec succès (POST) |
| 400 | Bad Request | Requête invalide (champs manquants, invalides) |
| 401 | Unauthorized | Non authentifié (token manquant ou invalide) |
| 403 | Forbidden | Authentifié mais pas les droits nécessaires |
| 404 | Not Found | Ressource non trouvée |
| 409 | Conflict | Conflit de données (doublon, statut invalide) |
| 429 | Too Many Requests | Rate limiting dépassé |
| 500 | Internal Server Error | Erreur serveur |

---

## Authentification (`/api/auth`)

### POST `/api/auth/login/superadmin`
- **200**: Connexion réussie
  - Retourne: `{ message, token, superadmin }`
- **400**: Champs manquants
  - Code: `MISSING_CREDENTIALS`
- **401**: Identifiants incorrects
  - Code: `INVALID_CREDENTIALS`
- **500**: Configuration serveur manquante
  - Code: `CONFIG_MISSING`

### POST `/api/auth/login`
- **200**: Connexion réussie
  - Retourne: `{ message, token, user }`
- **400**: Champs manquants
  - Code: `MISSING_CREDENTIALS`
- **401**: Identifiants incorrects
  - Code: `INVALID_CREDENTIALS`
- **403**: Compte bloqué
  - Code: `ACCOUNT_BLOCKED`
- **500**: Configuration JWT manquante
  - Code: `CONFIG_MISSING`

---

## Budget Annuel (`/api/budget-annuel`)

### POST `/api/budget-annuel`
- **201**: Budget annuel créé
  - Retourne: `{ message, budgetAnnuel }`
- **400**: Champs manquants
  - Code: `MISSING_FIELDS`
- **403**: Pas les droits (Manager sur autre entreprise)
- **404**: Entreprise non trouvée
- **500**: Erreur serveur

### GET `/api/budget-annuel`
- **200**: Liste des budgets annuels
  - Retourne: `{ total, budgets }`
- **401**: Non authentifié
- **403**: Pas les droits
- **500**: Erreur serveur

### GET `/api/budget-annuel/entreprise/:identifiant`
- **200**: Budgets de l'entreprise
  - Retourne: `{ total, budgets }`
- **401**: Non authentifié
- **403**: Pas les droits (Manager sur autre entreprise)
- **404**: Entreprise non trouvée
- **500**: Erreur serveur

### GET `/api/budget-annuel/:id`
- **200**: Détails du budget annuel
  - Retourne: Budget avec relations
- **401**: Non authentifié
- **403**: Pas les droits (Manager sur autre entreprise)
- **404**: Budget annuel non trouvé
- **500**: Erreur serveur

### PUT `/api/budget-annuel/:id`
- **200**: Budget mis à jour
  - Retourne: `{ message, budgetAnnuel }`
- **400**: Champs invalides
- **403**: Pas les droits
- **404**: Budget non trouvé
- **409**: Budget clôturé (modification impossible)
  - Code: `BUDGET_CLOTURE`
- **500**: Erreur serveur

### DELETE `/api/budget-annuel/:id`
- **200**: Budget supprimé
  - Retourne: `{ message }`
- **403**: Pas les droits
- **404**: Budget non trouvé
- **409**: Budget a des allocations (suppression impossible)
  - Code: `BUDGET_HAS_CHILDREN`
- **500**: Erreur serveur

### PATCH `/api/budget-annuel/:id/activer`
- **200**: Budget activé
  - Retourne: `{ message, budgetAnnuel }`
- **403**: Pas les droits
- **404**: Budget non trouvé
- **409**: Budget déjà activé ou clôturé
  - Code: `BUDGET_ALREADY_ACTIVE` ou `BUDGET_CLOTURE`
- **500**: Erreur serveur

### PATCH `/api/budget-annuel/:id/cloturer`
- **200**: Budget clôturé
  - Retourne: `{ message, budgetAnnuel }`
- **403**: Pas les droits
- **404**: Budget non trouvé
- **409**: Budget non activé ou déjà clôturé
  - Code: `BUDGET_NOT_ACTIVE` ou `BUDGET_ALREADY_CLOSED`
- **500**: Erreur serveur

---

## Budget Allocation (`/api/budget-allocation`)

### GET `/api/budget-allocation/audits/employe/:matricule`
- **200**: Audits de l'employé
  - Retourne: Liste des audits
- **401**: Non authentifié
- **403**: Pas les droits
- **500**: Erreur serveur

### GET `/api/budget-allocation/audits`
- **200**: Tous les audits
  - Retourne: Liste des audits
- **401**: Non authentifié
- **403**: Pas les droits (Manager/SuperAdmin requis)
- **500**: Erreur serveur

### GET `/api/budget-allocation/mes-budgets`
- **200**: Mes budgets personnels
  - Retourne: Liste des budgets
- **401**: Non authentifié
- **403**: Pas les droits
- **500**: Erreur serveur

### GET `/api/budget-allocation/employe/:matricule/budgets`
- **200**: Budgets de l'employé
  - Retourne: Liste des budgets
- **401**: Non authentifié
- **403**: Pas les droits
- **500**: Erreur serveur

### POST `/api/budget-allocation/:reference/departements`
- **201**: Budget département alloué
  - Retourne: `{ message, budgetDepartement }`
- **400**: Champs manquants ou invalides
- **403**: Pas les droits
- **404**: Budget annuel ou département non trouvé
- **409**: Budget clôturé ou insuffisant
- **500**: Erreur serveur

### POST `/api/budget-allocation/:reference/personnels`
- **201**: Budget personnel alloué
  - Retourne: `{ message, budgetPersonnel }`
- **400**: Champs manquants ou invalides
- **403**: Pas les droits
- **404**: Budget annuel ou utilisateur non trouvé
- **409**: Budget clôturé ou insuffisant
- **500**: Erreur serveur

### GET `/api/budget-allocation/:reference/departements`
- **200**: Budgets départementaux
  - Retourne: Liste des budgets
- **401**: Non authentifié
- **403**: Pas les droits
- **404**: Budget annuel non trouvé
- **500**: Erreur serveur

### GET `/api/budget-allocation/:reference/personnels`
- **200**: Budgets personnels
  - Retourne: Liste des budgets
- **401**: Non authentifié
- **403**: Pas les droits
- **404**: Budget annuel non trouvé
- **500**: Erreur serveur

### PUT `/api/budget-allocation/departements/:id`
- **200**: Budget département mis à jour
  - Retourne: `{ message, budgetDepartement }`
- **400**: Champs invalides
- **403**: Pas les droits
- **404**: Budget non trouvé
- **409**: Budget clôturé ou bloqué
- **500**: Erreur serveur

### DELETE `/api/budget-allocation/departements/:id`
- **200**: Budget département supprimé
  - Retourne: `{ message }`
- **403**: Pas les droits
- **404**: Budget non trouvé
- **409**: Budget clôturé ou bloqué
- **500**: Erreur serveur

### PUT `/api/budget-allocation/personnels/:id`
- **200**: Budget personnel mis à jour
  - Retourne: `{ message, budgetPersonnel }`
- **400**: Champs invalides
- **403**: Pas les droits
- **404**: Budget non trouvé
- **409**: Budget clôturé ou bloqué
- **500**: Erreur serveur

### DELETE `/api/budget-allocation/personnels/:id`
- **200**: Budget personnel supprimé
  - Retourne: `{ message }`
- **403**: Pas les droits
- **404**: Budget non trouvé
- **409**: Budget clôturé ou bloqué
- **500**: Erreur serveur

### POST `/api/budget-allocation/:reference/augmenter`
- **200**: Budget annuel augmenté
  - Retourne: `{ message, budgetAnnuel }`
- **400**: Montant invalide
- **403**: Pas les droits
- **404**: Budget non trouvé
- **409**: Budget clôturé
- **500**: Erreur serveur

### POST `/api/budget-allocation/:reference/diminuer`
- **200**: Budget annuel diminué
  - Retourne: `{ message, budgetAnnuel }`
- **400**: Montant invalide ou insuffisant
- **403**: Pas les droits
- **404**: Budget non trouvé
- **409**: Budget clôturé
- **500**: Erreur serveur

### POST `/api/budget-allocation/departements/:id/augmenter`
- **200**: Budget département augmenté
  - Retourne: `{ message, budgetDepartement }`
- **400**: Montant invalide
- **403**: Pas les droits
- **404**: Budget non trouvé
- **409**: Budget clôturé ou bloqué
- **500**: Erreur serveur

### POST `/api/budget-allocation/departements/:id/diminuer`
- **200**: Budget département diminué
  - Retourne: `{ message, budgetDepartement }`
- **400**: Montant invalide ou insuffisant
- **403**: Pas les droits
- **404**: Budget non trouvé
- **409**: Budget clôturé ou bloqué
- **500**: Erreur serveur

### POST `/api/budget-allocation/personnels/:id/augmenter`
- **200**: Budget personnel augmenté
  - Retourne: `{ message, budgetPersonnel }`
- **400**: Montant invalide
- **403**: Pas les droits
- **404**: Budget non trouvé
- **409**: Budget clôturé ou bloqué
- **500**: Erreur serveur

### POST `/api/budget-allocation/personnels/:id/diminuer`
- **200**: Budget personnel diminué
  - Retourne: `{ message, budgetPersonnel }`
- **400**: Montant invalide ou insuffisant
- **403**: Pas les droits
- **404**: Budget non trouvé
- **409**: Budget clôturé ou bloqué
- **500**: Erreur serveur

### PATCH `/api/budget-allocation/departements/:id/bloquer`
- **200**: Budget département bloqué
  - Retourne: `{ message, budgetDepartement }`
- **403**: Pas les droits
- **404**: Budget non trouvé
- **500**: Erreur serveur

### PATCH `/api/budget-allocation/departements/:id/debloquer`
- **200**: Budget département débloqué
  - Retourne: `{ message, budgetDepartement }`
- **403**: Pas les droits
- **404**: Budget non trouvé
- **500**: Erreur serveur

### PATCH `/api/budget-allocation/personnels/:id/bloquer`
- **200**: Budget personnel bloqué
  - Retourne: `{ message, budgetPersonnel }`
- **403**: Pas les droits
- **404**: Budget non trouvé
- **500**: Erreur serveur

### PATCH `/api/budget-allocation/personnels/:id/debloquer`
- **200**: Budget personnel débloqué
  - Retourne: `{ message, budgetPersonnel }`
- **403**: Pas les droits
- **404**: Budget non trouvé
- **500**: Erreur serveur

---

## Dashboard (`/api/dashboard`)

### GET `/api/dashboard/overview`
- **200**: Vue d'ensemble du dashboard
  - Retourne: Statistiques agrégées
- **401**: Non authentifié
- **403**: Pas les droits (Manager/SuperAdmin requis)
- **500**: Erreur serveur

### GET `/api/dashboard/details`
- **200**: Détails complets du dashboard
  - Retourne: Données détaillées
- **401**: Non authentifié
- **403**: Pas les droits (Manager/SuperAdmin requis)
- **500**: Erreur serveur

---

## Demande de Voyage (`/api/demande-voyage`)

### POST `/api/demande-voyage`
- **201**: Demande créée
  - Retourne: `{ message, demande }`
- **400**: Champs manquants ou invalides
  - Codes: `MISSING_FIELDS`, `MISSING_TOKEN_FIELDS`, `INVALID_HOTEL`, `MISSING_RETURN_DATE`
- **401**: Non authentifié
- **403**: Pas les droits
- **404**: Employé ou entreprise non trouvé
- **409**: Classe non autorisée par la politique
  - Code: `CLASSE_NON_AUTORISEE`
- **500**: Erreur serveur

### GET `/api/demande-voyage/mes-demandes`
- **200**: Mes demandes
  - Retourne: `{ total, demandes }`
- **401**: Non authentifié
- **403**: Pas les droits
- **500**: Erreur serveur

### GET `/api/demande-voyage`
- **200**: Toutes les demandes
  - Retourne: `{ total, demandes }`
- **401**: Non authentifié
- **403**: Pas les droits (Manager/SuperAdmin requis)
- **500**: Erreur serveur

### GET `/api/demande-voyage/:id`
- **200**: Détails de la demande
  - Retourne: `{ demande }`
- **401**: Non authentifié
- **403**: Pas les droits
- **404**: Demande non trouvée
- **500**: Erreur serveur

### PUT `/api/demande-voyage/:id`
- **200**: Demande mise à jour
  - Retourne: `{ message, demande }`
- **400**: Champs invalides
  - Codes: `INVALID_HOTEL`, `MISSING_RETURN_DATE`
- **401**: Non authentifié
- **403**: Pas les droits
- **404**: Demande non trouvée
- **409**: Statut invalide (pas EN_ATTENTE) ou classe non autorisée
  - Codes: `STATUT_INVALIDE`, `CLASSE_NON_AUTORISEE`
- **500**: Erreur serveur

### PATCH `/api/demande-voyage/:id/approuver`
- **200**: Demande approuvée
  - Retourne: `{ message, demande, reservationBillet, reservationHotel }`
- **401**: Non authentifié
- **403**: Pas les droits (Manager/SuperAdmin requis)
- **404**: Demande non trouvée
- **409**: Statut invalide (pas EN_ATTENTE)
  - Code: `STATUT_INVALIDE`
- **500**: Erreur serveur

### PATCH `/api/demande-voyage/:id/rejeter`
- **200**: Demande rejetée
  - Retourne: `{ message, demande }`
- **401**: Non authentifié
- **403**: Pas les droits (Manager/SuperAdmin requis)
- **404**: Demande non trouvée
- **409**: Statut invalide (pas EN_ATTENTE)
  - Code: `STATUT_INVALIDE`
- **500**: Erreur serveur

### PATCH `/api/demande-voyage/:id/annuler`
- **200**: Demande annulée
  - Retourne: `{ message, demande }`
- **401**: Non authentifié
- **403**: Pas les droits
- **404**: Demande non trouvée
- **409**: Statut invalide (déjà ANNULEE ou TERMINEE)
  - Code: `STATUT_INVALIDE`
- **500**: Erreur serveur

### PATCH `/api/demande-voyage/:id/cloturer`
- **200**: Demande clôturée
  - Retourne: `{ message, demande }`
- **401**: Non authentifié
- **403**: Pas les droits (Manager/SuperAdmin requis)
- **404**: Demande non trouvée
- **409**: Statut invalide (pas APPROUVEE ou EN_COURS)
  - Code: `STATUT_INVALIDE`
- **500**: Erreur serveur

---

## Département (`/api/departement`)

### POST `/api/departement`
- **201**: Département créé
  - Retourne: `{ message, departement }`
- **400**: Champs manquants
  - Code: `MISSING_FIELDS`
- **403**: Pas les droits (Manager sur autre entreprise)
- **404**: Entreprise non trouvée
- **409**: Département existe déjà
  - Code: `DEPARTEMENT_EXISTS`
- **500**: Erreur serveur

### GET `/api/departement/mon-entreprise`
- **200**: Départements de mon entreprise
  - Retourne: `{ total, departements }`
- **401**: Non authentifié
- **403**: Pas d'entreprise associée
- **500**: Erreur serveur

### GET `/api/departement`
- **200**: Départements de l'entreprise
  - Retourne: `{ total, departements }`
- **400**: Paramètre entrepriseId manquant
  - Code: `MISSING_QUERY_PARAM`
- **401**: Non authentifié
- **403**: Pas les droits
- **500**: Erreur serveur

### PUT `/api/departement/:id`
- **200**: Département mis à jour
  - Retourne: `{ message, departement }`
- **400**: Nom manquant
  - Code: `MISSING_FIELDS`
- **403**: Pas les droits
- **404**: Département non trouvé
- **409**: Département existe déjà
  - Code: `DEPARTEMENT_EXISTS`
- **500**: Erreur serveur

### DELETE `/api/departement/:id`
- **200**: Département supprimé
  - Retourne: `{ message }`
- **403**: Pas les droits
- **404**: Département non trouvé
- **409**: Département a des employés
  - Code: `DEPARTEMENT_HAS_USERS`
- **500**: Erreur serveur

---

## Employé (`/api/employe`)

### POST `/api/employe`
- **201**: Employé(s) créé(s)
  - Retourne: `{ message, total_demande, total_cree, ignores, employes }`
- **400**: Champs manquants ou invalides
  - Codes: `MISSING_FIELDS`, `DEPARTEMENT_NOT_FOUND`, `ENTREPRISE_INACTIVE`
- **403**: Pas les droits (Manager sur autre entreprise)
- **404**: Entreprise non trouvée
- **409**: Email existe déjà (ignoré silencieusement)
- **500**: Erreur serveur

### GET `/api/employe`
- **200**: Liste des employés
  - Retourne: `{ total, employes }`
- **401**: Non authentifié
- **403**: Pas les droits
- **500**: Erreur serveur

### GET `/api/employe/search`
- **200**: Résultats de recherche
  - Retourne: `{ total, employes }`
- **400**: Paramètre q manquant
  - Code: `MISSING_QUERY_PARAM`
- **401**: Non authentifié
- **404**: Aucun résultat
- **500**: Erreur serveur

### GET `/api/employe/:id`
- **200**: Détails de l'employé
  - Retourne: Employé
- **401**: Non authentifié
- **403**: Pas les droits (Manager sur autre entreprise)
- **404**: Employé non trouvé
- **500**: Erreur serveur

### PUT `/api/employe/:id`
- **200**: Employé mis à jour
  - Retourne: `{ message, employe }`
- **400**: Département non trouvé
  - Code: `DEPARTEMENT_NOT_FOUND`
- **403**: Pas les droits
- **404**: Employé non trouvé
- **409**: Email existe déjà
  - Code: `EMAIL_EXISTS`
- **500**: Erreur serveur

### PATCH `/api/employe/:id/bloquer`
- **200**: Statut de blocage modifié
  - Retourne: `{ message, employe }`
- **401**: Non authentifié
- **403**: Pas les droits
- **404**: Employé non trouvé
- **500**: Erreur serveur

### DELETE `/api/employe/:id`
- **200**: Employé supprimé
  - Retourne: `{ message }`
- **401**: Non authentifié
- **403**: Pas les droits
- **404**: Employé non trouvé
- **500**: Erreur serveur

### GET `/api/employe/:matricule/overview`
- **200**: Vue d'ensemble complète de l'employé
  - Retourne: `{ employee, budgetPersonnel, reservationBillets, reservationHotels, demandesVoyage, politique, auditBudgets, statistiques }`
- **400**: matricule requis
  - Retourne: `{ message }`
- **401**: Non authentifié
- **403**: Pas les droits (employé ne peut voir que ses propres données, Manager sur autre entreprise)
- **404**: Employé non trouvé
- **500**: Erreur serveur

---

## Entreprise (`/api/entreprise`)

### POST `/api/entreprise`
- **201**: Entreprise créée
  - Retourne: `{ message, identifiant_genere, entreprise }`
- **400**: Champs manquants
  - Code: `MISSING_FIELDS`
- **401**: Non authentifié
- **403**: Pas les droits (SuperAdmin requis)
- **500**: Erreur serveur

### GET `/api/entreprise`
- **200**: Liste des entreprises
  - Retourne: Liste des entreprises
- **401**: Non authentifié
- **403**: Pas les droits (SuperAdmin requis)
- **500**: Erreur serveur

### GET `/api/entreprise/:id`
- **200**: Détails de l'entreprise
  - Retourne: Entreprise avec utilisateurs
- **401**: Non authentifié
- **403**: Pas les droits (SuperAdmin requis)
- **404**: Entreprise non trouvée
- **500**: Erreur serveur

### PUT `/api/entreprise/:id`
- **200**: Entreprise mise à jour
  - Retourne: `{ message, entreprise }`
- **401**: Non authentifié
- **403**: Pas les droits (SuperAdmin requis)
- **404**: Entreprise non trouvée
- **500**: Erreur serveur

### PATCH `/api/entreprise/:id/statut`
- **200**: Statut modifié
  - Retourne: `{ message, entreprise }`
- **401**: Non authentifié
- **403**: Pas les droits (SuperAdmin requis)
- **404**: Entreprise non trouvée
- **500**: Erreur serveur

### GET `/api/entreprise/:id/logo`
- **200**: Logo de l'entreprise
  - Retourne: Logo
- **401**: Non authentifié
- **403**: Pas les droits (SuperAdmin requis)
- **404**: Entreprise non trouvée
- **500**: Erreur serveur

### PATCH `/api/entreprise/:id/logo`
- **200**: Logo mis à jour
  - Retourne: Logo
- **400**: Fichier invalide (pas une image)
- **401**: Non authentifié
- **403**: Pas les droits (SuperAdmin requis)
- **404**: Entreprise non trouvée
- **413**: Fichier trop volumineux (>5MB)
- **500**: Erreur serveur

---

## Flights (`/api/flights`)

### POST `/api/flights/search`
- **200**: Résultats de recherche
  - Retourne: `{ offer_request_id, offers, pagination }`
- **400**: Champs manquants
  - Retourne: `{ message }`
- **401**: Non authentifié
- **403**: Pas les droits (Manager/SuperAdmin requis)
- **500**: Erreur lors de la recherche
  - Retourne: `{ message, error, errorDetails }`

### POST `/api/flights/book`
- **200**: Réservation effectuée
  - Retourne: Order Duffel
- **400**: Champs manquants ou budget insuffisant
  - Retourne: `{ message }`
- **401**: Non authentifié
- **403**: Pas les droits (Manager/SuperAdmin requis)
- **404**: Utilisateur, budget ou réservation non trouvé
  - Retourne: `{ message }`
- **409**: Cette réservation n'est pas en attente
  - Retourne: `{ message, statutActuel }`
- **500**: Erreur lors de la réservation
  - Retourne: `{ message, error, errorDetails, duffelErrors, duffelMeta }`

### GET `/api/flights/orders/:id`
- **200**: Détails de la commande
  - Retourne: Order Duffel
- **400**: ID manquant
  - Retourne: `{ message }`
- **401**: Non authentifié
- **403**: Pas les droits (Manager/SuperAdmin requis)
- **500**: Erreur lors de la récupération
  - Retourne: `{ message, error, errorDetails, duffelErrors, duffelMeta }`

### POST `/api/flights/cancel/check`
- **200**: Conditions d'annulation vérifiées
  - Retourne: Quote d'annulation Duffel avec refund_amount, refund_currency, expires_at, etc.
- **400**: Champs manquants
  - Retourne: `{ message }`
- **401**: Non authentifié
- **403**: Pas les droits (Manager/SuperAdmin requis)
- **422**: Erreur Duffel (commande déjà annulée, etc.)
  - Retourne: `{ errors, meta }` avec détails de l'erreur Duffel
- **500**: Erreur lors de la vérification
  - Retourne: `{ errors, meta }`

### POST `/api/flights/cancel/confirm`
- **200**: Annulation confirmée
  - Retourne: Confirmation d'annulation Duffel avec refund_amount, refund_currency, confirmed_at, etc.
  - Met à jour: ReservationBillet.statut = ANNULEE, rembourse budget personnel, crée AuditBudget
- **400**: Champs manquants
  - Retourne: `{ message }`
- **401**: Non authentifié
- **403**: Pas les droits (Manager/SuperAdmin requis)
- **404**: Réservation de billet, utilisateur ou budget non trouvé
  - Retourne: `{ message }`
- **409**: Cette réservation est déjà annulée
  - Retourne: `{ message }`
- **422**: Erreur Duffel (commande déjà annulée, etc.)
  - Retourne: `{ errors, meta }` avec détails de l'erreur Duffel
- **500**: Erreur lors de l'annulation
  - Retourne: `{ errors, meta }`

---

## Politique (`/api/politique`)

### GET `/api/politique/:matricule`
- **200**: Politique de l'employé
  - Retourne: `{ politique }`
- **401**: Non authentifié
- **403**: Pas les droits
- **404**: Politique non trouvée
- **500**: Erreur serveur

### GET `/api/politique`
- **200**: Toutes les politiques
  - Retourne: `{ total, politiques }`
- **401**: Non authentifié
- **403**: Pas les droits (Manager/SuperAdmin requis)
- **500**: Erreur serveur

### POST `/api/politique`
- **201**: Politique créée
  - Retourne: `{ message, politique }`
- **400**: Matricule manquant
  - Code: `MISSING_FIELDS`
- **401**: Non authentifié
- **403**: Pas les droits
- **404**: Employé non trouvé
- **409**: Politique existe déjà
  - Code: `POLITIQUE_EXISTS`
- **500**: Erreur serveur

### PUT `/api/politique/:matricule`
- **200**: Politique mise à jour
  - Retourne: `{ message, politique }`
- **401**: Non authentifié
- **403**: Pas les droits
- **404**: Politique non trouvée
- **500**: Erreur serveur

### DELETE `/api/politique/:matricule`
- **200**: Politique supprimée
  - Retourne: `{ message }`
- **401**: Non authentifié
- **403**: Pas les droits
- **404**: Politique non trouvée
- **500**: Erreur serveur

---

## Reference Data (`/api/reference-data`)

### POST `/api/reference-data/flights/search`
- **200**: Résultats de recherche Duffel
  - Retourne: Offres de vols
- **401**: Non authentifié
- **403**: Pas les droits (Manager/SuperAdmin requis)
- **500**: Erreur serveur

---

## Réservation (`/api/reservation`)

### GET `/api/reservation/entreprise`
- **200**: Réservations de l'entreprise
  - Retourne: `{ billets: { total, data }, hotels: { total, data } }`
- **401**: Non authentifié
- **403**: Pas les droits (Manager/SuperAdmin requis)
- **500**: Erreur serveur

### GET `/api/reservation/mes-reservations`
- **200**: Mes réservations
  - Retourne: `{ billets: { total, data }, hotels: { total, data } }`
- **401**: Non authentifié
- **403**: Pas les droits
- **500**: Erreur serveur

### GET `/api/reservation/billets/:id`
- **200**: Détails de la réservation de billet
  - Retourne: `{ reservation }`
- **401**: Non authentifié
- **403**: Pas les droits
- **404**: Réservation non trouvée
- **500**: Erreur serveur

### GET `/api/reservation/hotels/:id`
- **200**: Détails de la réservation d'hôtel
  - Retourne: `{ reservation }`
- **401**: Non authentifié
- **403**: Pas les droits
- **404**: Réservation non trouvée
- **500**: Erreur serveur

---

## Codes d'Erreur Personnalisés

| Code | Description | Endpoints concernés |
|------|-------------|-------------------|
| `MISSING_FIELDS` | Champs requis manquants | Tous les endpoints POST/PUT |
| `MISSING_CREDENTIALS` | Email/mot de passe manquants | Authentification |
| `INVALID_CREDENTIALS` | Identifiants incorrects | Authentification |
| `ACCOUNT_BLOCKED` | Compte utilisateur bloqué | Authentification |
| `CONFIG_MISSING` | Configuration serveur manquante | Authentification |
| `BUDGET_CLOTURE` | Budget clôturé (modification impossible) | Budget |
| `BUDGET_ALREADY_ACTIVE` | Budget déjà activé | Budget |
| `BUDGET_NOT_ACTIVE` | Budget non activé | Budget |
| `BUDGET_ALREADY_CLOSED` | Budget déjà clôturé | Budget |
| `BUDGET_HAS_CHILDREN` | Budget a des allocations | Budget |
| `BUDGET_BLOQUE` | Budget bloqué | Budget |
| `CLASSE_NON_AUTORISEE` | Classe de vol non autorisée | Demande de voyage |
| `STATUT_INVALIDE` | Statut invalide pour l'action | Demande de voyage |
| `DEPARTEMENT_EXISTS` | Département existe déjà | Département |
| `DEPARTEMENT_NOT_FOUND` | Département non trouvé | Employé |
| `DEPARTEMENT_HAS_USERS` | Département a des employés | Département |
| `ENTREPRISE_INACTIVE` | Entreprise désactivée | Employé |
| `EMAIL_EXISTS` | Email existe déjà | Employé |
| `POLITIQUE_EXISTS` | Politique existe déjà | Politique |
| `INVALID_HOTEL` | Catégorie d'hôtel invalide | Demande de voyage |
| `MISSING_RETURN_DATE` | Date de retour manquante | Demande de voyage |
| `MISSING_TOKEN_FIELDS` | Champs token manquants | Demande de voyage |
| `MISSING_QUERY_PARAM` | Paramètre query manquant | Recherche |

---

## Notes Importantes

1. **Rate Limiting**: Toutes les routes sont limitées à 100 requêtes par IP sur 15 minutes (code 429)
2. **Authentification**: La plupart des endpoints nécessitent un token JWT valide dans le header `Authorization`
3. **Autorisation**: Les rôles Manager et SuperAdmin ont des droits différents sur certaines ressources
4. **Gestion d'erreurs**: Toutes les erreurs retournent un format JSON avec `message` et `code` (si applicable)
5. **Validation**: Les données sont validées avant traitement, retournant 400 si invalides
