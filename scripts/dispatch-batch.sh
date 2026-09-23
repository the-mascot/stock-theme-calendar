#!/bin/sh
# Lightsail 크론이 부르는 트리거. GitHub의 schedule은 개인 repo에서 4~6시간씩 밀려서
# (2026-09-21~22 실측) 정시 실행을 서버 크론에 맡기고, 여기선 workflow_dispatch만 던진다.
# 실제 배치는 같은 서버의 self-hosted 러너가 받아서 돌리므로 토스 키는 GitHub Secrets에만 둔다.
#
# 토큰: fine-grained PAT, 이 repo만 · Actions: Read and write. 파일 권한 600.
set -eu

TOKEN_FILE="${TOKEN_FILE:-$HOME/.config/stock-theme-calendar/gh-token}"
REPO="the-mascot/stock-theme-calendar"

# 성공하면 204에 본문 없음. 실패하면 curl -f가 비0으로 끝나 크론 로그에 남는다.
curl -fsS -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $(cat "$TOKEN_FILE")" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/$REPO/actions/workflows/daily-batch.yml/dispatches" \
  -d '{"ref":"master"}'

echo "$(TZ=Asia/Seoul date +'%Y-%m-%d %H:%M:%S') dispatched"
