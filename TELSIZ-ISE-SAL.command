#!/bin/bash
cd "$(dirname "$0")"
clear
echo "TELSİZ SERVER"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js tapılmadı. Bu, bir dəfəlik tələb olunur."
  echo "İndi yükləmə səhifəsi açılır - quraşdırdıqdan sonra bu fayla"
  echo "YENİDƏN iki dəfə klikləyin."
  open "https://nodejs.org/"
  read -p "Bağlamaq üçün Enter bas..."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "İlk dəfə hazırlanır, bir az gözləyin..."
  npm install --no-fund --no-audit
fi

( sleep 2 && open "http://localhost:3000/" ) &

echo ""
echo "TELSİZ işə düşür... Bu pəncərəni BAĞLAMAYIN."
echo ""
node server.js
