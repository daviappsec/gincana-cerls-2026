"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const db = require("./database");

const administradores = [
    "Isis S. S. S",
    "Brenno C. M",
    "Ana C. A. D",
    "Nadla J. S. B"
];

function gerarCodigo() {

    const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let codigo;

    do {

        let parte1 = "";
        let parte2 = "";

        for (let i = 0; i < 4; i++) {
            parte1 += caracteres[
                crypto.randomInt(0, caracteres.length)
            ];
        }

        for (let i = 0; i < 4; i++) {
            parte2 += caracteres[
                crypto.randomInt(0, caracteres.length)
            ];
        }

        codigo = `${parte1}-${parte2}`;

        const existente = db.prepare(`
            SELECT id
            FROM integrantes
            WHERE codigo = ?
        `).get(codigo);

        if (!existente) {
            return codigo;
        }

    } while (true);
}

const resultados = [];

for (const nome of administradores) {

    const existente = db.prepare(`
        SELECT id, nome, codigo, tipo, ativo
        FROM integrantes
        WHERE nome = ? COLLATE NOCASE
    `).get(nome);

    if (existente) {

        console.log(`Já cadastrado: ${nome}`);

        resultados.push({
            nome: existente.nome,
            codigo: existente.codigo,
            tipo: existente.tipo,
            status: existente.ativo ? "ATIVO" : "DESATIVADO"
        });

        continue;
    }

    const codigo = gerarCodigo();

    const resultado = db.prepare(`
        INSERT INTO integrantes (
            nome,
            codigo,
            tipo,
            ativo
        )
        VALUES (?, ?, ?, 1)
    `).run(
        nome,
        codigo,
        "administracao"
    );

    console.log(`Cadastrado: ${nome} → ${codigo}`);

    resultados.push({
        nome,
        codigo,
        tipo: "administracao",
        status: "ATIVO"
    });
}

// ============================================================
// CSV
// ============================================================

const csvLinhas = [
    "Nome,Codigo,Tipo,Status"
];

for (const pessoa of resultados) {

    csvLinhas.push(
        `"${pessoa.nome}","${pessoa.codigo}","${pessoa.tipo}","${pessoa.status}"`
    );
}

const arquivo = path.join(
    __dirname,
    "..",
    "acessos-administradores.csv"
);

fs.writeFileSync(
    arquivo,
    csvLinhas.join("\n"),
    "utf8"
);

console.log("\n======================================");
console.log("ADMINISTRADORES");
console.log("======================================");

for (const pessoa of resultados) {
    console.log(`${pessoa.nome} | ${pessoa.codigo}`);
}

console.log("\nArquivo criado:");
console.log(arquivo);

console.log("\nCadastro concluído.");