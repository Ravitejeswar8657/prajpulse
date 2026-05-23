# Praja Pulse — Project Instructions

AP political sentiment radar. A FastAPI backend aggregates Andhra Pradesh political headlines (via RSS), scores them with a Telugu/Tenglish/English sentiment lexicon, and serves clean JSON. A Vite + React frontend renders it as a bold-poster dashboard.

## Project Structure

```
praja-pulse-app/
├── backend/            # FastAPI service (scrape + score + serve)
│   ├── app/
│   │   ├── aggregator.py   # RSS feed aggregation logic
│   │   ├── deep_scorer.py  # Gemini-powered refined scoring
│   │   ├── ground_truth.py # CORE: Sentiment lexicon and entity definitions
│   │   └── main.py         # API endpoints and background scheduler
│   ├── Dockerfile          # Containerization for backend
│   └── requirements.txt    # Python dependencies
└── frontend/           # Vite + React + TS dashboard
    ├── src/
    │   ├── main.tsx        # Entry point (Tailwind + TS)
    │   ├── PrajaPulse.tsx  # Main dashboard component
    │   └── index.css       # Tailwind directives
    ├── index.html          # Configures window.PRAJA_API_BASE
    ├── tailwind.config.js  # Tailwind configuration
    ├── tsconfig.json       # TypeScript configuration
    └── package.json        # Node dependencies
```

## Tech Stack

- **Backend:** Python, FastAPI, Feedparser (RSS), Pydantic, Google Gemini AI.
- **Frontend:** React, Vite, TypeScript, Tailwind CSS.

## Building and Running

### Backend
1. Navigate to `praja-pulse-app/backend`.
2. Install dependencies: `pip install -r requirements.txt`.
3. Run the server: `uvicorn app.main:app --reload`.
   - Access at `http://127.0.0.1:8000/api/pulse`.

### Frontend
1. Navigate to `praja-pulse-app/frontend`.
2. Install dependencies: `npm install`.
3. Run in development mode: `npm run dev`.
   - Access at `http://127.0.0.1:5173`.
   - Ensure `window.PRAJA_API_BASE` in `index.html` matches the backend URL.

## Deployment (AWS Economical Strategy)

### Architecture
- **Frontend:** S3 + CloudFront (~$0.50/mo)
- **Backend:** AWS App Runner (~$7.00/mo)
- **Registry:** Amazon ECR

### CI/CD (GitHub Actions)
The project includes a `.github/workflows/deploy.yml` pipeline that automates:
1. Building and pushing the Backend Docker image to ECR.
2. Triggering an App Runner deployment.
3. Building the Frontend React app with the production API URL.
4. Syncing the Frontend to S3 and invalidating CloudFront.

**Required GitHub Secrets:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `PROD_API_URL`: Your App Runner service URL (e.g., `https://2xmr2xiypq.us-east-1.awsapprunner.com`).
- `GEMINI_API_KEY`: Required for deep scoring.

## Docker

### Backend
1. Build: `docker build -t praja-pulse-backend ./backend`
2. Run: `docker run -p 8000:8000 --env-file ./backend/.env praja-pulse-backend`

### Frontend
1. Build: `docker build -t praja-pulse-frontend ./frontend`
2. Run: `docker run -p 80:80 praja-pulse-frontend`

## Configuration (Environment Variables)

- `GEMINI_API_KEY`: Optional. Enables Gemini-powered "Deep" scoring.
- `REFRESH_MINUTES`: Frequency of RSS feed scraping (default: 30).
- `REFRESH_TOKEN`: Protects the `/api/refresh` endpoint in production.
- `ALLOW_ORIGINS`: CORS configuration (default: `*`).

## Development Conventions

- **Sentiment Logic:** The core "moat" of the project is in `backend/app/ground_truth.py`. To improve accuracy, update the `LEXICON` (Telugu/Tenglish terms) and `ENTITIES` (leader aliases).
- **State Management:** The backend uses an in-memory cache for simplicity. There is no external database.
- **Styling:** The frontend uses **Tailwind CSS** for a bold, responsive, and maintainable "bold-poster" aesthetic. Styles are defined using utility classes in `PrajaPulse.tsx`.
- **RSS Feeds:** Add new publishers by updating `FEEDS` in `backend/app/aggregator.py`.
