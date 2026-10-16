
"use strict";


require("dotenv").config();

const express = require("express");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const path = require("path");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");
const PRODUCAO = process.env.NODE_ENV === "production";

app.use(express.json({ limit: "20kb" }));

if (!process.env.SESSION_SECRET) {
    throw new Error("Configure SESSION_SECRET no arquivo .env.");
}

// Configuração básica
if (PRODUCAO) {
    app.set("trust proxy", 1);
}


app.use(
    session({
        store: new PgSession({
            pool: db,
            tableName: "gincana_sessions",
            createTableIfMissing: true,
            pruneSessionInterval: 15 * 60
        }),
        name: "gincana.sid",
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: PRODUCAO,
            maxAge: 1000 * 60 * 60 * 8
        }
    })
);


// =====================================================
// MIDDLEWARES DE ACESSO
// =====================================================

function exigirLogin(req, res, next) {
    if (!req.session.usuario) {
        return res.status(401).json({
            erro: "Você precisa entrar na sua conta."
        });
    }

    next();
}

function exigirLider(req, res, next) {
    if (!req.session.usuario) {
        return res.status(401).json({
            erro: "Você precisa entrar na sua conta."
        });
    }

    if (req.session.usuario.tipo !== "lider") {
        return res.status(403).json({
            erro: "Apenas o líder pode realizar esta ação."
        });
    }

    next();
}

function exigirAdministracao(req, res, next) {
    if (!req.session.usuario) {
        return res.status(401).json({
            erro: "Você precisa entrar na sua conta."
        });
    }

    if (req.session.usuario.tipo !== "administracao") {
        return res.status(403).json({
            erro: "Apenas a administração pode realizar esta ação."
        });
    }

    next();
}

function exigirLiderPagina(req, res, next) {
    if (!req.session.usuario) {
        return res.redirect("/login.html");
    }

    if (req.session.usuario.tipo !== "lider") {
        return res.redirect("/acesso-negado.html");
    }

    next();
}

function exigirAdministracaoPagina(req, res, next) {
    if (!req.session.usuario) {
        return res.redirect("/login.html");
    }

    if (req.session.usuario.tipo !== "administracao") {
        return res.redirect("/acesso-negado.html");
    }

    next();
}

// =====================================================
// LOGIN
// =====================================================

app.post("/api/login", async (req, res) => {
    try {
        const { nome, codigo } = req.body || {};

        if (
            typeof nome !== "string" ||
            typeof codigo !== "string" ||
            !nome.trim() ||
            !codigo.trim()
        ) {
            return res.status(400).json({
                erro: "Nome e código são obrigatórios."
            });
        }

        const resultado = await db.query(
            `SELECT id, nome, codigo, tipo, ativo
             FROM integrantes
             WHERE LOWER(nome) = LOWER($1)
             AND codigo = $2`,
            [nome.trim(), codigo.trim()]
        );

        const integrante = resultado.rows[0];

        if (!integrante) {
            return res.status(401).json({
                erro: "Nome ou código incorreto."
            });
        }

        if (!integrante.ativo) {
            return res.status(403).json({
                erro: "Este usuário está desativado."
            });
        }

        // Regenera a sessão para reduzir risco de fixação de sessão.
        req.session.regenerate((erro) => {
            if (erro) {
                console.error("Erro ao criar sessão:", erro.message);

                return res.status(500).json({
                    erro: "Não foi possível iniciar a sessão."
                });
            }

            req.session.usuario = {
                id: integrante.id,
                nome: integrante.nome,
                tipo: integrante.tipo
            };

            req.session.save((erroAoSalvar) => {
                if (erroAoSalvar) {
                    console.error(
                        "Erro ao salvar sessão:",
                        erroAoSalvar.message
                    );

                    return res.status(500).json({
                        erro: "Não foi possível iniciar a sessão."
                    });
                }

                return res.json({
                    sucesso: true,
                    usuario: req.session.usuario
                });
            });
        });
    } catch (erro) {
        console.error("Erro no login:", erro.message);

        res.status(500).json({
            erro: "Não foi possível realizar o login."
        });
    }
});

app.get("/api/me", (req, res) => {
    if (!req.session.usuario) {
        return res.status(401).json({
            logado: false
        });
    }

    res.json({
        logado: true,
        usuario: req.session.usuario
    });
});

app.post("/api/logout", (req, res) => {
    if (!req.session) {
        res.clearCookie("gincana.sid");

        return res.json({ sucesso: true });
    }

    req.session.destroy((erro) => {
        if (erro) {
            console.error("Erro ao encerrar sessão:", erro.message);

            return res.status(500).json({
                erro: "Não foi possível encerrar a sessão."
            });
        }

        res.clearCookie("gincana.sid", {
            httpOnly: true,
            sameSite: "lax",
            secure: PRODUCAO
        });

        res.json({ sucesso: true });
    });
});

// =====================================================
// CHECKLIST
// =====================================================

// Consulta para usuários autenticados
app.get("/api/checklist", exigirLogin, async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT id, tarefa, concluida
             FROM checklist
             ORDER BY id DESC`
        );

        res.json(resultado.rows);
    } catch (erro) {
        console.error("Erro no checklist:", erro.message);

        res.status(500).json({
            erro: "Não foi possível carregar as tarefas."
        });
    }
});

// Cadastro pela administração
app.post(
    "/api/checklist",
    exigirAdministracao,
    async (req, res) => {
        try {
            const { tarefa } = req.body || {};

            if (typeof tarefa !== "string" || !tarefa.trim()) {
                return res.status(400).json({
                    erro: "Digite o nome da tarefa."
                });
            }

            const resultado = await db.query(
                `INSERT INTO checklist (tarefa)
                 VALUES ($1)
                 RETURNING id`,
                [tarefa.trim()]
            );

            res.status(201).json({
                sucesso: true,
                id: resultado.rows[0].id
            });
        } catch (erro) {
            console.error("Erro ao cadastrar tarefa:", erro.message);

            res.status(500).json({
                erro: "Não foi possível cadastrar a tarefa."
            });
        }
    }
);

// Exclusão pela administração
app.delete(
    "/api/checklist/:id",
    exigirAdministracao,
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({
                    erro: "ID da tarefa inválido."
                });
            }

            const resultado = await db.query(
                `DELETE FROM checklist
                 WHERE id = $1
                 RETURNING id`,
                [id]
            );

            if (resultado.rowCount === 0) {
                return res.status(404).json({
                    erro: "Tarefa não encontrada."
                });
            }

            res.json({
                sucesso: true,
                mensagem: "Tarefa excluída com sucesso."
            });
        } catch (erro) {
            console.error("Erro ao excluir tarefa:", erro.message);

            res.status(500).json({
                erro: "Não foi possível excluir a tarefa."
            });
        }
    }
);

// =====================================================
// ARRECADAÇÃO
// =====================================================

// Consulta para usuários autenticados
app.get("/api/arrecadacao", exigirLogin, async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT id, item, quantidade
             FROM arrecadacao
             ORDER BY id`
        );

        res.json(resultado.rows);
    } catch (erro) {
        console.error("Erro na arrecadação:", erro.message);

        res.status(500).json({
            erro: "Não foi possível carregar a arrecadação."
        });
    }
});

// Alteração pelo líder
app.put(
    "/api/arrecadacao/:id",
    exigirLider,
    async (req, res) => {
        try {
            const id = Number(req.params.id);
            const quantidade = req.body?.quantidade;

            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({
                    erro: "ID inválido."
                });
            }

            if (
                typeof quantidade !== "number" ||
                !Number.isSafeInteger(quantidade) ||
                quantidade < 0
            ) {
                return res.status(400).json({
                    erro: "Quantidade inválida."
                });
            }

            const resultado = await db.query(
                `UPDATE arrecadacao
                 SET quantidade = $1
                 WHERE id = $2
                 RETURNING id`,
                [quantidade, id]
            );

            if (resultado.rowCount === 0) {
                return res.status(404).json({
                    erro: "Item não encontrado."
                });
            }

            res.json({ sucesso: true });
        } catch (erro) {
            console.error(
                "Erro ao atualizar arrecadação:",
                erro.message
            );

            res.status(500).json({
                erro: "Não foi possível atualizar a arrecadação."
            });
        }
    }
);

// =====================================================
// PLACAR PÚBLICO
// =====================================================

app.get("/api/equipes", async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT
                id,
                nome,
                pontos_ganhos,
                pontos_perdidos,
                seguidores
             FROM equipes
             ORDER BY (pontos_ganhos - pontos_perdidos) DESC, nome ASC`
        );

        res.json(resultado.rows);
    } catch (erro) {
        console.error("Erro ao carregar placar:", erro.message);

        res.status(500).json({
            erro: "Não foi possível carregar o placar."
        });
    }
});

// =====================================================
// PONTUAÇÃO — ADMINISTRAÇÃO
// =====================================================

app.get(
    "/api/pontuacao",
    exigirAdministracao,
    async (req, res) => {
        try {
            const resultado = await db.query(
                `SELECT id, nome, pontos_ganhos, pontos_perdidos
                 FROM equipes
                 ORDER BY nome`
            );

            res.json(resultado.rows);
        } catch (erro) {
            console.error(
                "Erro ao consultar pontuação:",
                erro.message
            );

            res.status(500).json({
                erro: "Não foi possível carregar as equipes."
            });
        }
    }
);

app.put(
    "/api/pontuacao/:id",
    exigirAdministracao,
    async (req, res) => {
        try {
            const id = Number(req.params.id);
            const { tipo, valor } = req.body || {};

            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({
                    erro: "ID da equipe inválido."
                });
            }

            if (tipo !== "ganhos" && tipo !== "perdidos") {
                return res.status(400).json({
                    erro: "Escolha pontos ganhos ou pontos perdidos."
                });
            }

            if (
                typeof valor !== "number" ||
                !Number.isSafeInteger(valor) ||
                valor < 0
            ) {
                return res.status(400).json({
                    erro: "Informe um número inteiro igual ou maior que zero."
                });
            }

            // O nome da coluna vem de uma lista fixa, nunca da entrada livre.
            const coluna = tipo === "ganhos"
                ? "pontos_ganhos"
                : "pontos_perdidos";

            const resultado = await db.query(
                `UPDATE equipes
                 SET ${coluna} = $1
                 WHERE id = $2
                 RETURNING id, nome, pontos_ganhos, pontos_perdidos`,
                [valor, id]
            );

            if (resultado.rowCount === 0) {
                return res.status(404).json({
                    erro: "Equipe não encontrada."
                });
            }

            res.json({
                sucesso: true,
                mensagem: "Pontuação atualizada.",
                equipe: resultado.rows[0]
            });
        } catch (erro) {
            console.error(
                "Erro ao atualizar pontuação:",
                erro.message
            );

            res.status(500).json({
                erro: "Não foi possível atualizar a pontuação."
            });
        }
    }
);

// =====================================================
// INTEGRANTES — CADASTRO PELO LÍDER
// =====================================================

app.post("/api/integrantes", exigirLider, async (req, res) => {
    try {
        const { nome, codigo, tipo } = req.body || {};

        if (
            typeof nome !== "string" ||
            typeof codigo !== "string" ||
            !nome.trim() ||
            !codigo.trim() ||
            !tipo
        ) {
            return res.status(400).json({
                erro: "Nome, código e tipo são obrigatórios."
            });
        }

        const tiposPermitidos = [
            "integrante",
            "administracao"
        ];

        if (!tiposPermitidos.includes(tipo)) {
            return res.status(400).json({
                erro: "Tipo de usuário inválido."
            });
        }

        const resultado = await db.query(
            `INSERT INTO integrantes (nome, codigo, tipo)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [nome.trim(), codigo.trim(), tipo]
        );

        res.status(201).json({
            sucesso: true,
            id: resultado.rows[0].id
        });
    } catch (erro) {
        if (erro.code === "23505") {
            return res.status(409).json({
                erro: "Nome ou código já cadastrado."
            });
        }

        console.error("Erro ao cadastrar integrante:", erro.message);

        res.status(500).json({
            erro: "Erro ao cadastrar integrante."
        });
    }
});

// Lista sem expor os códigos de acesso
app.get("/api/integrantes", exigirLider, async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT id, nome, tipo, ativo
             FROM integrantes
             ORDER BY nome`
        );

        res.json(resultado.rows);
    } catch (erro) {
        console.error("Erro ao listar integrantes:", erro.message);

        res.status(500).json({
            erro: "Não foi possível listar os integrantes."
        });
    }
});

// =====================================================
// INTEGRANTES — DESATIVAR
// =====================================================

app.delete(
    "/api/integrantes/:id",
    exigirLider,
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({
                    erro: "ID do integrante inválido."
                });
            }

            const consulta = await db.query(
                `SELECT id, nome, tipo, ativo
                 FROM integrantes
                 WHERE id = $1`,
                [id]
            );

            const integrante = consulta.rows[0];

            if (!integrante) {
                return res.status(404).json({
                    erro: "Integrante não encontrado."
                });
            }

            if (
                integrante.tipo === "lider" ||
                integrante.tipo === "administracao"
            ) {
                return res.status(403).json({
                    erro: "Esta conta é protegida e não pode ser desativada por esta área."
                });
            }

            if (!integrante.ativo) {
                return res.status(400).json({
                    erro: "Este integrante já está desativado."
                });
            }

            await db.query(
                `UPDATE integrantes
                 SET ativo = 0
                 WHERE id = $1`,
                [id]
            );

            res.json({
                sucesso: true,
                mensagem: "Integrante desativado com sucesso."
            });
        } catch (erro) {
            console.error(
                "Erro ao desativar integrante:",
                erro.message
            );

            res.status(500).json({
                erro: "Não foi possível desativar o integrante."
            });
        }
    }
);

// =====================================================
// INTEGRANTES — REATIVAR
// =====================================================

app.patch(
    "/api/integrantes/:id/ativar",
    exigirLider,
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({
                    erro: "ID do integrante inválido."
                });
            }

            const consulta = await db.query(
                `SELECT id, nome, tipo, ativo
                 FROM integrantes
                 WHERE id = $1`,
                [id]
            );

            const integrante = consulta.rows[0];

            if (!integrante) {
                return res.status(404).json({
                    erro: "Integrante não encontrado."
                });
            }

            if (
                integrante.tipo === "lider" ||
                integrante.tipo === "administracao"
            ) {
                return res.status(403).json({
                    erro: "Esta conta é protegida e não pode ser alterada por esta área."
                });
            }

            if (integrante.ativo) {
                return res.status(400).json({
                    erro: "Este integrante já está ativo."
                });
            }

            await db.query(
                `UPDATE integrantes
                 SET ativo = 1
                 WHERE id = $1`,
                [id]
            );

            res.json({
                sucesso: true,
                mensagem: "Integrante ativado com sucesso."
            });
        } catch (erro) {
            console.error(
                "Erro ao reativar integrante:",
                erro.message
            );

            res.status(500).json({
                erro: "Não foi possível ativar o integrante."
            });
        }
    }
);

// =====================================================
// ARQUIVOS ESTÁTICOS
// =====================================================

app.use("/style", express.static(path.join(ROOT, "style")));
app.use("/script", express.static(path.join(ROOT, "script")));
app.use("/imagens", express.static(path.join(ROOT, "imagens")));

// =====================================================
// PÁGINAS PÚBLICAS
// =====================================================

app.get("/", (req, res) => {
    res.sendFile(path.join(ROOT, "index.html"));
});

app.get("/index.html", (req, res) => {
    res.sendFile(path.join(ROOT, "index.html"));
});

app.get("/login.html", (req, res) => {
    res.sendFile(path.join(ROOT, "login.html"));
});

app.get("/sobre.html", (req, res) => {
    res.sendFile(path.join(ROOT, "sobre.html"));
});

app.get("/regras.html", (req, res) => {
    res.sendFile(path.join(ROOT, "regras.html"));
});

app.get("/acesso-negado.html", (req, res) => {
    res.sendFile(path.join(ROOT, "acesso-negado.html"));
});

// =====================================================
// PÁGINAS PRIVADAS
// =====================================================

app.get(
    "/privado/checklist.html",
    exigirLogin,
    (req, res) => {
        res.sendFile(
            path.join(ROOT, "privado", "checklist.html")
        );
    }
);

app.get(
    "/admin/tarefas.html",
    exigirAdministracaoPagina,
    (req, res) => {
        res.sendFile(
            path.join(ROOT, "admin", "tarefas.html")
        );
    }
);

app.get(
    "/admin/pontuacao.html",
    exigirAdministracaoPagina,
    (req, res) => {
        res.sendFile(
            path.join(ROOT, "admin", "pontuacao.html")
        );
    }
);

app.get(
    "/privado/arrecadacao.html",
    exigirLogin,
    (req, res) => {
        res.sendFile(
            path.join(ROOT, "privado", "arrecadacao.html")
        );
    }
);

app.get(
    "/admin/contabilidade.html",
    exigirLiderPagina,
    (req, res) => {
        res.sendFile(
            path.join(ROOT, "admin", "contabilidade.html")
        );
    }
);

// =====================================================
// ERRO DE JSON INVÁLIDO
// =====================================================



// =====================================================
// INICIAR SERVIDOR
// =====================================================

const servidor = app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// Encerramento organizado
function encerrar() {
    console.log("Encerrando servidor...");

    servidor.close(() => {
        db.end()
            .catch((erro) => {
                console.error(
                    "Erro ao encerrar conexão com o banco:",
                    erro.message
                );
            })
            .finally(() => process.exit(0));
    });
}

process.on("SIGTERM", encerrar);
process.on("SIGINT", encerrar);
