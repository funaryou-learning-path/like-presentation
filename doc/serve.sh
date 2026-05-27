#!/bin/bash
# doc/serve.sh — 開発サーバー起動スクリプト
#
# materials/ のファイル変更を自動検出し、ブラウザプレビューに反映します。
#
# 使い方:
#   bash serve.sh            # port=8080
#   bash serve.sh 3000       # port 指定

set -euo pipefail

PORT="${1:-8080}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  🚀 オールシェア(仮) 資料プレビューサーバー"
echo ""

# Node.js が使える場合
if command -v node &>/dev/null; then
  node "${SCRIPT_DIR}/serve.js" "${PORT}"
# Bun が使える場合
elif command -v bun &>/dev/null; then
  bun "${SCRIPT_DIR}/serve.js" "${PORT}"
else
  echo "エラー: Node.js も Bun も見つかりません。"
  echo "インストールしてから再度実行してください。"
  exit 1
fi
