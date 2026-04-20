# Obecność — dev workflow
# Uruchom `make help` żeby zobaczyć wszystkie targety.

.PHONY: help setup dev dev-backend dev-frontend up down logs restart-backend \
        reset-db health build-frontend clean check-tools

# ── pomoc ──────────────────────────────────────────────────────────────
help:
	@echo "Obecność — dostępne komendy:"
	@echo ""
	@echo "  make setup            Pierwsze uruchomienie (env, deps, baza)"
	@echo "  make dev              Odpal wszystko (backend+db w tle, frontend na pierwszym planie)"
	@echo "  make dev-backend      Tylko backend+db (Docker)"
	@echo "  make dev-frontend     Tylko Vite dev server"
	@echo ""
	@echo "  make up               Backend+db w tle"
	@echo "  make down             Zatrzymaj backend+db"
	@echo "  make restart-backend  Podmień kod backendu bez restartu bazy"
	@echo "  make logs             Pokaż logi backendu (Ctrl+C żeby wyjść)"
	@echo ""
	@echo "  make health           Curl na /health — czy backend żyje"
	@echo "  make reset-db         Skasuj i odtwórz bazę (UWAGA: tracisz dane)"
	@echo "  make build-frontend   Zbuduj frontend produkcyjnie (dist/)"
	@echo "  make clean            Wyczyść node_modules, dist, volume bazy"

# ── setup ──────────────────────────────────────────────────────────────
setup: check-tools .env
	@echo "→ instaluję frontend deps…"
	@cd frontend && npm install
	@echo "→ startuję backend+db…"
	@docker compose up -d --build
	@echo ""
	@echo "✓ gotowe. Odpal:  make dev-frontend"

.env:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "→ utworzyłem .env z .env.example"; \
	fi

check-tools:
	@command -v docker >/dev/null 2>&1 || { echo "✗ brak docker"; exit 1; }
	@command -v node >/dev/null 2>&1 || { echo "✗ brak node"; exit 1; }
	@node -e 'const [major] = process.versions.node.split("."); if (+major < 20) { console.error("✗ Node " + process.versions.node + " — wymagany 20+"); process.exit(1); }'
	@echo "✓ docker + node 20+"

# ── dev ────────────────────────────────────────────────────────────────
dev: up dev-frontend

dev-backend: up
	@docker compose logs -f backend

dev-frontend:
	@cd frontend && npm run dev

up:
	@docker compose up -d
	@echo "✓ backend: http://localhost:3001  |  baza: localhost:5432 (wewnątrz sieci docker)"

down:
	@docker compose down

restart-backend:
	@docker compose up -d --build backend

logs:
	@docker compose logs -f backend

# ── debug ──────────────────────────────────────────────────────────────
health:
	@curl -s http://localhost:3001/health && echo "" || echo "✗ backend nie odpowiada (make up?)"

reset-db:
	@echo "UWAGA: kasuję bazę i jej dane. Ctrl+C żeby anulować, Enter żeby potwierdzić."
	@read _
	@docker compose down -v
	@docker compose up -d --build
	@echo "✓ świeża baza, seeds przeładowane"

# ── build ──────────────────────────────────────────────────────────────
build-frontend:
	@cd frontend && npm install && npm run build
	@echo "✓ frontend/dist/ gotowe do deployu"

clean:
	@rm -rf frontend/node_modules frontend/dist backend/node_modules
	@docker compose down -v
	@echo "✓ wyczyszczone"
