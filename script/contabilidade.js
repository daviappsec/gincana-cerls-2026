
"use strict";

const formCadastro = document.getElementById("formCadastro");
const nomeIntegrante = document.getElementById("nomeIntegrante");
const codigoIntegrante = document.getElementById("codigoIntegrante");
const telefoneIntegrante = document.getElementById("telefoneIntegrante");
const tipoIntegrante = document.getElementById("tipoIntegrante");
const mensagemCadastro = document.getElementById("mensagemCadastro");
const listaIntegrantes = document.getElementById("listaIntegrantes");
const tabelaContabilidade = document.getElementById("tabelaContabilidade");
const botaoSair = document.getElementById("botaoSair");

let salvandoArrecadacao = false;

// ============================================================
// VERIFICAR PERMISSÃO
// ============================================================

async function verificarPermissao() {
    const resposta = await fetch("/api/me");

    if (!resposta.ok) {
        window.location.href = "/login.html";
        return false;
    }

    const dados = await resposta.json();

    if (!dados.logado || dados.usuario?.tipo !== "lider") {
        window.location.href = "/acesso-negado.html";
        return false;
    }

    return true;
}

// ============================================================
// CADASTRAR INTEGRANTE
// ============================================================

formCadastro.addEventListener("submit", async function (event) {
    event.preventDefault();

    const nome = nomeIntegrante.value.trim();
    const codigo = codigoIntegrante.value.trim();
    const telefone = telefoneIntegrante.value.trim();
    const tipo = tipoIntegrante.value;

    if (!nome || !codigo) {
        mensagemCadastro.textContent = "Preencha o nome e o código.";
        return;
    }

    try {
        const resposta = await fetch("/api/integrantes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ nome, codigo, telefone, tipo })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            mensagemCadastro.textContent =
                dados.erro || "Não foi possível cadastrar.";
            return;
        }

        mensagemCadastro.textContent = "Integrante cadastrado com sucesso.";
        formCadastro.reset();

        await carregarIntegrantes();
    } catch (erro) {
        console.error(erro);
        mensagemCadastro.textContent = "Erro de conexão com o servidor.";
    }
});

// ============================================================
// CARREGAR INTEGRANTES
// ============================================================

async function carregarIntegrantes() {
    try {
        const resposta = await fetch("/api/integrantes");

        if (!resposta.ok) {
            listaIntegrantes.innerHTML = `
                <tr>
                    <td colspan="5">Não foi possível carregar os integrantes.</td>
                </tr>
            `;
            return;
        }

        const integrantes = await resposta.json();
        listaIntegrantes.replaceChildren();

        integrantes.forEach(integrante => {
            const linha = document.createElement("tr");

            const celulaNome = document.createElement("td");
            celulaNome.textContent = integrante.nome;

            const celulaTipo = document.createElement("td");
            celulaTipo.textContent = formatarTipo(integrante.tipo);

            const celulaTelefone = document.createElement("td");
            celulaTelefone.textContent = integrante.telefone
                ? formatarTelefone(integrante.telefone)
                : "Não cadastrado";

            const celulaStatus = document.createElement("td");
            celulaStatus.textContent = integrante.ativo ? "Ativo" : "Desativado";

            const celulaAcoes = document.createElement("td");

            if (
                integrante.tipo === "lider" ||
                integrante.tipo === "administracao"
            ) {
                celulaAcoes.textContent = "Protegido";
            } else {
                const container = document.createElement("div");
                container.className = "acoes-integrante";

                if (integrante.ativo && integrante.telefone) {
                    const botaoWhatsApp = document.createElement("button");
                    botaoWhatsApp.type = "button";
                    botaoWhatsApp.textContent = "WhatsApp";
                    botaoWhatsApp.className = "botao-whatsapp";

                    botaoWhatsApp.addEventListener("click", () => {
                        abrirWhatsApp(integrante);
                    });

                    container.appendChild(botaoWhatsApp);
                }

                const botaoTelefone = document.createElement("button");
                botaoTelefone.type = "button";
                botaoTelefone.textContent = integrante.telefone
                    ? "Alterar telefone"
                    : "Cadastrar telefone";

                botaoTelefone.addEventListener("click", () => {
                    alterarTelefone(integrante);
                });

                container.appendChild(botaoTelefone);

                const botaoStatus = document.createElement("button");
                botaoStatus.type = "button";
                botaoStatus.textContent = integrante.ativo
                    ? "Desativar"
                    : "Ativar";

                botaoStatus.addEventListener("click", () => {
                    if (integrante.ativo) {
                        desativarIntegrante(integrante.id);
                    } else {
                        ativarIntegrante(integrante.id);
                    }
                });

                container.appendChild(botaoStatus);
                celulaAcoes.appendChild(container);
            }

            linha.append(
                celulaNome,
                celulaTipo,
                celulaTelefone,
                celulaStatus,
                celulaAcoes
            );

            listaIntegrantes.appendChild(linha);
        });
    } catch (erro) {
        console.error(erro);
    }
}

// ============================================================
// WHATSAPP
// ============================================================

function abrirWhatsApp(integrante) {
    if (!integrante.telefone) {
        alert("Este integrante ainda não possui telefone cadastrado.");
        return;
    }

    let telefone = integrante.telefone.replace(/\D/g, "");

    if (telefone.length === 11) {
        telefone = "55" + telefone;
    }

    const mensagem = `Olá, ${integrante.nome}!

Seu acesso à Central da Gincana foi criado.

Nome: ${integrante.nome}

Código: consulte seu código de acesso com a organização.

Acesse: http://localhost:3000/login.html

Guarde essas informações e não compartilhe seu código com outras pessoas.`;

    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank");
}

// ============================================================
// ALTERAR TELEFONE
// ============================================================

async function alterarTelefone(integrante) {
    const telefone = prompt(
        `Telefone de ${integrante.nome}:`,
        integrante.telefone || ""
    );

    if (telefone === null) return;

    try {
        const resposta = await fetch(
            `/api/integrantes/${integrante.id}/telefone`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ telefone: telefone.trim() })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(dados.erro || "Não foi possível salvar o telefone.");
            return;
        }

        await carregarIntegrantes();
    } catch (erro) {
        console.error(erro);
        alert("Erro de conexão com o servidor.");
    }
}

// ============================================================
// DESATIVAR INTEGRANTE
// ============================================================

async function desativarIntegrante(id) {
    if (!confirm("Deseja realmente desativar este integrante?")) return;

    try {
        const resposta = await fetch(`/api/integrantes/${id}`, {
            method: "DELETE"
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(dados.erro || "Não foi possível desativar.");
            return;
        }

        await carregarIntegrantes();
    } catch (erro) {
        console.error(erro);
        alert("Erro de conexão com o servidor.");
    }
}

// ============================================================
// ATIVAR INTEGRANTE
// ============================================================

async function ativarIntegrante(id) {
    try {
        const resposta = await fetch(`/api/integrantes/${id}/ativar`, {
            method: "PATCH"
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(dados.erro || "Não foi possível ativar.");
            return;
        }

        await carregarIntegrantes();
    } catch (erro) {
        console.error(erro);
        alert("Erro de conexão com o servidor.");
    }
}

// ============================================================
// ARRECADAÇÃO: MOSTRAR CAMPOS DE EDIÇÃO
// ============================================================

async function carregarItens() {
    if (salvandoArrecadacao) return;

    try {
        const resposta = await fetch("/api/arrecadacao");

        if (resposta.status === 401) {
            window.location.href = "/login.html";
            return;
        }

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar a arrecadação.");
        }

        const itens = await resposta.json();
        tabelaContabilidade.replaceChildren();

        if (!itens.length) {
            const linha = document.createElement("tr");
            const celula = document.createElement("td");

            celula.colSpan = 3;
            celula.textContent = "Nenhum alimento cadastrado.";

            linha.appendChild(celula);
            tabelaContabilidade.appendChild(linha);
            return;
        }

        itens.forEach(item => {
            const linha = document.createElement("tr");

            const celulaNome = document.createElement("td");
            celulaNome.textContent = item.item;

            const celulaQuantidade = document.createElement("td");
            const campoQuantidade = document.createElement("input");

            campoQuantidade.type = "number";
            campoQuantidade.min = "0";
            campoQuantidade.step = "1";
            campoQuantidade.required = true;
            campoQuantidade.value = item.quantidade;
            campoQuantidade.className = "campo-quantidade";
            campoQuantidade.setAttribute(
                "aria-label",
                `Quantidade de ${item.item}`
            );

            celulaQuantidade.appendChild(campoQuantidade);

            const celulaAcoes = document.createElement("td");
            const botaoSalvar = document.createElement("button");

            botaoSalvar.type = "button";
            botaoSalvar.textContent = "Salvar";
            botaoSalvar.className = "botao-salvar";

            botaoSalvar.addEventListener("click", async () => {
                await salvarQuantidade(
                    item.id,
                    campoQuantidade,
                    botaoSalvar
                );
            });

            celulaAcoes.appendChild(botaoSalvar);
            linha.append(celulaNome, celulaQuantidade, celulaAcoes);
            tabelaContabilidade.appendChild(linha);
        });
    } catch (erro) {
        console.error(erro);

        tabelaContabilidade.innerHTML = `
            <tr>
                <td colspan="3">Erro ao carregar os alimentos.</td>
            </tr>
        `;
    }
}

// ============================================================
// ARRECADAÇÃO: SALVAR QUANTIDADE NO BANCO DE DADOS
// ============================================================

async function salvarQuantidade(id, campo, botao) {
    const texto = campo.value.trim();
    const quantidade = Number(texto);

    if (
        texto === "" ||
        !Number.isInteger(quantidade) ||
        quantidade < 0
    ) {
        alert("Informe um número inteiro igual ou maior que zero.");
        campo.focus();
        return;
    }

    salvandoArrecadacao = true;
    botao.disabled = true;
    botao.textContent = "Salvando...";

    try {
        const resposta = await fetch(`/api/arrecadacao/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ quantidade })
        });

        const dados = await resposta.json().catch(() => ({}));

        if (resposta.status === 401) {
            window.location.href = "/login.html";
            return;
        }

        if (resposta.status === 403) {
            throw new Error("Apenas o líder pode alterar a arrecadação.");
        }

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível salvar a quantidade."
            );
        }

        campo.value = quantidade;
        alert(`Quantidade de ${campo.getAttribute("aria-label").replace("Quantidade de ", "")} salva com sucesso.`);
    } catch (erro) {
        console.error(erro);
        alert(erro.message || "Erro ao salvar a arrecadação.");
    } finally {
        salvandoArrecadacao = false;
        botao.disabled = false;
        botao.textContent = "Salvar";
    }
}

// ============================================================
// FORMATADORES
// ============================================================

function formatarTipo(tipo) {
    if (tipo === "administracao") return "Administração";
    if (tipo === "lider") return "Líder";
    return "Integrante";
}

function formatarTelefone(telefone) {
    const numeros = telefone.replace(/\D/g, "");

    if (numeros.length === 11) {
        return numeros.replace(
            /(\d{2})(\d{5})(\d{4})/,
            "($1) $2-$3"
        );
    }

    return telefone;
}

// ============================================================
// SAIR
// ============================================================

botaoSair.addEventListener("click", async function () {
    try {
        await fetch("/api/logout", { method: "POST" });
    } finally {
        window.location.href = "/login.html";
    }
});

// ============================================================
// INICIALIZAÇÃO
// ============================================================

(async function iniciar() {
    try {
        const autorizado = await verificarPermissao();

        if (!autorizado) return;

        await carregarIntegrantes();
        await carregarItens();
    } catch (erro) {
        console.error(erro);
        alert("Não foi possível iniciar a página de contabilidade.");
    }
})();
