
"use strict";

const Database = require("better-sqlite3");

const db = new Database("./gincana.db", {
    readonly: true
});

const tabelas = [
    "integrantes",
    "equipes",
    "arrecadacao",
    "checklist"
];

for (const tabela of tabelas) {
    try {
        const resultado = db
            .prepare(`SELECT COUNT(*) AS total FROM "${tabela}"`)
            .get();

        console.log(`${tabela}: ${resultado.total} registros`);
    } catch (erro) {
        console.log(`${tabela}: tabela não encontrada`);
    }
}

db.close();
