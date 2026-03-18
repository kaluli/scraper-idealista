/**
 * Script de migración SQLite → MySQL.
 * No se usa en el build de Next.js; excluido en tsconfig.
 * Si aparece en el build, shell usa string para compatibilidad con tipos de Node.
 */
import { execSync } from "child_process";

function querySqlite<T = unknown>(sqlitePath: string, sql: string): T[] {
  const out = execSync(`sqlite3 "${sqlitePath}" ".mode json" "${sql}"`, {
    encoding: "utf-8",
    shell: "/bin/sh",
  });
  const trimmed = out.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

export { querySqlite };
