import pg from 'pg';
const { Pool } = pg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

const poolConfig = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Force IPv4 to avoid ENETUNREACH errors on platforms like Render
  family: 4,
} : null;

export const pool = poolConfig ? new Pool(poolConfig) : null as any;
export const db = poolConfig ? drizzle({ client: pool, schema }) : null as any;
