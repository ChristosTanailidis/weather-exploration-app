/**
 * Builds public/cities.json from the GeoNames `cities15000` dump.
 *
 *   npm run build:cities
 *
 * Output rows: [id, name, countryCode, admin1, lat, lon, population],
 * the most populous cities first. Uses Node built-ins only (fetch, zlib).
 * Data: GeoNames (https://www.geonames.org), CC BY 4.0.
 */
import { writeFile } from 'node:fs/promises'
import { inflateRawSync } from 'node:zlib'

const CITIES_URL = 'https://download.geonames.org/export/dump/cities15000.zip'
const ADMIN1_URL = 'https://download.geonames.org/export/dump/admin1CodesASCII.txt'
const OUTPUT = new URL('../public/cities.json', import.meta.url)
const MAX_CITIES = 5_000
const COORD_DECIMALS = 2

/** Sections, historical, abandoned and destroyed places add clutter. */
const EXCLUDED_FEATURE_CODES = new Set(['PPLX', 'PPLH', 'PPLQ', 'PPLW', 'PPLCH'])

// GeoNames dump columns
const COL = {
  id: 0,
  name: 1,
  lat: 4,
  lon: 5,
  featureCode: 7,
  countryCode: 8,
  admin1: 10,
  population: 14,
} as const

type CityRow = [id: number, name: string, countryCode: string, admin1: string, lat: number, lon: number, population: number]

async function download(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`GET ${url} failed with HTTP ${response.status}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

/** Extracts one file from a ZIP archive (stored or deflated entries). */
function unzipEntry(zip: Buffer, fileName: string): Buffer {
  const EOCD_SIGNATURE = 0x06054b50
  const CENTRAL_SIGNATURE = 0x02014b50
  const LOCAL_SIGNATURE = 0x04034b50
  const EOCD_MIN_SIZE = 22
  const LOCAL_HEADER_SIZE = 30
  const CENTRAL_HEADER_SIZE = 46
  const METHOD_STORED = 0
  const METHOD_DEFLATE = 8

  let eocd = zip.length - EOCD_MIN_SIZE
  while (eocd >= 0 && zip.readUInt32LE(eocd) !== EOCD_SIGNATURE) {
    eocd--
  }
  if (eocd < 0) {
    throw new Error('Not a ZIP archive')
  }
  const entryCount = zip.readUInt16LE(eocd + 10)
  let offset = zip.readUInt32LE(eocd + 16)

  for (let i = 0; i < entryCount; i++) {
    if (zip.readUInt32LE(offset) !== CENTRAL_SIGNATURE) {
      throw new Error('Corrupt ZIP central directory')
    }
    const method = zip.readUInt16LE(offset + 10)
    const compressedSize = zip.readUInt32LE(offset + 20)
    const nameLength = zip.readUInt16LE(offset + 28)
    const extraLength = zip.readUInt16LE(offset + 30)
    const commentLength = zip.readUInt16LE(offset + 32)
    const localOffset = zip.readUInt32LE(offset + 42)
    const name = zip.toString('utf8', offset + CENTRAL_HEADER_SIZE, offset + CENTRAL_HEADER_SIZE + nameLength)

    if (name === fileName) {
      if (zip.readUInt32LE(localOffset) !== LOCAL_SIGNATURE) {
        throw new Error('Corrupt ZIP local header')
      }
      const dataStart = localOffset + LOCAL_HEADER_SIZE
        + zip.readUInt16LE(localOffset + 26) + zip.readUInt16LE(localOffset + 28)
      const data = zip.subarray(dataStart, dataStart + compressedSize)
      if (method === METHOD_STORED) {
        return data
      }
      if (method === METHOD_DEFLATE) {
        return inflateRawSync(data)
      }
      throw new Error(`Unsupported ZIP compression method ${method}`)
    }
    offset += CENTRAL_HEADER_SIZE + nameLength + extraLength + commentLength
  }
  throw new Error(`${fileName} not found in archive`)
}

/** Maps `CC.code` to the ASCII admin1 name. */
function parseAdmin1(text: string): Map<string, string> {
  const names = new Map<string, string>()
  for (const line of text.split('\n')) {
    const [code, , asciiName] = line.split('\t')
    if (code && asciiName) {
      names.set(code, asciiName)
    }
  }
  return names
}

function round(value: number): number {
  const factor = 10 ** COORD_DECIMALS
  return Math.round(value * factor) / factor
}

function parseCities(text: string, admin1Names: Map<string, string>): CityRow[] {
  const rows: CityRow[] = []
  for (const line of text.split('\n')) {
    const cols = line.split('\t')
    const featureCode = cols[COL.featureCode] ?? ''
    if (cols.length < COL.population + 1 || EXCLUDED_FEATURE_CODES.has(featureCode)) {
      continue
    }
    const countryCode = cols[COL.countryCode] ?? ''
    const admin1Code = cols[COL.admin1] ?? ''
    rows.push([
      Number(cols[COL.id]),
      cols[COL.name] ?? '',
      countryCode,
      admin1Names.get(`${countryCode}.${admin1Code}`) ?? '',
      round(Number(cols[COL.lat])),
      round(Number(cols[COL.lon])),
      Number(cols[COL.population]),
    ])
  }
  return rows.filter(([id, name, , , lat, lon, population]) =>
    Number.isFinite(id) && name !== '' && Number.isFinite(lat) && Number.isFinite(lon) && population > 0)
}

async function main(): Promise<void> {
  console.log('Downloading GeoNames data…')
  const [zip, admin1] = await Promise.all([download(CITIES_URL), download(ADMIN1_URL)])
  const text = unzipEntry(zip, 'cities15000.txt').toString('utf8')

  const rows = parseCities(text, parseAdmin1(admin1.toString('utf8')))
    .sort((a, b) => b[6] - a[6] || a[0] - b[0])
    .slice(0, MAX_CITIES)

  const json = `[\n${rows.map(row => JSON.stringify(row)).join(',\n')}\n]\n`
  await writeFile(OUTPUT, json)
  console.log(`Wrote ${rows.length} cities (${(Buffer.byteLength(json) / 1024).toFixed(0)} KB) to public/cities.json`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
