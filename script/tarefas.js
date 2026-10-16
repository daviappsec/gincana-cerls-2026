
"use strict";

const formulario = document.getElementById("formularioTarefa");
const campoTarefa = document.getElementById("tarefa");
const mensagem = document.getElementById("mensagem");
const mensagemLista = document.getElementById("mensagemLista");
const botaoAdicionar = document.getElementById("botaoAdicionar");
const botaoSair = document.getElementById("botaoSair");
const botaoAtualizar = document.getElementById("botaoAtualizar");
const listaTarefas = document.getElementById("listaTarefas");

async function obterRespostaJson(resposta) {
    const tipoConteudo = resposta.headers.get("content-type") || "";

    if (!tipoConteudo.includes("application/json")) {
        throw new Error("O servidor devolveu uma resposta inesperada.");
    }

    return resposta.json();
}

async function verificarPermissao() {
    try {
        const resposta = await fetch("/api/me");

        if (resposta.status === 401) {
            window.location.href = "/login.html";
            return false;
        }

        const dados = await obterRespostaJson(resposta);

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível verificar o acesso."
            );
        }

        if (dados.usuario.tipo !== "administracao") {
            window.location.href = "/acesso-negado.html";
            return false;
        }

        return true;
    } catch (erro) {
        mensagem.textContent = erro.message;
        formulario.hidden = true;
        listaTarefas.innerHTML = "";
        mensagemLista.textContent = "Não foi possível verificar o acesso.";

        return false;
    }
}

async function carregarTarefas() {
    listaTarefas.replaceChildren();
    mensagemLista.textContent = "Carregando tarefas...";
    botaoAtualizar.disabled = true;

    try {
        const resposta = await fetch("/api/checklist");

        if (resposta.status === 401) {
            window.location.href = "/login.html";
            return;
        }

        const dados = await obterRespostaJson(resposta);

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível carregar as tarefas."
            );
        }

        if (!Array.isArray(dados)) {
            throw new Error("O servidor devolveu uma lista inválida.");
        }

        if (dados.length === 0) {
            mensagemLista.textContent = "Nenhuma tarefa cadastrada.";
            return;
        }

        mensagemLista.textContent = "";

        dados.forEach((tarefa) => {
            const item = document.createElement("li");
            item.className = "item-tarefa";

            const descricao = document.createElement("span");
            descricao.className = "descricao-tarefa";
            descricao.textContent = tarefa.tarefa;

            const botaoExcluir = document.createElement("button");
            botaoExcluir.type = "button";
            botaoExcluir.className = "botao-excluir";
            botaoExcluir.textContent = "Excluir";
            botaoExcluir.setAttribute(
                "aria-label",
                `Excluir tarefa: ${tarefa.tarefa}`
            );

            botaoExcluir.addEventListener("click", () => {
                excluirTarefa(tarefa.id, tarefa.tarefa, botaoExcluir);
            });

            item.append(descricao, botaoExcluir);
            listaTarefas.appendChild(item);
        });
    } catch (erro) {
        mensagemLista.textContent = erro.message;
    } finally {
        botaoAtualizar.disabled = false;
    }
}

async function excluirTarefa(id, descricao, botao) {
    const confirmar = window.confirm(
        `Tem certeza de que deseja excluir esta tarefa?\n\n"${descricao}"\n\nEssa ação não poderá ser desfeita.`
    );

    if (!confirmar) {
        return;
    }

    botao.disabled = true;
    mensagemLista.textContent = "Excluindo tarefa...";

    try {
        const resposta = await fetch(`/api/checklist/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });

        if (resposta.status === 401) {
            window.location.href = "/login.html";
            return;
        }

        if (resposta.status === 403) {
            window.location.href = "/acesso-negado.html";
            return;
        }

        const dados = await obterRespostaJson(resposta);

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível excluir a tarefa."
            );
        }

        mensagem.textContent = dados.mensagem || "Tarefa excluída.";
        await carregarTarefas();
    } catch (erro) {
        mensagemLista.textContent = erro.message;
        botao.disabled = false;
    }
}

formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    const tarefa = campoTarefa.value.trim();

    if (!tarefa) {
        mensagem.textContent = "Digite a descrição da tarefa.";
        return;
    }

    botaoAdicionar.disabled = true;
    mensagem.textContent = "Cadastrando tarefa...";

    try {
        const resposta = await fetch("/api/checklist", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ tarefa })
        });

        if (resposta.status === 401) {
            window.location.href = "/login.html";
            return;
        }

        if (resposta.status === 403) {
            window.location.href = "/acesso-negado.html";
            return;
        }

        const dados = await obterRespostaJson(resposta);

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível cadastrar a tarefa."
            );
        }

        formulario.reset();
        mensagem.textContent = "Tarefa cadastrada com sucesso.";

        await carregarTarefas();
    } catch (erro) {
        mensagem.textContent = erro.message;
    } finally {
        botaoAdicionar.disabled = false;
    }
});

botaoAtualizar.addEventListener("click", carregarTarefas);

botaoSair.addEventListener("click", async () => {
    botaoSair.disabled = true;

    try {
        await fetch("/api/logout", {
            method: "POST"
        });
    } catch (erro) {
        console.error("Erro ao encerrar sessão:", erro);
    }

    window.location.href = "/login.html";
});

async function iniciarPagina() {
    const autorizado = await verificarPermissao();

    if (autorizado) {
        await carregarTarefas();
    }
}

iniciarPagina();