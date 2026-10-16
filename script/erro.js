
"use strict";

const botaoSair = document.getElementById("sair");

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