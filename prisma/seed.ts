import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import 'dotenv/config'

const connectionString = process.env['DATA_BASE_URL']

if (!connectionString) {
  throw new Error('DATA_BASE_URL manquante dans le fichier .env')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Début du seeding...')

  // Récupérer les entreprises existantes
  const entreprises = await prisma.entreprise.findMany({
    where: { is_active: true },
  })

  if (entreprises.length === 0) {
    console.log('❌ Aucune entreprise trouvée. Veuillez d\'abord créer des entreprises.')
    return
  }

  console.log(`📋 ${entreprises.length} entreprises trouvées`)

  // Pour chaque entreprise, créer des données fictives
  for (const entreprise of entreprises) {
    console.log(`\n🏢 Traitement de l'entreprise: ${entreprise.nom} (${entreprise.identifiant})`)

    // Créer des départements
    const departements = ['Ressources Humaines', 'Finance', 'Marketing', 'IT', 'Ventes']
    const createdDepartements = []

    for (const nom of departements) {
      const existingDept = await prisma.departement.findFirst({
        where: { nom, entrepriseId: entreprise.id },
      })

      let dept
      if (existingDept) {
        dept = existingDept
      } else {
        dept = await prisma.departement.create({
          data: {
            nom,
            entrepriseId: entreprise.id,
          },
        })
      }
      createdDepartements.push(dept)
      console.log(`  ✅ Département créé: ${nom}`)
    }

    // Créer des employés
    const roles = ['EMPLOYE', 'EMPLOYE', 'EMPLOYE', 'MANAGER', 'CONSULTANT']
    const civilites = ['M.', 'Mme', 'Dr']
    const genres = ['M', 'F']
    const postes = ['Développeur', 'Comptable', 'RH', 'Chef de projet', 'Commercial']

    for (let i = 0; i < 15; i++) {
      const dept = createdDepartements[i % createdDepartements.length]
      const role = roles[i % roles.length]
      const matricule = `${entreprise.identifiant.substring(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`

      await prisma.user.upsert({
        where: { matricule },
        update: {},
        create: {
          matricule,
          prenom: ['Jean', 'Marie', 'Pierre', 'Sophie', 'Luc', 'Emma', 'Thomas', 'Camille', 'Nicolas', 'Julie'][i % 10],
          nom: ['Dupont', 'Martin', 'Bernard', 'Petit', 'Robert', 'Richard', 'Durand', 'Leroy', 'Moreau', 'Simon'][i % 10],
          email: `employe${i}@${entreprise.nom.toLowerCase().replace(/\s/g, '')}.com`,
          mot_de_passe: 'password123',
          role,
          poste: postes[i % postes.length],
          telephone: `77 ${String(Math.random()).substring(2, 4)} ${String(Math.random()).substring(2, 6)} ${String(Math.random()).substring(2, 6)}`,
          entrepriseId: entreprise.id,
          departementId: dept.id,
          civilite: civilites[i % civilites.length],
          genre: genres[i % genres.length],
          numero_passport: Math.random().toString(36).substring(2, 10).toUpperCase(),
          date_expiration_passport: new Date(2030, Math.random() * 11, Math.random() * 28 + 1),
          is_block: false,
        },
      })
    }
    console.log(`  ✅ 15 employés créés`)

    // Créer un budget annuel pour 2026
    const reference = `BUD-${entreprise.identifiant}-2026`
    const existingBudget = await prisma.budgetAnnuel.findFirst({
      where: { reference },
    })

    let budgetAnnuel
    if (existingBudget) {
      budgetAnnuel = existingBudget
    } else {
      budgetAnnuel = await prisma.budgetAnnuel.create({
        data: {
          reference,
          identifiant_entreprise: entreprise.identifiant,
          annee: 2026,
          date_debut: new Date(2026, 0, 1),
          date_fin: new Date(2026, 11, 31),
          budget: 50000000,
          montant_restant: 50000000,
          est_active: true,
        },
      })
    }
    console.log(`  ✅ Budget annuel 2026 créé`)

    // Créer des budgets départementaux
    for (const dept of createdDepartements) {
      const montantAlloue = Math.floor(Math.random() * 10000000) + 5000000
      const existingBudgetDept = await prisma.budgetDepartement.findFirst({
        where: {
          reference: budgetAnnuel.reference,
          departementId: dept.id,
        },
      })

      if (!existingBudgetDept) {
        await prisma.budgetDepartement.create({
          data: {
            reference: budgetAnnuel.reference,
            departementId: dept.id,
            montant_alloue: montantAlloue,
            montant_utilise: Math.floor(montantAlloue * 0.3),
            montant_restant: Math.floor(montantAlloue * 0.7),
            bloquer: false,
          },
        })
      }
    }
    console.log(`  ✅ Budgets départementaux créés`)

    // Créer des budgets personnels
    const users = await prisma.user.findMany({
      where: { entrepriseId: entreprise.id, role: { in: ['EMPLOYE', 'MANAGER'] } },
      take: 10,
    })

    for (const user of users) {
      const montantAlloue = Math.floor(Math.random() * 2000000) + 500000
      const existingBudgetPerso = await prisma.budgetPersonnel.findFirst({
        where: {
          reference: budgetAnnuel.reference,
          matricule: user.matricule,
        },
      })

      if (!existingBudgetPerso) {
        await prisma.budgetPersonnel.create({
          data: {
            reference: budgetAnnuel.reference,
            matricule: user.matricule,
            montant_alloue: montantAlloue,
            montant_utilise: Math.floor(montantAlloue * 0.4),
            montant_restant: Math.floor(montantAlloue * 0.6),
            bloquer: false,
          },
        })
      }
    }
    console.log(`  ✅ Budgets personnels créés`)

    // Créer des demandes de voyage
    const statuts = ['EN_ATTENTE', 'APPROUVEE', 'REJETEE', 'EN_COURS']
    const villes = ['Paris', 'Londres', 'New York', 'Dakar', 'Abidjan', 'Bruxelles', 'Genève']
    const motifs = ['Réunion client', 'Formation', 'Conférence', 'Mission', 'Audit']

    for (let i = 0; i < 20; i++) {
      const user = users[i % users.length]
      const dateDepart = new Date(2026, Math.random() * 11, Math.random() * 28 + 1)
      const statut = statuts[i % statuts.length]

      const demande = await prisma.demandeVoyage.create({
        data: {
          matricule: user.matricule,
          identifiant_entreprise: entreprise.identifiant,
          depart: 'Dakar',
          arrive: villes[i % villes.length],
          allerRetour: Math.random() > 0.3,
          dateDepart,
          dateRetour: new Date(dateDepart.getTime() + (Math.random() * 7 + 3) * 24 * 60 * 60 * 1000),
          classe: ['Y', 'W', 'J'][Math.floor(Math.random() * 3)],
          hotel: ['NON_INCLUS', '1', '2', '3', '4'][Math.floor(Math.random() * 5)],
          ville: villes[i % villes.length],
          motif: motifs[i % motifs.length],
          statut,
          commentaire: statut === 'REJETEE' ? 'Budget insuffisant' : null,
        },
      })

      // Créer des réservations pour les demandes approuvées
      if (statut === 'APPROUVEE' && Math.random() > 0.5) {
        await prisma.reservationBillet.create({
          data: {
            demandeVoyageId: demande.id,
            matricule: user.matricule,
            numeroReservation: `RES-${Date.now()}${i}`,
            numeroOrder: `ord_${Math.random().toString(36).substring(2, 20)}`,
            compagnieAerienne: ['Air France', 'Brussels Airlines', 'Air Sénégal', 'Ethiopian Airlines'][Math.floor(Math.random() * 4)],
            numeroVolAller: `AF${Math.floor(Math.random() * 9000) + 1000}`,
            numeroVolRetour: demande.allerRetour ? `AF${Math.floor(Math.random() * 9000) + 1000}` : null,
            dateVolDepart: dateDepart,
            dateVolArrivee: new Date(dateDepart.getTime() + 6 * 60 * 60 * 1000),
            dateVolRetourDepart: demande.allerRetour ? new Date(demande.dateRetour!.getTime()) : null,
            dateVolRetourArrivee: demande.allerRetour ? new Date(demande.dateRetour!.getTime() + 6 * 60 * 60 * 1000) : null,
            aeroportDepart: 'DKR',
            aeroportArrivee: ['CDG', 'LHR', 'JFK', 'ABJ', 'BRU', 'GVA'][Math.floor(Math.random() * 6)],
            classe: demande.classe,
            prix: Math.floor(Math.random() * 500000) + 200000,
            devise: 'XOF',
            statut: 'EMISE',
            numeroBillet: `BIL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            dateEmission: new Date(),
          },
        })

        if (demande.hotel !== 'NON_INCLUS') {
          await prisma.reservationHotel.create({
            data: {
              demandeVoyageId: demande.id,
              nomHotel: ['Hilton', 'Marriott', 'Radisson', 'Novotel'][Math.floor(Math.random() * 4)],
              categorie: demande.hotel,
              adresse: 'Adresse fictive',
              ville: demande.ville,
              pays: 'France',
              dateArrivee: dateDepart,
              dateDepart: demande.dateRetour || new Date(dateDepart.getTime() + 3 * 24 * 60 * 60 * 1000),
              nombreNuits: 3,
              prixParNuit: Math.floor(Math.random() * 100000) + 30000,
              prixTotal: Math.floor(Math.random() * 300000) + 90000,
              devise: 'XOF',
              statut: 'CONFIRMEE',
              numeroConfirmation: `CONF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            },
          })
        }
      }
    }
    console.log(`  ✅ 20 demandes de voyage créées avec réservations`)
  }

  console.log('\n✅ Seeding terminé avec succès!')
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
