#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/compose.dev.yml"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-opencaster}"
HOST_PORT="${OPENCASTER_PORT:-3039}"

compose() {
  docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" "$@"
}

ensure_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "docker is required for local dev" >&2
    exit 1
  fi
}

ensure_port_available() {
  local listeners
  listeners="$(lsof -nP -tiTCP:"$HOST_PORT" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$listeners" ]]; then
    echo "port $HOST_PORT is already in use by PID(s): $listeners" >&2
    echo "stop the existing dev server first, or set OPENCASTER_PORT=<free-port>" >&2
    exit 1
  fi
}

start() {
  ensure_docker
  compose down --remove-orphans
  ensure_port_available
  compose up -d --build
  compose ps
  echo "Open http://127.0.0.1:$HOST_PORT"
}

stop() {
  ensure_docker
  compose down --remove-orphans
}

case "${1:-status}" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  restart)
    stop
    start
    ;;
  rebuild)
    ensure_docker
    compose build --no-cache
    ;;
  logs|log)
    ensure_docker
    compose logs -f --tail=120
    ;;
  status|ps)
    ensure_docker
    compose ps
    docker stats --no-stream "$(compose ps -q web)" 2>/dev/null || true
    ;;
  *)
    echo "usage: $0 {start|stop|restart|rebuild|logs|status}" >&2
    exit 1
    ;;
esac
