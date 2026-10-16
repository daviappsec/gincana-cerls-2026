
"use strict";

const formLogin = document.getElementById("formLogin");
const mensagem = document.getElementById("mensagem");

formLogin.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const codigo = document.getElementById("codigo").value.trim();

    mensagem.textContent = "";

    if (!nome || !codigo) {
        mensagem.textContent = "Preencha todos os campos.";
        return;
    }

    try {
        const resposta = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ nome, codigo })
        });

        const tipoConteudo = resposta.headers.get("content-type") || "";

        if (!tipoConteudo.includes("application/json")) {
            throw new Error("O servidor devolveu uma resposta inesperada.");
        }

        const dados = await resposta.json();

        if (!resposta.ok) {
            mensagem.textContent = dados.erro || "Não foi possível entrar.";
            return;
        }

        switch (dados.usuario.tipo) {
            case "lider":
                window.location.href = "/admin/contabilidade.html";
                break;

            case "administracao":
                window.location.href = "/admin/tarefas.html";
                break;

            case "integrante":
                window.location.href = "/privado/checklist.html";
                break;

            default:
                mensagem.textContent = "Tipo de usuário desconhecido.";
        }
    } catch (erro) {
        console.error(erro);
        mensagem.textContent =
            erro.message || "Não foi possível conectar ao servidor.";
    }
});