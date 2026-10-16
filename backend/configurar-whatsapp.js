"use strict";

const fs = require("fs");
const path = require("path");

const databasePath = path.join(__dirname, "database.js");
const serverPath = path.join(__dirname, "server.js");

console.log("Iniciando configuração do WhatsApp...\n");

// ============================================================
// 1. ALTERAR DATABASE.JS
// ============================================================

let database = fs.readFileSync(databasePath, "utf8");

if (!database.includes("telefone TEXT")) {
    const padrao = /ativo\s+INTEGER\s+DEFAULT\s+1/;

    if (!padrao.test(database)) {
        console.error("Não encontrei a definição esperada da coluna 'ativo' em database.js.");
        process.exit(1);
    }

    database = database.replace(
        padrao,
        "ativo INTEGER DEFAULT 1,\n        telefone TEXT"
    );

    fs.writeFileSync(databasePath, database, "utf8");

    console.log("✓ Campo telefone adicionado ao database.js.");
} else {
    console.log("✓ Campo telefone já existe no database.js.");
}

// ============================================================
// 2. ALTERAR SERVER.JS
// ============================================================

let server = fs.readFileSync(serverPath, "utf8");

// ------------------------------------------------------------
// GET /api/integrantes
// ------------------------------------------------------------

const selectAntigo = `
            SELECT id, nome, tipo, ativo
            FROM integrantes
            ORDER BY nome
`;

const selectNovo = `
            SELECT id, nome, tipo, ativo, telefone
            FROM integrantes
            ORDER BY nome
`;

if (server.includes(selectAntigo) && !server.includes(selectNovo)) {
    server = server.replace(selectAntigo, selectNovo);

    console.log("✓ API de integrantes atualizada para retornar telefone.");
} else if (server.includes(selectNovo)) {
    console.log("✓ API de integrantes já retorna telefone.");
} else {
    console.log("⚠ Não foi possível localizar exatamente o SELECT de integrantes.");
}

// ------------------------------------------------------------
// POST /api/integrantes
// ------------------------------------------------------------

const trechoAntigo = `
    const { nome, codigo, tipo } = req.body;
`;

const trechoNovo = `
    const { nome, codigo, tipo, telefone } = req.body;
`;

if (server.includes(trechoAntigo) && !server.includes(trechoNovo)) {
    server = server.replace(trechoAntigo, trechoNovo);

    console.log("✓ Cadastro de integrante atualizado para aceitar telefone.");
}

// ------------------------------------------------------------
// INSERT
// ------------------------------------------------------------

const insertAntigo = `
            INSERT INTO integrantes (nome, codigo, tipo)
            VALUES (?, ?, ?)
        \`).run(nome.trim(), codigo.trim(), tipo);
`;

const insertNovo = `
            INSERT INTO integrantes (nome, codigo, tipo, telefone)
            VALUES (?, ?, ?, ?)
        \`).run(
            nome.trim(),
            codigo.trim(),
            tipo,
            typeof telefone === "string" ? telefone.trim() : null
        );
`;

if (server.includes(insertAntigo)) {
    server = server.replace(insertAntigo, insertNovo);

    console.log("✓ INSERT de integrante atualizado.");
}

// ------------------------------------------------------------
// NOVA ROTA PARA ATUALIZAR TELEFONE
// ------------------------------------------------------------

if (!server.includes('app.patch("/api/integrantes/:id/telefone"')) {

    const marcador = '// ARQUIVOS ESTÁTICOS';

    const novaRota = `
// ============================================================
// WHATSAPP: ATUALIZAÇÃO DE TELEFONE
// ============================================================

app.patch("/api/integrantes/:id/telefone", exigirLider, (req, res) => {

    const id = Number(req.params.id);

    const telefone =
        typeof req.body.telefone === "string"
            ? req.body.telefone.trim()
            : "";

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: "ID inválido."
        });
    }

    if (telefone && !/^\\\\+?[0-9 ()-]{8,20}$/.test(telefone)) {
        return res.status(400).json({
            erro: "Número de telefone inválido."
        });
    }

    try {

        const resultado = db.prepare(\`
            UPDATE integrantes
            SET telefone = ?
            WHERE id = ?
            AND tipo NOT IN ('lider', 'administracao')
        \`).run(
            telefone || null,
            id
        );

        if (resultado.changes === 0) {
            return res.status(404).json({
                erro: "Integrante não encontrado ou protegido."
            });
        }

        res.json({
            sucesso: true,
            telefone: telefone || null
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            erro: "Não foi possível atualizar o telefone."
        });
    }
});


`;

    if (!server.includes(marcador)) {
        console.error("Não encontrei o local para inserir a rota do WhatsApp.");
        process.exit(1);
    }

    server = server.replace(
        marcador,
        novaRota + marcador
    );

    console.log("✓ Rota de atualização de telefone criada.");
}

fs.writeFileSync(serverPath, server, "utf8");

// ============================================================
// 3. MIGRAÇÃO REAL DO BANCO
// ============================================================

const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "gincana.db");
const db = new Database(dbPath);

const colunas = db.prepare("PRAGMA table_info(integrantes)").all();

const possuiTelefone = colunas.some(
    coluna => coluna.name === "telefone"
);

if (!possuiTelefone) {

    db.prepare(`
        ALTER TABLE integrantes
        ADD COLUMN telefone TEXT
    `).run();

    console.log("✓ Coluna telefone criada no banco de dados.");
} else {
    console.log("✓ Coluna telefone já existe no banco.");
}

db.close();

console.log("\nConfiguração concluída.");
console.log("Agora reinicie o servidor.");