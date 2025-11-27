#!/usr/bin/env tsx
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import XLSX from 'xlsx'
import bcrypt from 'bcryptjs'
import { customAlphabet } from 'nanoid'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { ownerDb } from '../src/owner/db/config'
import { tenants } from '../src/owner/db/schemas/ownerSchema'
import * as schema from '../src/db/schema'
const { users, pets, practices } = schema
import { eq } from 'drizzle-orm'

function arg(name: string, fallback?: string) {
  const v = process.argv.find((a) => a.startsWith(`--${name}=`))
  if (v) return v.split('=')[1]
  return fallback
}

function normalizeHeaders(row: any): Record<string, any> {
  const out: Record<string, any> = {}
  Object.keys(row).forEach((k) => {
    const nk = k.toLowerCase().trim().replace(/\s+/g, '_')
    out[nk] = row[k]
  })
  return out
}

function findEmailKey(keys: string[]): string | null {
  const k = keys.find((x) => x.includes('email'))
  return k || null
}

function findNameKey(keys: string[]): string | null {
  return (
    keys.find((x) => x === 'name') ||
    keys.find((x) => x.includes('full') && x.includes('name')) ||
    keys.find((x) => x.includes('client') && x.includes('name')) ||
    keys.find((x) => x.includes('owner') && x.includes('name')) ||
    keys.find((x) => x.includes('guardian') && x.includes('name')) ||
    keys.find((x) => x.includes('primary') && x.includes('name')) ||
    null
  )
}

function findOwnerEmailKey(keys: string[]): string | null {
  return (
    keys.find((x) => x.includes('owner') && x.includes('email')) ||
    keys.find((x) => x.includes('client') && x.includes('email')) ||
    keys.find((x) => x.includes('guardian') && x.includes('email')) ||
    keys.find((x) => x.includes('primary') && x.includes('email')) ||
    keys.find((x) => x.includes('contact') && x.includes('email')) ||
    keys.find((x) => x.includes('email')) ||
    null
  )
}

function findOwnerNameKey(keys: string[]): string | null {
  return (
    keys.find((x) => x.includes('owner') && x.includes('name')) ||
    keys.find((x) => x.includes('client') && x.includes('name')) ||
    keys.find((x) => x.includes('guardian') && x.includes('name')) ||
    null
  )
}

function findPetNameKey(keys: string[]): string | null {
  return (
    keys.find((x) => x.includes('pet') && x.includes('name')) ||
    keys.find((x) => x.includes('animal') && x.includes('name')) ||
    keys.find((x) => x.includes('patient') && x.includes('name')) ||
    keys.find((x) => x === 'name') ||
    null
  )
}

function findSpeciesKey(keys: string[]): string | null {
  return (
    keys.find((x) => x.includes('species')) ||
    keys.find((x) => x.includes('animal') && x.includes('type')) ||
    keys.find((x) => x.includes('type')) ||
    null
  )
}

function findBreedKey(keys: string[]): string | null {
  return (
    keys.find((x) => x.includes('breed')) ||
    keys.find((x) => x.includes('animal') && x.includes('breed')) ||
    null
  )
}

function readCsv(filePath: string): any[] {
  const buf = fs.readFileSync(filePath)
  const wb = XLSX.read(buf, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[]
  return json.map(normalizeHeaders)
}

async function main() {
  const args = process.argv.slice(2)
  const positionalTenantSlug = args.find(a => !a.startsWith('--'))
  const practiceIdArg = arg('practiceId') || args.find(a => a.startsWith('--practiceId='))?.split('=')[1]
  const clientsPath = arg('clients', '/Users/Hubolux/Downloads/InnovaV2clients.csv')
  const petsPath = arg('pets', '/Users/Hubolux/Downloads/InnovaV2patients.csv')
  const updateExisting = args.includes('--updateExisting') || args.includes('--update-existing') || arg('updateExisting') === 'true' || arg('update-existing') === 'true'

  let dbPool: Pool | null = null
  let db: any = null
  let tenantIdForLog = ''

  if (positionalTenantSlug) {
    const tenant = await ownerDb.select().from(tenants).where(eq(tenants.subdomain, positionalTenantSlug)).limit(1)
    if (tenant.length === 0) {
      console.error(`Tenant not found: ${positionalTenantSlug}`)
      process.exit(1)
    }
    const t = tenant[0] as any
    const encPass = encodeURIComponent(t.dbPassword || '')
    const url = `postgresql://${t.dbUser || 'postgres'}:${encPass}@${t.dbHost}:${t.dbPort}/${t.dbName}?sslmode=require`
    dbPool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } })
    db = drizzle(dbPool, { schema })
    tenantIdForLog = t.subdomain
  } else {
    const tenantId = arg('tenantId')
    const databaseName = arg('databaseName')
    if (!tenantId || !databaseName) {
      console.error('Missing required args: <tenant-slug> or --tenantId and --databaseName')
      process.exit(1)
    }
    const dbHost = process.env.DB_HOST
    const dbPort = process.env.DB_PORT || '5432'
    const dbUser = process.env.DB_USER
    const dbPassword = process.env.DB_PASSWORD
    const dbSslMode = process.env.DB_SSL_MODE || 'require'
    if (!dbHost || !dbUser || !dbPassword) {
      console.error('DB_HOST, DB_USER, DB_PASSWORD must be set')
      process.exit(1)
    }
    const conn = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${databaseName}?sslmode=${dbSslMode}`
    dbPool = new Pool({ connectionString: conn, ssl: { rejectUnauthorized: false } })
    db = drizzle(dbPool, { schema })
    tenantIdForLog = tenantId
  }

  if (!practiceIdArg) {
    console.error('Missing required arg: --practiceId')
    process.exit(1)
  }
  const practiceId = Number(practiceIdArg)
  if (!Number.isFinite(practiceId)) {
    console.error('Invalid practiceId')
    process.exit(1)
  }

  if (!clientsPath || !fs.existsSync(clientsPath)) {
    console.error(`Clients CSV not found: ${clientsPath}`)
    process.exit(1)
  }
  if (!petsPath || !fs.existsSync(petsPath)) {
    console.error(`Pets CSV not found: ${petsPath}`)
    process.exit(1)
  }

  const practiceRow = await db.select().from(practices).where(eq(practices.id, practiceId)).limit(1)
  if (practiceRow.length === 0) {
    console.error(`Practice not found: ${practiceId}`)
    if (dbPool) await dbPool.end()
    process.exit(1)
  }

  console.log(`Reading clients CSV: ${clientsPath}`)
  const clientRows = readCsv(clientsPath!)
  console.log(`Reading pets CSV: ${petsPath}`)
  const petRows = readCsv(petsPath!)

  const clientKeys = clientRows[0] ? Object.keys(clientRows[0]) : []
  const petKeys = petRows[0] ? Object.keys(petRows[0]) : []

  const clientEmailKey = findEmailKey(clientKeys)
  const clientNameKey = findNameKey(clientKeys)
  const clientPhoneKey = clientKeys.find((k) => k.includes('phone')) || null
  const clientAddressKey = clientKeys.find((k) => k === 'address') || null
  const clientCityKey = clientKeys.find((k) => k === 'city') || null
  const clientStateKey = clientKeys.find((k) => k === 'state') || null
  const clientZipKey = clientKeys.find((k) => k.includes('zip')) || null
  const clientIdKey = clientKeys.includes('id') ? 'id' : null

  const petNameKey = findPetNameKey(petKeys)
  const petSpeciesKey = findSpeciesKey(petKeys)
  const petBreedKey = findBreedKey(petKeys)
  const petOwnerEmailKey = findOwnerEmailKey(petKeys)
  const petOwnerNameKey = findOwnerNameKey(petKeys)
  const petClientIdKey = petKeys.includes('client_id') ? 'client_id' : null

  console.log(JSON.stringify({
    stage: 'mapping_keys',
    tenant: tenantIdForLog,
    practiceId,
    clientKeys,
    petKeys,
    mapping: {
      clientEmailKey,
      clientNameKey,
      clientPhoneKey,
      clientAddressKey,
      clientCityKey,
      clientStateKey,
      clientZipKey,
      petNameKey,
      petSpeciesKey,
      petBreedKey,
      petOwnerEmailKey,
      petOwnerNameKey,
      clientIdKey,
      petClientIdKey
    }
  }))

  const clientEmailToId = new Map<string, number>()
  const clientNameToId = new Map<string, number>()
  const oldClientIdToNewId = new Map<string, number>()

  const rand = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6)

  async function ensureUniqueUsername(base: string): Promise<string> {
    let candidate = base.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, candidate as any)).limit(1)
    if (existing.length === 0) return candidate
    candidate = `${candidate}_${rand()}`
    return candidate
  }

  const defaultPasswordHash = await bcrypt.hash('password', 12)

  let createdClients = 0
  let missingClientEmails = 0
  let skippedExistingClients = 0
  let updatedExistingClients = 0
  const existingClientEmails: string[] = []
  console.log(`Processing clients: ${clientRows.length}`)
  for (let i = 0; i < clientRows.length; i++) {
    const r = clientRows[i]
    const email = clientEmailKey ? (r[clientEmailKey] || '').toString().trim().toLowerCase() : ''
    const name = clientNameKey ? (r[clientNameKey] || '').toString().trim() : ''
    const phone = clientPhoneKey ? (r[clientPhoneKey] || '').toString().trim() : ''
    const address = clientAddressKey ? (r[clientAddressKey] || '').toString().trim() : ''
    const city = clientCityKey ? (r[clientCityKey] || '').toString().trim() : ''
    const state = clientStateKey ? (r[clientStateKey] || '').toString().trim() : ''
    const zip = clientZipKey ? (r[clientZipKey] || '').toString().trim() : ''
    if (!email) { missingClientEmails++; continue }

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (existing.length > 0) {
      const existingId = existing[0].id as number
      clientEmailToId.set(email, existingId)
      if (name) clientNameToId.set(name.toLowerCase(), existingId)
      if (clientIdKey) {
        const oldId = (r[clientIdKey] || '').toString().trim()
        if (oldId) oldClientIdToNewId.set(oldId, existingId)
      }
      if (updateExisting) {
        const updates: any = {}
        if (name) updates.name = name
        if (phone) updates.phone = phone
        if (address) updates.address = address
        if (city) updates.city = city
        if (state) updates.state = state
        if (zip) updates.zipCode = zip
        if (Object.keys(updates).length > 0) {
          try {
            await db.update(users).set(updates).where(eq(users.id, existingId))
            updatedExistingClients++
            console.log(JSON.stringify({ stage: 'client_existing', index: i, email, updated: true }))
          } catch (e: any) {
            console.log(JSON.stringify({ stage: 'client_existing_update_error', index: i, email, error: e?.message }))
          }
        } else {
          skippedExistingClients++
          console.log(JSON.stringify({ stage: 'client_existing', index: i, email, updated: false }))
        }
      } else {
        skippedExistingClients++
        existingClientEmails.push(email)
      }
      continue
    }

    const usernameBase = email
    const username = await ensureUniqueUsername(usernameBase)
    const password = defaultPasswordHash

    try {
      const inserted = await db.insert(users).values({
        email,
        username,
        name: name || usernameBase,
        password,
        role: 'CLIENT' as any,
        practiceId,
        phone: phone || undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        zipCode: zip || undefined,
      }).returning()
      const id = inserted[0].id as number
      clientEmailToId.set(email, id)
      if (name) clientNameToId.set(name.toLowerCase(), id)
      if (clientIdKey) {
        const oldId = (r[clientIdKey] || '').toString().trim()
        if (oldId) oldClientIdToNewId.set(oldId, id)
      }
      createdClients++
    } catch (e: any) {
      console.log(JSON.stringify({ stage: 'client_insert_error', index: i, email, error: e?.message }))
    }
    if ((i + 1) % 25 === 0) console.log(JSON.stringify({ stage: 'client_progress', processed: i + 1, createdClients }))
  }

  let createdPets = 0
  let petsMissingOwner = 0
  console.log(`Processing pets: ${petRows.length}`)
  for (let i = 0; i < petRows.length; i++) {
    const r = petRows[i]
    const name = petNameKey ? (r[petNameKey] || '').toString().trim() : ''
    if (!name) continue
    const species = petSpeciesKey ? (r[petSpeciesKey] || '').toString().trim() : ''
    const breed = petBreedKey ? (r[petBreedKey] || '').toString().trim() : ''
    const emailKeyVal = petOwnerEmailKey ? (r[petOwnerEmailKey] || '').toString().trim().toLowerCase() : ''
    const ownerNameVal = petOwnerNameKey ? (r[petOwnerNameKey] || '').toString().trim().toLowerCase() : ''

    let ownerId: number | null = null
    if (emailKeyVal && clientEmailToId.has(emailKeyVal)) ownerId = clientEmailToId.get(emailKeyVal) as number
    if (!ownerId && ownerNameVal && clientNameToId.has(ownerNameVal)) ownerId = clientNameToId.get(ownerNameVal) as number
    if (!ownerId && petClientIdKey) {
      const oldId = (r[petClientIdKey] || '').toString().trim()
      if (oldId && oldClientIdToNewId.has(oldId)) ownerId = oldClientIdToNewId.get(oldId) as number
    }
    if (!ownerId) { petsMissingOwner++; continue }

    try {
      const inserted = await db.insert(pets).values({
        name,
        species: species || undefined,
        breed: breed || undefined,
        ownerId,
        practiceId,
      }).returning()
      if (inserted.length > 0) createdPets++
    } catch (e: any) {
      console.log(JSON.stringify({ stage: 'pet_insert_error', index: i, name, ownerId, error: e?.message }))
    }
    if ((i + 1) % 25 === 0) console.log(JSON.stringify({ stage: 'pet_progress', processed: i + 1, createdPets }))
  }

  console.log(JSON.stringify({ tenant: tenantIdForLog, practiceId, createdClients, createdPets, totalClientRows: clientRows.length, totalPetRows: petRows.length, missingClientEmails, petsMissingOwner, skippedExistingClients, updatedExistingClients, existingClientEmailsSample: existingClientEmails.slice(0, 10) }))
  if (dbPool) await dbPool.end()
}

main().catch(async (e) => {
  console.error(e)
  process.exitCode = 1
})