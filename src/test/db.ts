import pg from 'pg'

/**
 * Cliente de prueba para la base de datos local de Supabase.
 * Usa el pooler directo (puerto 55322) para evitar dependencias de Supabase JS.
 *
 * IMPORTANTE: Requiere que el Supabase local esté corriendo.
 */
const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:55322/postgres'

let pool: pg.Pool | null = null

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5 })
  }
  return pool
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const pool = getPool()
  const result = await pool.query<T>(
    text,
    params as (string | number | boolean | null)[]
  )
  return result
}

/**
 * Ejecuta un RPC de Postgres y retorna el resultado.
 */
export async function rpc<T extends pg.QueryResultRow = pg.QueryResultRow>(
  functionName: string,
  params: Record<string, unknown>
): Promise<pg.QueryResult<T>> {
  const keys = Object.keys(params)
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
  const values = keys.map((k) => params[k])
  const text = `select * from public.${functionName}(${placeholders})`
  return query<T>(text, values)
}

/**
 * Limpia y re-inserta datos de prueba en una transacción.
 * Retorna una función para hacer rollback al final del test.
 */
export async function withTransaction(
  fn: (client: pg.PoolClient) => Promise<void>
): Promise<void> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await fn(client)
    await client.query('ROLLBACK')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Verifica que el pool de BD esté accesible.
 * Útil para skip condicional si Supabase local no está corriendo.
 */
export async function isDbAvailable(): Promise<boolean> {
  try {
    await query('select 1')
    return true
  } catch {
    return false
  }
}

/**
 * Cierra el pool al final de todos los tests.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
