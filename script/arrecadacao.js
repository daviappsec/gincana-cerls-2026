
"use strict";

const tabela = document.getElementById("tabelaArrecadacao");
const mensagem = document.getElementById("mensagem");
const tipoAcesso = document.getElementById("tipoAcesso");
const cabecalhoAcoes = document.getElementById("cabecalhoAcoes");
const linkContabilidade = document.getElementById("linkContabilidade");
const botaoSair = document.getElementById("botaoSair");

let ehLider = false;
let salvando = false;

function mostrarMensagem(texto, erro = false) {
    mensagem.textContent = texto;
    mensagem.classList.toggle("erro", erro);
}

async function verificarUsuario() {
    const resposta = await fetch("/api/me");

    if (resposta.status === 401) {
        window.location.href = "/login.html";
        return false;
    }

    if (!resposta.ok) {
        throw new Error("Não foi possível verificar seu acesso.");
    }

    const dados = await resposta.json();

    if (!dados.logado || !dados.usuario) {
        window.location.href = "/login.html";
        return false;
    }

    ehLider = dados.usuario.tipo === "lider";

    if (linkContabilidade && ehLider) {
        linkContabilidade.hidden = false;
    }

    tipoAcesso.textContent = ehLider
        ? "Acesso de líder"
        : "Somente consulta";

    cabecalhoAcoes.hidden = !ehLider;

    return true;
}

async function carregarArrecadacao() {
    if (salvando) return;

    try {
        const resposta = await fetch("/api/arrecadacao");

        if (resposta.status === 401) {
            window.location.href = "/login.html";
            return;
        }

        if (!resposta.ok) {
            throw new Error("Não foi possível consultar a arrecadação.");
        }

        const itens = await resposta.json();

        // Não substitui a tabela enquanto o líder estiver editando um campo.
        if (document.activeElement?.classList.contains("campo-quantidade")) {
            return;
        }

        tabela.replaceChildren();

        if (!Array.isArray(itens) || itens.length === 0) {
            const linha = document.createElement("tr");
            const celula = document.createElement("td");

            celula.colSpan = ehLider ? 3 : 2;
            celula.className = "estado-vazio";
            celula.textContent = "Nenhum alimento cadastrado.";

            linha.appendChild(celula);
            tabela.appendChild(linha);
            return;
        }

        for (const item of itens) {
            const linha = document.createElement("tr");

            const celulaNome = document.createElement("td");
            celulaNome.textContent = item.item;

            const celulaQuantidade = document.createElement("td");

            if (ehLider) {
                const campo = document.createElement("input");

                campo.type = "number";
                campo.min = "0";
                campo.step = "1";
                campo.required = true;
                campo.inputMode = "numeric";
                campo.className = "campo-quantidade";
                campo.value = item.quantidade;
                campo.setAttribute(
                    "aria-label",
                    `Quantidade arrecadada de ${item.item}`
                );

                celulaQuantidade.appendChild(campo);

                const celulaAcoes = document.createElement("td");
                const botaoSalvar = document.createElement("button");

                botaoSalvar.type = "button";
                botaoSalvar.className = "botao-salvar";
                botaoSalvar.textContent = "Salvar";

                botaoSalvar.addEventListener("click", async () => {
                    await salvarQuantidade(item.id, campo, botaoSalvar);
                });

                celulaAcoes.appendChild(botaoSalvar);

                linha.append(celulaNome, celulaQuantidade, celulaAcoes);
            } else {
                celulaQuantidade.textContent = item.quantidade;
                linha.append(celulaNome, celulaQuantidade);
            }

            tabela.appendChild(linha);
        }

        mostrarMensagem("");
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
}

async function salvarQuantidade(id, campo, botao) {
    const valorTexto = campo.value.trim();
    const quantidade = Number(valorTexto);

    if (
        valorTexto === "" ||
        !Number.isInteger(quantidade) ||
        quantidade < 0
    ) {
        mostrarMensagem(
            "Informe uma quantidade inteira igual ou maior que zero.",
            true
        );
        campo.focus();
        return;
    }

    salvando = true;
    botao.disabled = true;
    botao.textContent = "Salvando...";
    mostrarMensagem("");

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
        mostrarMensagem("Quantidade salva com sucesso.");
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    } finally {
        salvando = false;
        botao.disabled = false;
        botao.textContent = "Salvar";
    }
}

async function iniciarPagina() {
    try {
        const autorizado = await verificarUsuario();

        if (!autorizado) return;

        await carregarArrecadacao();

        // Atualiza a consulta a cada 15 segundos.
        window.setInterval(carregarArrecadacao, 15000);
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
}

iniciarPagina();


if (botaoSair) {
    botaoSair.addEventListener("click", async () => {
        botaoSair.disabled = true;
        try {
            await fetch("/api/logout", { method: "POST" });
        } catch (erro) {
            console.error("Erro ao encerrar sessão:", erro);
        }
        window.location.href = "/login.html";
    });
}
