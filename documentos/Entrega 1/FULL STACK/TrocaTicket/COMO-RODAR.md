# Como rodar o TrocaTicket (passo a passo)

## 1. Pré-requisito
Node.js 22.12 ou mais novo (https://nodejs.org). Para conferir, abra o terminal e rode:
    node -v

## 2. Extrair
Extraia o zip e abra a pasta **TrocaTicket**. Dentro dela devem estar, lado a lado:
index.html, package.json, public, src.

## 3. Abrir o terminal NESSA pasta
No Explorador de Arquivos, clique na barra de endereço da pasta TrocaTicket, digite `cmd` e aperte Enter.

## 4. Instalar e rodar
    npm install
    npm run dev

Abra no navegador: http://127.0.0.1:5173/
(Use esse endereço exato. Para parar o servidor: Ctrl + C.)

## 5. O que testar
Na tela inicial escolha um perfil e abra:
- Administrador: /admin (Home), /admin/relatorios/tim-maia (também lil-peep e michael), /admin/moderacao, /perfil
- Organizador: /organizador (Home), /organizador/eventos, /organizador/novo
- Fornecedor: /fornecedor
- Participante: /eventos, /perfil

Os dados são fictícios e ficam salvos só no navegador. Para recomeçar do zero, apague os dados do site (F12 > Application > Local Storage).

## Problemas comuns
- "Failed to load url /src/main.jsx": o terminal não está na pasta certa (ou o src está dentro de outra pasta). Repita o passo 3.
- Erro com "chart.js": rode `npm install` de novo na pasta certa.
