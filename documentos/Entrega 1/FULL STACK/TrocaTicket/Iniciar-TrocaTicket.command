#!/bin/bash
# Abre a API e o site do TrocaTicket (Entrega 1) no Mac. Para refazer a conexão do MySQL,
# rode no Terminal: ./Iniciar-TrocaTicket.command configurar
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Instale o Node.js 22.12 ou mais novo (https://nodejs.org) e abra este arquivo de novo."
  read -r -p "Pressione Enter para fechar."
  exit 1
fi
node scripts/iniciar.mjs "$@"
status=$?
if [ $status -ne 0 ]; then read -r -p "Pressione Enter para fechar."; fi
exit $status
