
"use strict";

require("dotenv").config();

const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não foi configurada no arquivo .env");
}

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000
});

db.on("error", (erro) => {
    console.error("Erro inesperado no PostgreSQL:", erro.message);
});

module.exports = db;
