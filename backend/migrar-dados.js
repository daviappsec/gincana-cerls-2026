
"use strict";

require("dotenv").config();

const Database = require("better-sqlite3");
const { Pool } = require("pg");
const path = require("path");

if (!process.env.DATABASE_URL) {
    console.error("ERRO: configure DATABASE_URL no arquivo .env");
    process.exit(1);
}

const sqlite = new Database(
    path.join(__dirname, "gincana.db"),
    { readonly: true }
);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const tabelas = [
    "integrantes",
    "equipes",
    "arrecadacao",
    "checklist"
];

async function migrar() {
    const client = await pool.connect();

    try {
        // Confere se as tabelas de destino estão vazias.
        for (const tabela of tabelas) {
            const resultado = await client.query(
                `SELECT COUNT(*)::int AS total FROM ${tabela}`
            );

            if (resultado.rows[0].total !== 0) {
                throw new Error(
                    `A tabela "${tabela}" não está vazia. ` +
                    "Migração cancelada para evitar duplicações."
                );
            }
        }

        await client.query("BEGIN");

        for (const tabela of tabelas) {
            const registros = sqlite
                .prepare(`SELECT * FROM "${tabela}"`)
                .all();

            if (registros.length === 0) {
                console.log(`${tabela}: nenhum registro.`);
                continue;
            }

            const colunas = Object.keys(registros[0]);
            const nomes = colunas
                .map((coluna) => `"${coluna}"`)
                .join(", ");

            const valores = colunas
                .map((_, indice) => `$${indice + 1}`)
                .join(", ");

            const sql = `
                INSERT INTO "${tabela}" (${nomes})
                VALUES (${valores})
            `;

            for (const registro of registros) {
                await client.query(
                    sql,
                    colunas.map((coluna) => registro[coluna])
                );
            }

            console.log(
                `${tabela}: ${registros.length} registros copiados.`
            );
        }

        // Ajusta os próximos IDs automáticos.
        for (const tabela of tabelas) {
            await client.query(`
                SELECT setval(
                    pg_get_serial_sequence('${tabela}', 'id'),
                    COALESCE((SELECT MAX(id) FROM "${tabela}"), 1),
                    EXISTS (SELECT 1 FROM "${tabela}")
                )
            `);
        }

        await client.query("COMMIT");

        console.log("\nMigração concluída.");
        console.log("Agora confira os totais no Supabase.");

    } catch (erro) {
        await client.query("ROLLBACK").catch(() => {});
        console.error("\nMigração cancelada:", erro.message);
    } finally {
        client.release();
        sqlite.close();
        await pool.end();
    }
}

migrar().catch((erro) => {
    console.error("Falha de conexão:", erro.message);
    sqlite.close();
    pool.end();
    process.exitCode = 1;
});
