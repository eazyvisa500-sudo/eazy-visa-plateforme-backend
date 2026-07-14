# Backend Integration Prompt - Travel Reference Data API

## Contexte

Le frontend a été mis à jour pour utiliser des listes déroulantes avec autocomplete pour les demandes de voyage. Actuellement, les données sont stockées dans des fichiers JSON statiques côté frontend pour éviter les problèmes CORS.

## Objectif

Implémenter des endpoints API côté backend pour fournir les données de référence (aéroports IATA, pays, régions) afin que le frontend puisse les consommer dynamiquement.

## Fonctionnalités Frontend Actuelles

### 1. Sélection d'aéroports IATA
- **Champs** : Aéroport Départ, Aéroport Arrivée
- **Comportement** : Select avec autocomplete et recherche
- **Format d'affichage** : `IATA - Nom (Ville, Pays)`
- **Exemple** : `CDG - Paris Charles de Gaulle (Paris, France)`

### 2. Sélection de pays et régions
- **Champs** : Pays, État/Province, Région
- **Comportement** : Cascading selects
  - Sélection du pays → charge les régions disponibles
  - La région est désactivée tant qu'aucun pays n'est sélectionné
  - L'état/province reste un champ libre (input text)

## Endpoints API à Implémenter

### 1. GET `/api/reference/airports`

Récupérer la liste de tous les aéroports avec codes IATA.

**Réponse attendue :**
```json
{
  "success": true,
  "data": [
    {
      "id": "arp_dkryr",
      "iata_code": "DKR",
      "icao_code": "GOOY",
      "name": "Dakar Blaise Diagne International Airport",
      "city_name": "Dakar",
      "country_name": "Senegal",
      "latitude": 14.6716,
      "longitude": -17.0729
    },
    {
      "id": "arp_cdg",
      "iata_code": "CDG",
      "icao_code": "LFPG",
      "name": "Paris Charles de Gaulle",
      "city_name": "Paris",
      "country_name": "France",
      "latitude": 49.0097,
      "longitude": 2.5479
    }
  ]
}
```

**Filtrage optionnel :**
- `?search=CDG` - Recherche par code IATA ou nom
- `?country=France` - Filtrer par pays

### 2. GET `/api/reference/countries`

Récupérer la liste de tous les pays avec leurs régions.

**Réponse attendue :**
```json
{
  "success": true,
  "data": [
    {
      "name": "France",
      "code": "FR",
      "regions": ["Île-de-France", "Provence-Alpes-Côte d'Azur", "Auvergne-Rhône-Alpes", "Nouvelle-Aquitaine", "Occitanie", "Hauts-de-France", "Grand Est", "Pays de la Loire", "Bretagne", "Normandie", "Centre-Val de Loire", "Bourgogne-Franche-Comté", "Corse"]
    },
    {
      "name": "Sénégal",
      "code": "SN",
      "regions": ["Dakar", "Thiès", "Diourbel", "Fatick", "Kaolack", "Kaffrine", "Tambacounda", "Kédougou", "Kolda", "Sédhiou", "Ziguinchor", "Saint-Louis", "Matam", "Louga"]
    }
  ]
}
```

### 3. GET `/api/reference/countries/:code/regions`

Récupérer les régions d'un pays spécifique.

**Réponse attendue :**
```json
{
  "success": true,
  "data": {
    "country": "France",
    "code": "FR",
    "regions": ["Île-de-France", "Provence-Alpes-Côte d'Azur", "Auvergne-Rhône-Alpes", "Nouvelle-Aquitaine", "Occitanie", "Hauts-de-France", "Grand Est", "Pays de la Loire", "Bretagne", "Normandie", "Centre-Val de Loire", "Bourgogne-Franche-Comté", "Corse"]
  }
}
```

## Structure de Base de Données Suggérée

### Table `airports`
```sql
CREATE TABLE airports (
  id VARCHAR(50) PRIMARY KEY,
  iata_code VARCHAR(3) UNIQUE NOT NULL,
  icao_code VARCHAR(4),
  name VARCHAR(255) NOT NULL,
  city_name VARCHAR(100) NOT NULL,
  country_name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_airports_iata ON airports(iata_code);
CREATE INDEX idx_airports_country ON airports(country_name);
CREATE INDEX idx_airports_city ON airports(city_name);
```

### Table `countries`
```sql
CREATE TABLE countries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(2) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_countries_code ON countries(code);
```

### Table `regions`
```sql
CREATE TABLE regions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  country_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE
);

CREATE INDEX idx_regions_country ON regions(country_id);
```

## Script de Migration / Seed

Créer un script pour peupler les tables avec les données initiales :

```javascript
// seed-reference-data.js
const airports = require('./src/data/airports.json');
const countries = require('./src/data/countries.json');

// Insérer les pays et régions
countries.forEach(country => {
  const countryId = db.countries.insert({
    name: country.name,
    code: country.code
  });
  
  country.regions.forEach(region => {
    db.regions.insert({
      country_id: countryId,
      name: region
    });
  });
});

// Insérer les aéroports
airports.forEach(airport => {
  db.airports.insert({
    id: airport.id,
    iata_code: airport.iata_code,
    icao_code: airport.icao_code,
    name: airport.name,
    city_name: airport.city_name,
    country_name: airport.country_name,
    latitude: airport.latitude,
    longitude: airport.longitude
  });
});
```

## Contrôleurs Backend

### airportsController.js
```javascript
const Airports = require('../models/Airport');

exports.getAllAirports = async (req, res) => {
  try {
    const { search, country } = req.query;
    let query = Airports.query();
    
    if (search) {
      query = query.where('iata_code', 'like', `%${search}%`)
                  .orWhere('name', 'like', `%${search}%`)
                  .orWhere('city_name', 'like', `%${search}%`);
    }
    
    if (country) {
      query = query.where('country_name', country);
    }
    
    const airports = await query.orderBy('country_name', 'city_name');
    
    res.json({
      success: true,
      data: airports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching airports'
    });
  }
};
```

### countriesController.js
```javascript
const Countries = require('../models/Country');
const Regions = require('../models/Region');

exports.getAllCountries = async (req, res) => {
  try {
    const countries = await Countries.query().withGraphFetched('regions');
    
    res.json({
      success: true,
      data: countries.map(c => ({
        name: c.name,
        code: c.code,
        regions: c.regions.map(r => r.name)
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching countries'
    });
  }
};

exports.getCountryRegions = async (req, res) => {
  try {
    const { code } = req.params;
    const country = await Countries.query().findOne({ code }).withGraphFetched('regions');
    
    if (!country) {
      return res.status(404).json({
        success: false,
        message: 'Country not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        name: country.name,
        code: country.code,
        regions: country.regions.map(r => r.name)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching country regions'
    });
  }
};
```

## Routes

```javascript
// routes/reference.js
const express = require('express');
const router = express.Router();
const airportsController = require('../controllers/airportsController');
const countriesController = require('../controllers/countriesController');

// Airports
router.get('/airports', airportsController.getAllAirports);

// Countries
router.get('/countries', countriesController.getAllCountries);
router.get('/countries/:code/regions', countriesController.getCountryRegions);

module.exports = router;
```

## Intégration dans l'App

```javascript
// app.js
const referenceRoutes = require('./routes/reference');
app.use('/api/reference', referenceRoutes);
```

## Mise à jour du Frontend

Une fois les endpoints backend implémentés, mettre à jour les services frontend :

```typescript
// src/services/duffel.ts
export async function getAirports(): Promise<DuffelAirport[]> {
  const response = await fetch('/api/reference/airports');
  const data = await response.json();
  return data.data;
}

// src/services/countries.ts
export async function getCountries(): Promise<Country[]> {
  const response = await fetch('/api/reference/countries');
  const data = await response.json();
  return data.data;
}
```

## Données Initiales

Les fichiers JSON suivants sont disponibles côté frontend et peuvent être utilisés pour le seed de la base de données :
- `src/data/airports.json` - 25 aéroports internationaux
- `src/data/countries.json` - 30 pays avec leurs régions

## Priorités

1. **Haute priorité** : Endpoint `/api/reference/airports` (nécessaire pour les champs de départ/arrivée)
2. **Haute priorité** : Endpoint `/api/reference/countries` (nécessaire pour la sélection de pays)
3. **Moyenne priorité** : Endpoint `/api/reference/countries/:code/regions` (peut être remplacé par un endpoint unique avec toutes les données)

## Notes

- Les endpoints doivent être accessibles sans authentification (données de référence publiques)
- Ajouter des caches côté backend pour optimiser les performances
- Prévoir un mécanisme pour mettre à jour les données de référence périodiquement
- Les données actuelles sont un échantillon - prévoir d'ajouter plus d'aéroports et de pays selon les besoins
