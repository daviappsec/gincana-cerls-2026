
"use strict";

const listaTarefas = document.getElementById("listaTarefas");
const mensagem = document.getElementById("mensagem");
const botaoSair = document.getElementById("sair");
const linkAdicionar = document.getElementById("linkAdicionar");
const linkContabilidade = document.getElementById("linkContabilidade");

async function obterJson(url, opcoes = {}) {
    const resposta = await fetch(url, opcoes);
    const tipoConteudo = resposta.headers.get("content-type") || "";

    if (resposta.status === 401) {
        window.location.href = "/login.html";
        throw new Error("Sua sessão terminou. Entre novamente.");
    }

    if (!tipoConteudo.includes("application/json")) {
        throw new Error("O servidor devolveu uma resposta inesperada.");
    }

    const dados = await resposta.json();

    if (!resposta.ok) {
        throw new Error(dados.erro || "Ocorreu um erro.");
    }

    return dados;
}

async function iniciarChecklist() {
    try {
        const usuario = await obterJson("/api/me");

        if (usuario.usuario.tipo === "administracao" && linkAdicionar) {
            linkAdicionar.hidden = false;
        }

        if (usuario.usuario.tipo === "lider" && linkContabilidade) {
            linkContabilidade.hidden = false;
        }

        await carregarTarefas();
    } catch (erro) {
        mensagem.textContent = erro.message;
    }
}

async function carregarTarefas() {
    mensagem.textContent = "Carregando tarefas...";
    listaTarefas.replaceChildren();

    try {
        const tarefas = await obterJson("/api/checklist");

        if (tarefas.length === 0) {
            mensagem.textContent = "Nenhuma tarefa cadastrada.";
            return;
        }

        mensagem.textContent = "";

        for (const tarefa of tarefas) {
            const item = document.createElement("li");
            item.textContent = tarefa.tarefa;
            listaTarefas.appendChild(item);
        }
    } catch (erro) {
        mensagem.textContent = erro.message;
    }
}

botaoSair.addEventListener("click", async () => {
    botaoSair.disabled = true;

    try {
        await fetch("/api/logout", { method: "POST" });
    } catch (erro) {
        console.error("Erro ao encerrar sessão:", erro);
    }

    window.location.href = "/login.html";
});

iniciarChecklist();