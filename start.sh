#!/bin/bash
# Doc Flow - 一键启动脚本
# 启动 PostgreSQL, Redis, 后端, 前端

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

cleanup() {
    info "正在停止服务..."
    [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null && info "后端已停止"
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && info "前端已停止"
    exit 0
}
trap cleanup SIGINT SIGTERM

# ─── 1. PostgreSQL ────────────────────────────────────────────

info "检查 PostgreSQL..."
if command -v pg_isready &>/dev/null && pg_isready -q 2>/dev/null; then
    info "PostgreSQL 已在运行"
elif brew services list 2>/dev/null | grep -q "postgresql.*started"; then
    info "PostgreSQL 已通过 Homebrew 启动"
else
    warn "PostgreSQL 未运行，尝试启动..."
    if command -v brew &>/dev/null; then
        brew services start postgresql@16 2>/dev/null || brew services start postgresql@15 2>/dev/null || true
    fi
    # 等待启动
    for i in {1..10}; do
        if command -v pg_isready &>/dev/null && pg_isready -q 2>/dev/null; then
            info "PostgreSQL 已启动"
            break
        fi
        sleep 1
    done
fi

# 确保 postgres 角色存在
if command -v psql &>/dev/null; then
    psql -U postgres -c "SELECT 1" &>/dev/null || {
        warn "postgres 角色不存在，尝试创建..."
        PG_BIN=$(find /usr/local /opt/homebrew -name "psql" -type f 2>/dev/null | head -1)
        if [ -n "$PG_BIN" ]; then
            CURRENT_USER=$(whoami)
            "$PG_BIN" -U "$CURRENT_USER" -d postgres -c "CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';" 2>/dev/null || true
        fi
    }
fi

# ─── 2. Redis ─────────────────────────────────────────────────

info "检查 Redis..."
if redis-cli ping 2>/dev/null | grep -q PONG; then
    info "Redis 已在运行"
elif brew services list 2>/dev/null | grep -q "redis.*started"; then
    info "Redis 已通过 Homebrew 启动"
else
    warn "Redis 未运行，尝试启动..."
    if command -v brew &>/dev/null; then
        brew services start redis 2>/dev/null || true
    fi
    for i in {1..5}; do
        if redis-cli ping 2>/dev/null | grep -q PONG; then
            info "Redis 已启动"
            break
        fi
        sleep 1
    done
fi

# ─── 3. 后端 ──────────────────────────────────────────────────

info "启动后端 (uvicorn, port 8000)..."
cd "$BACKEND_DIR"
if [ ! -f ".env" ]; then
    warn ".env 文件不存在，从 .env.example 复制..."
    [ -f ".env.example" ] && cp .env.example .env
fi

# 安装依赖（如果缺少）
pip install -q -r requirements.txt 2>/dev/null || true
pip install -q -r "$PROJECT_DIR/engine/requirements.txt" 2>/dev/null || true

uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
sleep 2

# 验证后端
if curl -s http://localhost:8000/api/health | grep -q "ok"; then
    info "后端已启动 (PID: $BACKEND_PID)"
else
    warn "后端可能尚未就绪，请稍后检查 http://localhost:8000/api/health"
fi

# ─── 4. 前端 ──────────────────────────────────────────────────

info "启动前端 (Vite, port 5173)..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    info "安装前端依赖..."
    npm install
fi

npx vite --host &
FRONTEND_PID=$!

info "─────────────────────────────────────────"
info "  前端:  http://localhost:5173"
info "  后端:  http://localhost:8000"
info "  API:   http://localhost:8000/api/docs"
info "─────────────────────────────────────────"
info "按 Ctrl+C 停止所有服务"

# 等待子进程
wait
