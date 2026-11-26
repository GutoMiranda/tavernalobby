import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = join(__dirname, "..", "..");

/**
 * Banco de teste em memória (PGlite = Postgres em WebAssembly, roda em qualquer PC sem instalar nada).
 * Carrega a simulação do Supabase e todas as migrações, na ordem.
 */
export async function criarBanco() {
  const db = new PGlite();
  await db.exec(readFileSync(join(raiz, "tests/db/supabase-shim.sql"), "utf8"));
  const pasta = join(raiz, "supabase/migrations");
  for (const arquivo of readdirSync(pasta)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await db.exec(readFileSync(join(pasta, arquivo), "utf8"));
  }
  return new BancoDeTeste(db);
}

export type Linha = Record<string, unknown>;

export class BancoDeTeste {
  constructor(readonly db: PGlite) {}

  /** Simula o primeiro login (cria a linha em auth.users, o que dispara o trigger). */
  async criarUsuario(email: string, nome: string): Promise<string> {
    const r = await this.db.query<{ id: string }>(
      "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
      [email, JSON.stringify({ full_name: nome })],
    );
    return r.rows[0].id;
  }

  /** Consulta como superusuário (sem RLS), para preparar cenários e conferir resultados. */
  async admin<T = Linha>(sql: string, params: unknown[] = []): Promise<T[]> {
    return (await this.db.query<T>(sql, params)).rows;
  }

  /** Consulta como um usuário logado (papel authenticated, com RLS). */
  async como<T = Linha>(userId: string, sql: string, params: unknown[] = []): Promise<T[]> {
    await this.db.exec("set role authenticated");
    await this.db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
    try {
      return (await this.db.query<T>(sql, params)).rows;
    } finally {
      await this.db.exec("reset role");
      await this.db.query("select set_config('request.jwt.claim.sub', '', false)");
    }
  }

  /** Consulta como visitante não logado (papel anon). */
  async anonimo<T = Linha>(sql: string, params: unknown[] = []): Promise<T[]> {
    await this.db.exec("set role anon");
    try {
      return (await this.db.query<T>(sql, params)).rows;
    } finally {
      await this.db.exec("reset role");
    }
  }

  async pessoaDe(userId: string) {
    const [p] = await this.admin<{ id: string; household_id: string; status: string; is_admin: boolean }>(
      "select id, household_id, status, is_admin from public.people where user_id = $1",
      [userId],
    );
    return p;
  }
}
