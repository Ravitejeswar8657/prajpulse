# Praja Pulse 🛰️

**AP Political Sentiment Radar** — A real-time dashboard aggregating and analyzing political sentiment in Andhra Pradesh.

![Project Status](https://img.shields.io/badge/Status-Production-success)
![AI](https://img.shields.io/badge/AI-Google%20Gemini%201.5-blue)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20TS%20%2B%20Tailwind-61dafb)

## 🌟 Overview
Praja Pulse is a modernized political radar that captures headlines across Andhra Pradesh, scores them using a specialized Telugu-aware lexicon, and provides deep AI analysis via Google Gemini.

### Key Features:
- **Real-time RSS Aggregation:** Scrapes major AP news sources automatically.
- **Telugu/Tenglish Lexicon:** Built-in sentiment engine for regional linguistic nuances.
- **Gemini AI "Deep" Mode:** Handles sarcasm and multi-entity sentiment with advanced LLMs.
- **Interactive Dashboard:** 
  - Clickable leaderboards for filtering news.
  - Paginated signal feed.
  - Immersive full-screen mode.
  - Modern "bold-poster" UI using Tailwind CSS.

## 🏗️ Architecture
- **Backend:** FastAPI (Python 3.12)
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Infrastructure:** 
  - **AWS App Runner:** Containerized backend with auto-deploy.
  - **AWS S3 + CloudFront:** Scalable, secure frontend hosting.
  - **Terraform:** Infrastructure as Code.
  - **GitHub Actions:** Fully automated CI/CD pipeline.

## 🚀 Quick Start (Local)

### 1. Backend
```bash
cd praja-pulse-app/backend
pip install -r requirements.txt
export GEMINI_API_KEY=your_key_here
uvicorn app.main:app --reload
```

### 2. Frontend
```bash
cd praja-pulse-app/frontend
npm install
npm run dev
```

## ☁️ Deployment
The project is configured for an **economical AWS deployment** (~$7.50/mo).

1. **Infrastructure:** Run `terraform apply` in the `praja-pulse-app/` directory.
2. **CI/CD:** Configure GitHub Secrets:
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
   - `GEMINI_API_KEY`
   - `PROD_API_URL` (Your App Runner URL)

## 🤝 Contribution
The core "moat" of this project is in `backend/app/ground_truth.py`. Update the `LEXICON` and `ENTITIES` to improve the radar's precision.

---
*Built for the people of Andhra Pradesh. Powered by Google AI.*
