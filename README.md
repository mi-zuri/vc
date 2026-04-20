# Obecność

Platforma łączenia wolontariuszy z samotnymi seniorami dla
Stowarzyszenia **mali bracia Ubogich (mbU)**.

Produkcja: https://mi.zur-i.com

---

## Quickstart

**Wymagania:** Docker, Node 20+, Git, `make`.

```bash
git clone git@github.com:mi-zuri/vc.git
cd vc
make setup            # 1x: kopiuje .env, instaluje deps, wstaje backend+db
make dev-frontend     # Vite dev server na :5173
```

Potem http://localhost:5173.

Jak chcesz jedno polecenie dla wszystkiego:

```bash
make dev              # backend+db w tle, frontend na pierwszym planie
```

Lista wszystkich komend: `make help`.

---

## Architektura — skrót

```
frontend (Vite, :5173)  ──fetch('/api/*')──→  backend (Express, :3001)
                                                       │
                                                       ▼
                                              Postgres 16 (w Dockerze)
```

- **Frontend** — React 18 + React Router, `frontend/src/`
- **Backend** — Express + `pg`, `backend/src/index.js`
- **Baza** — Postgres 16 w Dockerze, schema w `backend/src/schema.sql`,
  dane seedowe w `backend/src/seeds/`
- **Produkcja** — Nginx serwuje zbudowany frontend + reverse proxy na backend,
  CI/CD przez GitHub Actions na push do `main`

Pełny opis: [`docs/jak-zbudowalismy.md`](docs/jak-zbudowalismy.md).

---

## Porty

| Port | Co | Kiedy |
|---|---|---|
| 5173 | Vite dev server (frontend) | dev |
| 3001 | Backend API (Docker) | dev + prod-like |
| 5432 | Postgres | wewnątrz sieci Dockera, nie wystawiony |

W **dev** Vite proxy'uje `/api/*` → `localhost:3001`, więc w kodzie piszesz
`fetch('/api/seniors')` i działa tak samo jak w produkcji.

---

## Częste operacje

```bash
make health           # czy backend żyje? (curl /health)
make logs             # logi backendu (Ctrl+C wychodzi)
make restart-backend  # podmień kod backendu bez resetu bazy
make reset-db         # wyzeruj bazę i przeładuj seeds (UWAGA: kasuje dane)
make down             # zatrzymaj backend+db (frontend zamknij Ctrl+C)
make build-frontend   # zbuduj prod dist/ (smoke test przed deployem)
make clean            # wyczyść wszystko (node_modules, volume bazy)
```

### Zmiana schema bazy

1. Edytuj `backend/src/schema.sql` (używamy `CREATE TABLE IF NOT EXISTS`).
2. Dla zmian nie-addytywnych (rename kolumny, DROP): `make reset-db`.
3. Pamiętaj że produkcja nie ma migracji — zmiana schemy wymaga koordynacji.

### Dodanie endpointu

Wszystkie endpointy w `backend/src/index.js`. Backend chodzi z `node --watch`
(w `npm run dev`) — sam zrestartuje się po zapisie pliku. W Compose zapis
pliku **nie** restartuje kontenera; użyj `make restart-backend` albo dev-uj
backend lokalnie (nie w Dockerze).

### Dodanie strony

1. Utwórz `frontend/src/pages/NazwaStrony.jsx`.
2. Dodaj route w `frontend/src/App.jsx`.
3. Vite HMR podmieni na żywo, F5 nie potrzebne.

---

## Troubleshooting

| Symptom | Prawdopodobna przyczyna | Fix |
|---|---|---|
| `make setup` — "port is already allocated" | coś słucha na 3001 | `lsof -i :3001` i ubij; albo `make down` |
| Frontend pokazuje błąd CORS | pominąłeś proxy w vite.config.js | sprawdź że `/api` jest w `server.proxy` |
| Frontend wyświetla 404 po F5 na `/dashboard` | to dev server Vite — działa OK; bug byłby w prod (sprawdź `try_files` w nginx.conf) | — |
| Backend crashuje z `ECONNREFUSED ::1:5432` | Postgres jeszcze nie wstał | `make logs`, czekaj na `pg_isready` |
| Pusta lista seniorów w `/seniorzy-czekajacy` | seeds nie załadowały się (pusta baza była OK w momencie seedowania, ale nie ma rekordów) | `make reset-db` |
| `make health` zwraca `✗ backend nie odpowiada` | kontener padł | `docker compose ps`, `make logs` |
| Node X.Y — wymagany 20+ | stara wersja Node | `nvm use` (repo ma `.nvmrc`) |

---

## Deploy

Automatyczny: `git push origin main` → GitHub Actions SSH-uje na EC2 i
deployuje (~26s). Workflow: `.github/workflows/deploy.yml`.

Status deployu: `gh run watch`.

---

## Struktura

```
vc/
├── Makefile                    # orkiestracja dev
├── docker-compose.yml          # backend + db
├── nginx.conf                  # referencja prod (żyje na serwerze)
├── .env.example                # szablon zmiennych środowiskowych
├── .nvmrc                      # wymusza Node 20
│
├── .github/workflows/
│   └── deploy.yml              # CI/CD
│
├── backend/
│   ├── Dockerfile
│   └── src/
│       ├── index.js            # endpointy API
│       ├── db.js               # pool + seed
│       ├── schema.sql          # tabele
│       └── seeds/              # dane startowe (seniorzy, inspiracje)
│
├── frontend/
│   ├── vite.config.js          # proxy /api w dev
│   ├── public/poland.svg       # mapa do LonelinessMap
│   └── src/
│       ├── pages/              # Landing, Register, SeniorList, Waiting, Dashboard
│       ├── components/         # Layout, LonelinessMap
│       └── index.css           # design system
│
└── docs/
    └── jak-zbudowalismy.md     # poradnik od zera
```

---

## Licencja i kontakt

Projekt dla mbU, kontakt: michal.zurawski02@gmail.com.
