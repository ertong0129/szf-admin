node --version >/dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "Need Node.js to start the local server."
  exit 1
fi
cd "$(dirname "$0")/game"
echo "open http://127.0.0.1:8088/"
exec node server.js
