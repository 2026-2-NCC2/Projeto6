# Comparação integral das árvores

Base main 24f169a. Referência alteraçõesMiguel 5d93188. Comparação por caminho, sem inferir renomeações. Foram encontrados 245 arquivos só na main, 10 só na referência e 22 modificados. A Entrega 1 é o alvo confirmado. A Entrega 2 também contém o servidor, mas possui outro ponto de entrada de estilos. Não há alterações em documentos/Site.

Nenhuma nova dependência de execução no manifesto de Miguel. Preservar chart.js, npm e o lock da main. Os scripts de pré-build do fórum e servidor estático da referência não substituem a API Express/MySQL. Preservar Store, login, serviços de eventos/favoritos/ingressos e rotas específicas de perfil. A referência usa dados locais para algumas notificações. Evitar mostrá-los como atividade da conta.

| Situação | Caminho | Decisão |
|---|---|---|
| Só main | `documentos/Banner.pdf` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/.gitignore` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/COMO-RODAR.md` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/README.md` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/VALIDACAO.md` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/package-lock.json` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/package.json` | Preservar da main |
| Só Miguel | `documentos/Entrega 1/FULL STACK/TrocaTicket/pnpm-lock.yaml` | Dispensar na integração |
| Só Miguel | `documentos/Entrega 1/FULL STACK/TrocaTicket/public/images/avatar-default.png` | Copiar (fallback utilizado pelo fórum da main) |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/reference/design.png` | Preservar da main |
| Só Miguel | `documentos/Entrega 1/FULL STACK/TrocaTicket/scripts/serve.mjs` | Dispensar na integração |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/server/.env.example` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/server/db.js` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/server/package-lock.json` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/server/package.json` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/server/server.js` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/server/uploads/.gitkeep` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/server/uploads/evento-2-1794210824436.jpg` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/server/uploads/foto-usuario-1-1794206182893.jpg` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/server/uploads/foto-usuario-2-1794200267201.jpg` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/server/uploads/foto-usuario-2-1794212940375.png` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/App.jsx` | Adaptar com base na main e no visual de Miguel |
| Só Miguel | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/access.css` | Copiar |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/DonutChart.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/EventCard.jsx` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/Events.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/Form.jsx` | Preservar da main |
| Só Miguel | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/Icon.jsx` | Copiar |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/Icons.jsx` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/Layout.jsx` | Adaptar com base na main e no visual de Miguel |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/Navbar.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/Pagination.jsx` | Preservar da main |
| Só Miguel | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/PapoBanner.jsx` | Copiar |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/UI.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/supplier/AvatarUpload.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/supplier/FilterSidebar.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/supplier/FormControls.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/supplier/Icon.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/supplier/InventoryTable.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/supplier/ItemDetail.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/supplier/ItemFormModal.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/supplier/OpportunityCard.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/supplier/PasswordSection.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/supplier/ProposalCard.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/supplier/QuoteParts.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/supplier/SearchToolbar.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/supplier/SummaryBar.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/components/supplier/common.jsx` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/context/Store.jsx` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/data/demo.js` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/data/reports.js` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/data/supplier.js` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/forms.css` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/home.css` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/main.jsx` | Adaptar com base na main e no visual de Miguel |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/moderation.css` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/pages/Account.jsx` | Adaptar com base na main e no visual de Miguel |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/pages/Admin.jsx` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/pages/ForumPage.jsx` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/pages/Home.jsx` | Adaptar com base na main e no visual de Miguel |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/pages/Moderation.jsx` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/pages/Organizer.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/pages/OrganizerHome.jsx` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/pages/Participant.jsx` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/pages/Profile.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/pages/ProfileAdmin.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/pages/Report.jsx` | Preservar da main |
| Só Miguel | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/pages/UserHome.jsx` | Adaptar |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/pages/supplier/SupplierHome.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/pages/supplier/SupplierInventory.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/pages/supplier/SupplierProfile.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/pages/supplier/SupplierProposals.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/pages/supplier/SupplierQuote.jsx` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/report.css` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/services/api.js` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/services/community.js` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/services/events.js` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/services/supplier.js` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/services/tickets.js` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/shared.css` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/styles.css` | Adaptar com base na main e no visual de Miguel |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/supplier.css` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/utils/csv.js` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/utils/format.js` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/utils/inventory.js` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/utils/masks.js` | Preservar da main |
| Só main | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/utils/validation.js` | Preservar da main |
| Divergente | `documentos/Entrega 1/FULL STACK/TrocaTicket/src/workspace.css` | Adaptar com base na main e no visual de Miguel |
| Só main | `documentos/Entrega 2/Calculo II/Entrega calculo II.PDF` | Preservar da main |
| Só main | `documentos/Entrega 2/Calculo II/Venha para a FECAP!.txt` | Preservar da main |
| Só Miguel | `documentos/Entrega 2/Disciplina 2/Venha para a FECAP!.txt` | Dispensar na integração |
| Só Miguel | `documentos/Entrega 2/Disciplina 3/Venha para a FECAP!.txt` | Dispensar na integração |
| Só Miguel | `documentos/Entrega 2/Disciplina 4/Venha para a FECAP!.txt` | Dispensar na integração |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/.gitignore` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/.prettierignore` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/.prettierrc.json` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/COMO-RODAR.md` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/README.md` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/VALIDACAO.md` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/.gitignore` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/README.md` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/docs/prototipos/01-pagina-principal.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/docs/prototipos/02-pagina-comunidade.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/docs/prototipos/03-detalhes-publicacao.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/docs/prototipos/04-criar-publicacao.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/index.html` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/package-lock.json` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/package.json` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/public/images/coldplay.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/public/images/lollapalooza.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/public/images/rock-in-rio.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/src/App.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/src/components/Common.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/src/components/Editor.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/src/components/Icon.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/src/components/Layout.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/src/components/PostCard.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/src/components/Widgets.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/src/data/forum.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/src/main.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/src/pages/Community.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/src/pages/CreatePost.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/src/pages/Home.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/src/pages/NotFound.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/src/pages/PostDetail.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/src/store/ForumContext.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/src/styles.css` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/src/utils/feed.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/src/utils/format.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/src/utils/markdown.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/forum/vite.config.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/index.html` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/package-lock.json` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/package.json` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/pnpm-workspace.yaml` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/data/events.json` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/forum/assets/index-Br-WzoBc.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/forum/assets/index-CQ6LEsWh.css` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/forum/images/coldplay.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/forum/images/lollapalooza.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/forum/images/rock-in-rio.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/forum/index.html` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-0.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-1.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-10.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-11.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-14.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-15.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-17.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-18.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-19.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-2.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-20.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-21.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-22.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-24.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-26.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-29.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-3.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-30.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-33.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-35.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-4.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-5.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-6.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/asset-7.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/coldplay.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/hero.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/logo.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/lollapalooza.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/public/images/rock-in-rio.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/design.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/01-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/02-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/03-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/04-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/05-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/06-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/07-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/08-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/09-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/10-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/11-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/12-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/13-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/14-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/15-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/16-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/17-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/18-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/19-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/20-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/reference/screens/21-0.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/server/.env.example` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/server/db.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/server/package-lock.json` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/server/package.json` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/server/server.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/server/uploads/.gitkeep` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/server/uploads/evento-2-1794210824436.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/server/uploads/foto-usuario-1-1794206182893.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/server/uploads/foto-usuario-2-1794200267201.jpg` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/server/uploads/foto-usuario-2-1794212940375.png` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/App.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/cards.css` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/DonutChart.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/EventCard.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/Events.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/Form.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/Icons.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/Layout.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/Navbar.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/Pagination.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/UI.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/supplier/AvatarUpload.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/supplier/FilterSidebar.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/supplier/FormControls.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/supplier/Icon.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/supplier/InventoryTable.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/supplier/ItemDetail.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/supplier/ItemFormModal.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/supplier/OpportunityCard.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/supplier/PasswordSection.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/supplier/ProposalCard.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/supplier/QuoteParts.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/supplier/SearchToolbar.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/supplier/SummaryBar.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/components/supplier/common.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/context/Store.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/data/demo.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/data/reports.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/data/supplier.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/forms.css` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/home.css` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/main.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/moderation.css` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/pages/Account.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/pages/Admin.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/pages/ForumPage.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/pages/Home.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/pages/Moderation.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/pages/Organizer.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/pages/OrganizerHome.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/pages/Participant.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/pages/Profile.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/pages/ProfileAdmin.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/pages/Report.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/pages/Supplier.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/pages/supplier/SupplierHome.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/pages/supplier/SupplierInventory.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/pages/supplier/SupplierProfile.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/pages/supplier/SupplierProposals.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/pages/supplier/SupplierQuote.jsx` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/report.css` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/services/api.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/services/community.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/services/events.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/services/supplier.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/services/tickets.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/shared.css` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/styles.css` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/supplier.css` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/utils/csv.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/utils/format.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/utils/inventory.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/utils/masks.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/utils/validation.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/src/workspace.css` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/TrocaTicket/vite.config.js` | Preservar da main |
| Só main | `documentos/Entrega 2/Full Stack/Venha para a FECAP!.txt` | Preservar da main |
| Só main | `documentos/Entrega 2/PROJETO INTERDISCIPLINAR PROGAMAÇÃO WEB/Projeto Extensão TicketBoom.docx` | Preservar da main |
| Só main | `documentos/Entrega 2/PROJETO INTERDISCIPLINAR PROGAMAÇÃO WEB/Venha para a FECAP!.txt` | Preservar da main |
| Só main | `documentos/Ficha de Declaracao Uso IA - FECAP Leo.pdf` | Preservar da main |
| Só main | `documentos/Ficha de Declaracao Uso IA - FECAP Tiago.heic` | Preservar da main |
| Só main | `documentos/Ficha de Declaração Uso IA_MiguelSanchez.pdf` | Preservar da main |
| Só main | `documentos/Ficha_de_Declaracao_Uso_IA_-_FECAP.pdf` | Preservar da main |
| Só main | `documentos/gabriel ficha de Declaracao Uso IA - FECAP.pdf` | Preservar da main |
