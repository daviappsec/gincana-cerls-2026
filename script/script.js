"use strict";

const menuBotao = document.getElementById("menuBotao");
const navegacao = document.getElementById("navegacao");

function fecharMenu() {
    if (!menuBotao || !navegacao) return;
    navegacao.classList.remove("ativo");
    menuBotao.setAttribute("aria-expanded", "false");
    menuBotao.setAttribute("aria-label", "Abrir menu");
}

if (menuBotao && navegacao) {
    menuBotao.addEventListener("click", function (event) {
        event.stopPropagation();
        const aberto = navegacao.classList.toggle("ativo");
        menuBotao.setAttribute("aria-expanded", String(aberto));
        menuBotao.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
    });

    document.addEventListener("click", function (event) {
        if (!navegacao.contains(event.target) && !menuBotao.contains(event.target)) {
            fecharMenu();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") fecharMenu();
    });

    navegacao.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", fecharMenu);
    });
}

async function carregarPlacar() {
    const corpo = document.getElementById("corpoPlacar");
    const aviso = document.getElementById("avisoPlacar");
    if (!corpo) return;

    try {
        const resposta = await fetch("/api/equipes");
        if (!resposta.ok) throw new Error("Não foi possível carregar o placar.");

        const equipes = await resposta.json();
        if (!Array.isArray(equipes) || equipes.length === 0) {
            corpo.innerHTML = '<tr><td colspan="5">Nenhuma equipe cadastrada.</td></tr>';
            if (aviso) aviso.textContent = "";
            return;
        }

        equipes.sort((a, b) =>
            (Number(b.pontos_ganhos || 0) - Number(b.pontos_perdidos || 0)) -
            (Number(a.pontos_ganhos || 0) - Number(a.pontos_perdidos || 0))
        );

        corpo.replaceChildren();
        equipes.forEach((equipe, indice) => {
            const linha = document.createElement("tr");
            const total = Number(equipe.pontos_ganhos || 0) - Number(equipe.pontos_perdidos || 0);
            [`${indice + 1}º`, equipe.nome || "Equipe",
                Number(equipe.pontos_ganhos || 0), Number(equipe.pontos_perdidos || 0), total
            ].forEach((valor) => {
                const celula = document.createElement("td");
                celula.textContent = String(valor);
                linha.appendChild(celula);
            });
            corpo.appendChild(linha);
        });
        if (aviso) aviso.textContent = "Placar atualizado.";
    } catch (erro) {
        corpo.innerHTML = '<tr><td colspan="5">Placar indisponível no momento.</td></tr>';
        if (aviso) aviso.textContent = "Verifique se o servidor está em execução para carregar a pontuação.";
    }
}

carregarPlacar();
