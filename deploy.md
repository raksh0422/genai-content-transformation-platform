# Production Deployment Guide — GenAI Content Transformation Platform

This document outlines instructions for deploying the GenAI Content Transformation Platform to production cloud targets.

---

## Targeted Cloud Infrastructure Stack

| Service Layer | Production Target | Environment Configuration |
|---|---|---|
| **Frontend UI** | Vercel / Netlify | Next.js Standalone Build |
| **Backend API** | Render / Railway | Docker Container / Python 3.9+ runtime |
| **Relational Database** | Supabase / Neon | PostgreSQL 15+ (Pooled Connection String) |
| **Vector Index Storage** | Qdrant Cloud / FAISS Volume | Persistent Vector Index Storage |
| **Document Object Storage** | AWS S3 / Cloudflare R2 | Production Object Storage |

---

## 1. Database Provisioning (Supabase / Neon)

1. Create a PostgreSQL project on Supabase or Neon.
2. Obtain the Connection String:
   ```env
   DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>:5432/<dbname>?ssl=require
   ```
3. Run database migrations:
   ```bash
   cd backend
   alembic upgrade head
   ```

---

## 2. Backend Deployment (Render / Railway)

1. Create a new **Web Service** on Render or Railway connected to the GitHub repository.
2. Set the build and start commands:
   - **Docker Build**: Dockerfile in `./backend`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Configure Environment Variables:
   ```env
   APP_ENV=production
   DATABASE_URL=postgresql+asyncpg://...
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4o-mini
   OPENAI_EMBEDDING_MODEL=text-embedding-3-small
   VECTOR_STORE_TYPE=faiss
   UPLOAD_DIR=/app/uploads
   ```

---

## 3. Frontend Deployment (Vercel)

1. Import the repository into Vercel and set the Root Directory to `frontend`.
2. Framework Preset: **Next.js**.
3. Configure Environment Variables:
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api/v1
   ```
4. Deploy project.

---

## 4. Local Production Docker Compose Execution

To test the entire production stack locally:

```bash
docker-compose up --build
```

Access the services:
- **Frontend App**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000/docs`
- **PostgreSQL**: `localhost:5432`
