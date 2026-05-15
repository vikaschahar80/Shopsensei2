import pg from 'pg';
const { Pool } = pg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

export const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null as any;
export const db = process.env.DATABASE_URL ? drizzle({ client: pool, schema }) : null as any;
