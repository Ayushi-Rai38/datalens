# DataLens

DataLens is a web platform that turns a raw CSV/Excel upload into an automated, explainable data-quality
and statistical analysis report — the kind of first-pass EDA a data scientist normally does by hand in a
notebook, but delivered as a proper multi-user web product with history and comparison over time.

This project was built as a portfolio piece for SDE/Software Engineer roles, by a Data Science background
candidate. The goal was not to build the fanciest model, but to demonstrate that a data-processing workflow
can be engineered into a real, testable, deployable product: layered architecture, authentication, a real
relational schema, caching with invalidation, and CI — without reaching for infrastructure the project
doesn't actually need.

## What it does

1. A user registers and logs in (JWT access + refresh tokens).
2. They upload a CSV or Excel file. It's validated immediately — parsed, checked for structure, and
   profiled column-by-column (type, missingness, cardinality).
3. On demand, they run a full analysis: numerical/categorical statistics, IQR-based outlier detection,
   Pearson correlation between numeric columns, and an explainable 0–100 data-quality score.
4. Every analysis run is stored as an immutable report. Users can revisit past reports, re-run analysis,
   browse history, and compare any two reports to see whether quality improved or regressed.
5. The dashboard renders all of this as charts and tables — not a wall of JSON.

## Architecture

```
React (TS) Frontend
        |
FastAPI Routes            (HTTP, auth, request/response schemas)
        |
Service Layer             (business rules, orchestration)
        |
   /            \
Processing        Repository Layer
Layer              (SQLAlchemy queries)
(pure pandas,           |
no FastAPI/DB      PostgreSQL / Redis / Local file storage
imports)
```

This is a deliberately **layered monolith**, not microservices. A single FastAPI process handles auth,
uploads, and analysis; Postgres, Redis, and the file storage are separate processes but not separate
*services* in the distributed-systems sense. For a single-user-facing analytics tool with no independent
scaling requirements between components, splitting this into services would add operational overhead
(service discovery, network calls, distributed tracing) without a corresponding benefit — the classic
"microservices too early" trap. Kafka, Kubernetes, and message queues aren't used for the same reason:
there's no multi-consumer event stream or need for horizontal pod scaling here.

The one architectural rule enforced throughout: **the processing layer (`app/processing/`) never imports
FastAPI or SQLAlchemy.** It's pure functions over pandas DataFrames in, plain dicts out. That's what lets
the entire data-quality engine be unit tested with in-memory DataFrames, with no database or HTTP layer
involved — and it's what would let this logic be lifted into a batch job or notebook unchanged if the
product ever needed that.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + TypeScript + Vite + Tailwind + Recharts | Fast dev loop, typed API contracts, no CSS framework lock-in |
| Backend | FastAPI + Pydantic | Async-capable, automatic OpenAPI docs, strong typing at the boundary |
| ORM | SQLAlchemy 2.0 (typed `Mapped[]` style) | Modern typed models, explicit relationships/cascades |
| Database | PostgreSQL + Alembic | JSONB for variable-shaped analysis output; real migrations, not `create_all()` |
| Data processing | pandas / numpy / scipy | Standard, well-understood, exactly what the profiling/stats work needs |
| Cache | Redis | Analysis reports are read far more than they're written — perfect cache-aside candidate |
| Auth | JWT (access + refresh), bcrypt | Stateless auth, no server-side session store needed |
| Tests | pytest, FastAPI TestClient, Vitest | Unit tests on pure processing logic + integration tests through the real API |
| Infra | Docker Compose, GitHub Actions | Reproducible local run, CI gate on every PR |

## Database design

- **users** — account + credentials.
- **datasets** — one row per uploaded file: ownership, storage path, validation status, shape.
- **dataset_columns** — per-column profiling metadata (type, missingness, cardinality), one row per column,
  refreshed on each (re-)validation.
- **quality_reports** — one immutable row per analysis run. Profiling/stats/outliers/correlation are stored
  as **JSONB** because their shape depends entirely on the uploaded dataset's columns — a rigid relational
  schema would need a table per possible statistic. JSONB keeps this queryable (Postgres can index/query
  into it) without forcing every dataset shape into the same fixed columns.
- **analysis_history** — a lightweight audit log of every analysis attempt (including failures), separate
  from the (larger) report payload, so history/auditing queries don't have to pull JSONB blobs.

All child tables cascade-delete from their parent (deleting a user deletes their datasets; deleting a
dataset deletes its columns and reports).

## API overview

All routes are versioned under `/api/v1`. Full interactive docs at `/docs` (Swagger UI, generated by FastAPI).

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me

POST   /api/v1/datasets                        (multipart upload)
GET    /api/v1/datasets                         ?page&page_size&search&status
GET    /api/v1/datasets/{id}
DELETE /api/v1/datasets/{id}
GET    /api/v1/datasets/{id}/columns
GET    /api/v1/datasets/{id}/preview            ?limit

POST   /api/v1/analysis/{dataset_id}/run
GET    /api/v1/analysis/{dataset_id}/latest      (Redis cache-aside)
GET    /api/v1/analysis/{dataset_id}/history     ?page&page_size
GET    /api/v1/analysis/reports/compare          ?report_a&report_b

GET    /api/v1/health
```

Every dataset/analysis route enforces ownership — a user can only see datasets and reports where
`owner_id` matches their token's subject; unauthorized access returns `404`, not `403`, so ownership
isn't leaked by response code.

## The data-quality score

The score starts at 100 and measurable issues subtract points, each with a recorded reason and weight:

- Average missing-value percentage across all columns (capped contribution)
- Columns with >50% missingness, flagged individually beyond the average penalty
- Duplicate row percentage
- Constant (zero-information) columns
- Average IQR outlier percentage across numeric columns with enough data to measure

The dashboard shows the itemized breakdown, not just the number — the point is to explain *why* a
dataset scored the way it did, so the score is a diagnostic tool rather than a black box.

## Edge cases handled

The processing layer is written defensively against: empty files, header-only files, all-null columns,
constant columns, datasets with only numeric or only categorical columns, mixed/invalid types, `NaN` and
`inf` values, very small datasets (including 1-row datasets), too few numeric columns or too few complete
rows for correlation, and zero-IQR columns (which would otherwise divide by zero). These are covered by
dedicated tests in `backend/tests/test_pipeline_edge_cases.py`.

## Running locally

### With Docker Compose (recommended)

```bash
cp backend/.env.example backend/.env      # edit JWT_SECRET_KEY before any real use
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend + Swagger docs: http://localhost:8000/docs
- Postgres: localhost:5432, Redis: localhost:6379

The backend container runs `alembic upgrade head` before starting Uvicorn, so the schema is always
up to date on boot.

### Running services individually

**Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                      # point DATABASE_URL/REDIS_URL at local instances
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend**

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Testing

**Backend**

```bash
cd backend
pytest -v
```

Covers: unit tests for every processing module (loader, type detection, profiling, statistics, outliers,
correlation, quality scoring) run directly against pandas DataFrames with no DB/HTTP involved; integration
tests through the real FastAPI app (SQLite in-memory DB, fakeredis in place of Redis) for auth, dataset
upload/list/preview/delete, ownership isolation, analysis run/latest/history/compare, and the cache-hit
path specifically (asserting the DB is *not* queried on a cache hit).

**Frontend**

```bash
cd frontend
npm run test        # Vitest unit tests
npm run lint         # ESLint
npm run build         # tsc + Vite build (type-checks the whole app)
```

## Environment variables

**Backend** (`backend/.env`, see `backend/.env.example`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLAlchemy connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET_KEY` | Signing key for access/refresh tokens — must be changed from the default |
| `JWT_ALGORITHM` | Defaults to HS256 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` / `REFRESH_TOKEN_EXPIRE_DAYS` | Token lifetimes |
| `UPLOAD_DIR` | Where uploaded files are stored on disk |
| `MAX_UPLOAD_SIZE_MB` | Upload size limit |
| `CORS_ORIGINS` | Comma-separated allowed origins |

**Frontend** (`frontend/.env`, see `frontend/.env.example`)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API. Baked in at build time (see trade-offs below). |

## Engineering decisions and trade-offs

- **Local disk storage instead of S3/object storage.** Simpler to run and reason about for a single-box
  deployment. The dataset service isolates all file I/O behind one class, so swapping in S3 later is a
  contained change, not a rewrite.
- **Redis cache-aside on the *latest* report only**, keyed by dataset ID, invalidated on every new
  analysis run. Report history and comparisons always hit Postgres directly — they're read far less often
  and correctness (seeing the exact report you clicked) matters more there than shaving latency.
  If Redis is unreachable, the cache service catches `RedisError` and falls back to the database rather
  than failing the request — caching degrades the app, it doesn't take it down.
  A more thorough Redis setup was left for the future improvements below.
- **JSONB for analysis results, not a fully normalized schema.** Profiling/stats/outlier/correlation output
  varies per dataset's columns; forcing that into fixed relational columns would mean a schema migration
  every time the analysis logic added a new metric. JSONB is still indexable and queryable in Postgres,
  so this isn't giving up relational guarantees where they matter (foreign keys, cascades are all still
  enforced on the structured columns).
- **Vite env vars are build-time, not runtime.** `VITE_API_BASE_URL` gets baked into the static bundle at
  `docker build` time (passed as a build arg in `docker-compose.yml`), which is why it isn't set under
  `environment:` on the frontend service — that wouldn't do anything for an already-built static bundle.
  A production deployment targeting multiple environments would need a small entrypoint script that
  templates a runtime config file into the built assets; that's called out under future improvements
  rather than implemented, since it's not needed for local/demo use.
- **404, not 403, on datasets you don't own.** Prevents confirming a dataset ID exists to a user who
  doesn't own it.
- **No microservices, Kafka, or Kubernetes.** There's one write-heavy path (upload + analyze) and one
  read-heavy path (viewing reports); a layered monolith handles both without the operational cost of a
  distributed system whose independent scaling needs don't exist yet.

## Future improvements

- Background job queue (e.g. Celery/RQ) for analysis, so large uploads don't block the request thread
- Streaming/chunked CSV parsing for datasets too large to load fully into memory
- Column-level drill-down charts (distribution histograms per column, not just aggregate stats)
- Soft-delete + restore for datasets instead of hard delete
- Rate limiting on upload and analysis endpoints
- Runtime frontend configuration (rather than build-time) for easier multi-environment deployment
- Role-based sharing of datasets/reports between users (currently strictly single-owner)

## Interview talking points this project supports

REST API versioning and resource design; layered architecture and why the processing layer is kept
framework-agnostic; JWT access/refresh token design; ownership-based authorization and the 404-vs-403
choice; relational schema design with JSONB for variable-shaped data and cascade behavior; Redis
cache-aside with explicit invalidation and graceful degradation; pagination and search at the repository
layer; the difference between unit-testing pure processing logic and integration-testing through the API;
Docker Compose service wiring and build-time vs. runtime configuration; and a defensible, explainable
scoring methodology instead of an opaque single number.
