import prisma from './prismaClient'

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const CODE_LENGTH = 6
const REF_LENGTH = 8

function generateRawCode(length = CODE_LENGTH): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * CHARSET.length)
    code += CHARSET[index]
  }
  return code
}

export async function generateIdentifiantEntreprise(): Promise<string> {
  let code: string
  let exists: boolean
  do {
    code = generateRawCode()
    const found = await prisma.entreprise.findUnique({ where: { identifiant: code } })
    exists = found !== null
  } while (exists)
  return code
}

export async function generateMatriculeUser(excludeSet: Set<string> = new Set()): Promise<string> {
  let code: string
  let existsInDb: boolean
  do {
    code = generateRawCode()
    const found = await prisma.user.findFirst({ where: { matricule: code } })
    existsInDb = found !== null
  } while (existsInDb || excludeSet.has(code))
  return code
}

export async function generateReferenceBudget(): Promise<string> {
  let code: string
  let exists: boolean
  do {
    code = generateRawCode(REF_LENGTH)
    const found = await prisma.budgetAnnuel.findUnique({ where: { reference: code } })
    exists = found !== null
  } while (exists)
  return code
}