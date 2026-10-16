"use strict"

const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

const db = require("./database")

const ROOT = path.join(__dirname, "..")

const nomes = [
    "Kaiala V. S. J.",
    "Emanuelle M. S.",
    "Emanuele S. S.",
    "Ana C. S. J.",
    "Walisson R. S.",
    "João G. P. B.",
    "Geovanna S. A.",
    "Maria C. J. C.",
    "Alefe S. J. L.",
    "Brenda C. S. D. H.",
    "Pedro H. O. A.",
    "Anna K. S. D. S.",
    "Arthur S. N.",
    "Jennifer S. H.",
    "Sabrine C. S.",
    "Ludimilla S. S.",
    "Emerson C. C.",
    "Samya K. S. D.",
    "Hortência C. C.",
    "Samara J. V.",
    "Maria L. D. S. S.",
    "Eduarda S. A.",
    "Kethely S. S.",
    "Gilcimeire J. D.",
    "Moisés S. S.",
    "Daniely A. D. S.",
    "Istefane D. H. S.",
    "Marcele V. B. M.",
    "Bianca R. S. S.",
    "Ana C. A. D.",
    "Vitória S. D. S.",
    "Emily S. S. D.",
    "Stefanny D. P. B.",
    "Thayná S. D. S.",
    "Ullysses E. B. S.",
    "Maelly C. D. R.",
    "Rodrigo G. B.",
    "Reginaldo D. S. R.",
    "Hevyson C. M. S. J.",
    "Anderson C. S.",
    "Jeanderson G. D. N.",
    "Cristiele C. S.",
    "Reinã D.",
    "Danielle F. S.",
    "Gabriel J. S.",
    "Suele R. S.",
    "Raquele M. S. J.",
    "Maria E. S. L.",
    "Mirelly S. C.",
    "Marcella S. D. S.",
    "Jevson D. S. D.",
    "Daniel A. C.",
    "Hamilla D. S. S.",
    "Nilvan C. B. F.",
    "Adriel L. C. S.",
    "Luiza S. A.",
    "Cleiton S. D. S.",
    "Larissa J. D. S.",
    "Rafaelly D.",
    "Julia S. A.",
    "Rhuan H. V. S.",
    "Vitória B. S.",
    "Stephanie S. S.",
    "Eloá C. J. S.",
    "Janderson C. S. S.",
    "Sthefany L. S.",
    "Raissa S. S.",
    "Cauã D. S. S.",
    "Dhemily S.",
    "Kauane S. L.",
    "Raine D. S.",
    "Raiana D. S.",
    "Camila S. T.",
    "Uanderson O. S.",
    "Phyetro A.",
    "Joab S. B. J.",
    "João M. S. V.",
    "Wallace C. S.",
    "Elisangela S. S.",
    "Aisla S. S.",
    "Flaviane C. S.",
    "Evane L. B.",
    "Raquel D. S. S.",
    "Filipe C. C.",
    "Livia B. O.",
    "Eloísa S. M.",
    "Kaiala D. S. C.",
    "Italo T.",
    "Raquel O. S.",
    "Taielle S. S.",
    "Daniel M. V.",
    "Sabrina S. B.",
    "Luiz F. S. A.",
    "Kauan T. S. D.",
    "Thailon V. S. S.",
    "João V. P. S.",
    "Vitória S. S.",
    "Arthur S. L.",
    "Keiciane N. S.",
    "Maievelin J. S.",
    "Luiza D. S. A.",
    "Maria I. V. L.",
    "Ana L. D. O. S.",
    "Daielly V. D. J. C.",
    "Thawã A. D. S.",
    "Carlos H. S. N.",
    "Maria E. S. S.",
    "Rosielle D. S. G.",
    "Vinicius C. S.",
    "Kamila B. S. M.",
    "Thalles S. D. C.",
    "Pedro H. S. B.",
    "Luiz H. C. C.",
    "João V. S. S.",
    "Breno H. S. M.",
    "Alisson A. S.",
    "Egilane S. H.",
    "Alana J. A.",
    "David B. L.",
    "Iamara D. O. N.",
    "Kaemilly D. S. S.",
    "Aiça C. S.",
    "Marcus V. J. S.",
    "Raquel S. D. S.",
    "Anna S. D. J. S.",
    "Raevely J. D. S.",
    "Marilia S. S.",
    "Isabelly V.",
    "Natiele D. L.",
    "Cailane S. C.",
    "Geisiane D. J. S.",
    "Bianca L. S. V.",
    "Samira D. S. S.",
    "Arthur V. D. C.",
    "Daniele D. S. B.",
    "Jerfson S. S.",
    "Cleiton M. S. D. S.",
    "Davi C. D. J.",
    "Thauanna C. S.",
    "Hiago A.",
    "Ravick S.",
    "Graziele N. D.S",
    "João V. C. D.S",
    "Paulo C. M"
]


/*
    Gera um código aleatório no formato:

    U7K4-P9XM

    São utilizados números e letras maiúsculas.
*/

function gerarCodigo() {

    const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

    let codigo = ""

    for (let i = 0; i < 8; i++) {

        const indice = crypto.randomInt(0, caracteres.length)

        codigo += caracteres[indice]
    }

    return codigo.slice(0, 4) + "-" + codigo.slice(4)
}


/*
    Verifica se o código já existe no banco.
*/

function codigoExiste(codigo) {

    const resultado = db.prepare(`
        SELECT id
        FROM integrantes
        WHERE codigo = ?
    `).get(codigo)

    return Boolean(resultado)
}


/*
    Gera um código que ainda não existe.
*/

function gerarCodigoUnico() {

    let codigo

    do {

        codigo = gerarCodigo()

    } while (codigoExiste(codigo))

    return codigo
}


/*
    Normaliza espaços do nome.
*/

function normalizarNome(nome) {

    return nome
        .trim()
        .replace(/\s+/g, " ")
}


/*
    Escapa valores para CSV.
*/

function escaparCSV(valor) {

    return `"${String(valor).replace(/"/g, '""')}"`
}


/*
    Busca integrante pelo nome ignorando
    diferenças entre maiúsculas/minúsculas.
*/

function buscarIntegrante(nome) {

    return db.prepare(`
        SELECT id, nome, codigo, tipo, ativo
        FROM integrantes
        WHERE nome COLLATE NOCASE = ?
    `).get(nome)
}


/*
    Lista final que será utilizada para gerar
    o arquivo CSV.
*/

const resultadoCSV = [
    [
        "Nome",
        "Código",
        "Tipo",
        "Status"
    ]
]


let cadastrados = 0
let jaExistentes = 0
let erros = 0


console.log("")
console.log("==============================================")
console.log(" CADASTRO DOS INTEGRANTES")
console.log("==============================================")
console.log("")
console.log(`Quantidade recebida: ${nomes.length}`)
console.log("")


for (const nomeOriginal of nomes) {

    const nome = normalizarNome(nomeOriginal)

    try {

        /*
            Se o nome já estiver cadastrado,
            não cria outro código.
        */

        const existente = buscarIntegrante(nome)

        if (existente) {

            console.log(`[JÁ EXISTE] ${existente.nome}`)

            resultadoCSV.push([
                existente.nome,
                existente.codigo,
                existente.tipo,
                "Já cadastrado"
            ])

            jaExistentes++

            continue
        }


        /*
            Gera um novo código único.
        */

        const codigo = gerarCodigoUnico()


        /*
            Todos os nomes dessa lista entram
            como integrantes normais.
        */

        db.prepare(`
            INSERT INTO integrantes
            (nome, codigo, tipo, ativo)
            VALUES (?, ?, 'integrante', 1)
        `).run(
            nome,
            codigo
        )


        console.log(`[CADASTRADO] ${nome} -> ${codigo}`)


        resultadoCSV.push([
            nome,
            codigo,
            "integrante",
            "Novo cadastro"
        ])


        cadastrados++

    } catch (erro) {

        console.error(`[ERRO] ${nome}`)
        console.error(erro.message)

        resultadoCSV.push([
            nome,
            "",
            "integrante",
            "ERRO"
        ])

        erros++
    }
}


/*
    Cria o arquivo CSV no diretório principal
    do projeto.
*/

const caminhoCSV = path.join(
    ROOT,
    "acessos-integrantes.csv"
)


const conteudoCSV = resultadoCSV
    .map(linha => linha.map(escaparCSV).join(","))
    .join("\n")


fs.writeFileSync(
    caminhoCSV,
    "\uFEFF" + conteudoCSV,
    "utf8"
)


console.log("")
console.log("==============================================")
console.log(" CADASTRO FINALIZADO")
console.log("==============================================")
console.log("")
console.log(`Novos integrantes: ${cadastrados}`)
console.log(`Já cadastrados:    ${jaExistentes}`)
console.log(`Erros:             ${erros}`)
console.log("")
console.log("Arquivo gerado:")
console.log(caminhoCSV)
console.log("")
console.log("IMPORTANTE:")
console.log("O arquivo acessos-integrantes.csv contém os códigos.")
console.log("Não envie esse arquivo para os integrantes.")
console.log("")
console.log("==============================================")
console.log("")