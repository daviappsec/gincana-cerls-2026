
"use strict";

const formulario = document.getElementById("formularioPontuacao");
const campoEquipe = document.getElementById("equipe");
const campoTipo = document.getElementById("tipoPontos");
const campoValor = document.getElementById("valor");
const pontosGanhos = document.getElementById("pontosGanhos");
const pontosPerdidos = document.getElementById("pontosPerdidos");
const totalLiquido = document.getElementById("totalLiquido");
const tabela = document.getElementById("tabelaPontuacao");
const mensagem = document.getElementById("mensagem");
const botaoSair = document.getElementById("botaoSair");

let equipes = [];

async function requisicaoJson(url, opcoes = {}) {
    const resposta = await fetch(url, {
        credentials: "same-origin",
        ...opcoes,
        headers: {
            "Content-Type": "application/json",
            ...(opcoes.headers || {})
        }
    });

    const tipoConteudo = resposta.headers.get("content-type") || "";

    if (!tipoConteudo.includes("application/json")) {
        if (resposta.status === 401) {
            window.location.href = "/login.html";
            throw new Error("Sessão encerrada. Entre novamente.");
        }

        if (resposta.status === 403) {
            window.location.href = "/acesso-negado.html";
            throw new Error("Você não tem permissão para acessar esta área.");
        }

        throw new Error("O servidor não retornou uma resposta JSON válida.");
    }

    const dados = await resposta.json();

    if (resposta.status === 401) {
        window.location.href = "/login.html";
        throw new Error(dados.erro || "Entre novamente.");
    }

    if (resposta.status === 403) {
        window.location.href = "/acesso-negado.html";
        throw new Error(dados.erro || "Acesso negado.");
    }

    if (!resposta.ok) {
        throw new Error(dados.erro || "Não foi possível concluir a operação.");
    }

    return dados;
}

function mostrarMensagem(texto, sucesso = false) {
    mensagem.textContent = texto;
    mensagem.className = sucesso
        ? "mensagem sucesso"
        : "mensagem erro";
}

function obterEquipeSelecionada() {
    return equipes.find(
        (equipe) => String(equipe.id) === campoEquipe.value
    );
}

function atualizarResumo() {
    const equipe = obterEquipeSelecionada();

    if (!equipe) {
        pontosGanhos.textContent = "—";
        pontosPerdidos.textContent = "—";
        totalLiquido.textContent = "—";
        return;
    }

    const ganhos = Number(equipe.pontos_ganhos) || 0;
    const perdidos = Number(equipe.pontos_perdidos) || 0;

    pontosGanhos.textContent = ganhos;
    pontosPerdidos.textContent = perdidos;
    totalLiquido.textContent = ganhos - perdidos;
}

function preencherSelecao() {
    campoEquipe.replaceChildren();

    const opcaoInicial = document.createElement("option");
    opcaoInicial.value = "";
    opcaoInicial.textContent = "Selecione uma equipe";
    campoEquipe.appendChild(opcaoInicial);

    equipes.forEach((equipe) => {
        const opcao = document.createElement("option");
        opcao.value = equipe.id;
        opcao.textContent = equipe.nome;
        campoEquipe.appendChild(opcao);
    });
}

function renderizarTabela() {
    tabela.replaceChildren();

    if (equipes.length === 0) {
        const linha = document.createElement("tr");
        const celula = document.createElement("td");
        celula.colSpan = 4;
        celula.textContent = "Nenhuma equipe encontrada.";
        linha.appendChild(celula);
        tabela.appendChild(linha);
        return;
    }

    equipes.forEach((equipe) => {
        const ganhos = Number(equipe.pontos_ganhos) || 0;
        const perdidos = Number(equipe.pontos_perdidos) || 0;

        const linha = document.createElement("tr");

        const valores = [
            equipe.nome,
            ganhos,
            perdidos,
            ganhos - perdidos
        ];

        valores.forEach((valor) => {
            const celula = document.createElement("td");
            celula.textContent = valor;
            linha.appendChild(celula);
        });

        tabela.appendChild(linha);
    });
}

async function carregarEquipes() {
    try {
        const dados = await requisicaoJson("/api/pontuacao");

        if (!Array.isArray(dados)) {
            throw new Error("O formato da lista de equipes é inválido.");
        }

        equipes = dados;
        preencherSelecao();
        renderizarTabela();
        atualizarResumo();
    } catch (erro) {
        if (erro.message) {
            mostrarMensagem(erro.message);
        }

        tabela.replaceChildren();

        const linha = document.createElement("tr");
        const celula = document.createElement("td");
        celula.colSpan = 4;
        celula.textContent = "Não foi possível carregar as pontuações.";
        linha.appendChild(celula);
        tabela.appendChild(linha);
    }
}

campoEquipe.addEventListener("change", () => {
    atualizarResumo();
    mostrarMensagem("");
});

campoTipo.addEventListener("change", () => {
    mostrarMensagem("");
});

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const id = campoEquipe.value;
    const tipo = campoTipo.value;
    const valorTexto = campoValor.value.trim();
    const valor = Number(valorTexto);

    if (!id) {
        mostrarMensagem("Selecione uma equipe.");
        return;
    }

    if (
        valorTexto === "" ||
        !Number.isSafeInteger(valor) ||
        valor < 0
    ) {
        mostrarMensagem("Informe um número inteiro igual ou maior que zero.");
        return;
    }

    const equipe = obterEquipeSelecionada();

    if (!equipe) {
        mostrarMensagem("A equipe selecionada não foi encontrada.");
        return;
    }

    const nomeTipo = tipo === "ganhos" ? "pontos ganhos" : "pontos perdidos";
    const confirmar = window.confirm(
        `Deseja substituir o total de ${nomeTipo} de "${equipe.nome}" por ${valor}?`
    );

    if (!confirmar) {
        return;
    }

    const botaoEnviar = formulario.querySelector('button[type="submit"]');
    botaoEnviar.disabled = true;
    botaoEnviar.textContent = "Salvando...";

    try {
        const resultado = await requisicaoJson(`/api/pontuacao/${id}`, {
            method: "PUT",
            body: JSON.stringify({ tipo, valor })
        });

        mostrarMensagem(resultado.mensagem || "Pontuação atualizada.", true);
        campoValor.value = "";

        await carregarEquipes();
        campoEquipe.value = id;
        atualizarResumo();
    } catch (erro) {
        mostrarMensagem(erro.message || "Erro ao salvar a pontuação.");
    } finally {
        botaoEnviar.disabled = false;
        botaoEnviar.textContent = "Salvar pontuação";
    }
});

botaoSair.addEventListener("click", async () => {
    botaoSair.disabled = true;

    try {
        await requisicaoJson("/api/logout", {
            method: "POST",
            body: JSON.stringify({})
        });

        window.location.href = "/login.html";
    } catch (erro) {
        window.location.href = "/login.html";
    }
});

async function iniciarPagina() {
    try {
        const sessao = await requisicaoJson("/api/me");

        if (!sessao.logado || sessao.usuario.tipo !== "administracao") {
            window.location.href = "/acesso-negado.html";
            return;
        }

        await carregarEquipes();
    } catch (erro) {
        if (erro.message) {
            mostrarMensagem(erro.message);
        }
    }
}

iniciarPagina();