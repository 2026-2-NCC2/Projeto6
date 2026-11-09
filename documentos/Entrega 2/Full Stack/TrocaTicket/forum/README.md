# Fórum TrocaTicket — Front-end

Front-end do **Fórum da Comunidade TrocaTicket**, feito a partir dos protótipos em [`docs/prototipos`](docs/prototipos):

| Tela | Rota | Protótipo |
| --- | --- | --- |
| Página principal (feed) | `#/` | `01-pagina-principal.png` |
| Página da comunidade | `#/r/ShowsEFestivais` | `02-pagina-comunidade.png` |
| Detalhes da publicação | `#/r/ShowsEFestivais/post/8942` | `03-detalhes-publicacao.png` |
| Criar publicação | `#/criar?r=ShowsEFestivais` | `04-criar-publicacao.png` |

Stack: **React 19 + React Router 7 + Vite 7**, CSS puro e nenhuma outra dependência.

## Como rodar

Requer Node.js 22.12 ou mais recente.

```sh
cd "src/Entrega 2/Frontend/forum-trocaticket"
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # gera a pasta dist/ (pode ser publicada em qualquer hospedagem estática)
```

## O que funciona

- **Feed**: abas *Para você / Seguindo / Em alta / Recentes / Mais votados*, filtro por categoria, busca (atalho `Ctrl+K`), publicação oficial fixada, publicações salvas e minhas publicações.
- **Votos** (positivo/negativo) em publicações e comentários.
- **Comunidades**: seguir/deixar de seguir, abas *Publicações / Sobre / Dúvidas & Guias / Mídia*, ordenação, visão em cartões ou compacta, comunicado da moderação fixado, regras em acordeão e comunidades relacionadas.
- **Detalhes da publicação**: corpo em markdown, comentários com respostas aninhadas, recolher conversa, ordenar comentários, "carregar mais" e denúncia.
- **Criar publicação**: tipos Texto, Imagem (upload com arrastar e soltar), Link e Enquete; etiquetas; editor com barra de formatação e pré-visualização; validação (inclusive alerta caso o texto tenha um telefone, por causa da regra 4); rascunhos.
- Notificações, tema escuro, layout responsivo (menu lateral vira gaveta no celular) e toasts de confirmação.

## Dados

Ainda não existe backend para o fórum. Os dados de exemplo ficam em `src/data/forum.js` e tudo o que o usuário faz (votos, comentários, publicações, rascunhos, tema) é salvo no `localStorage` do navegador pelo `src/store/ForumContext.jsx`. Para integrar com uma API, basta trocar as funções desse contexto por chamadas HTTP; as telas não precisam mudar.

Para recomeçar do zero, limpe o `localStorage` do site (chave `forum-trocaticket:v1`).

## Estrutura

```
src/
  App.jsx                 rotas
  store/ForumContext.jsx  estado global + persistência
  data/forum.js           comunidades, publicações e comentários de exemplo
  components/             Layout (header, menu lateral, rodapé), cartões de post, widgets, editor, ícones
  pages/                  Home, Community, PostDetail, CreatePost, NotFound
  utils/                  formatação, ordenação/busca do feed, markdown seguro
```
