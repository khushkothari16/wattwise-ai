# WattWise AI ⚡

> AI-powered household electricity consumption awareness platform, built with IBM Granite, IBM Cloud, and IBM Bob.

## Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + Recharts
- **Backend**: Python 3.11 + FastAPI + SQLite + SQLAlchemy
- **AI**: IBM Granite (ibm/granite-13b-chat-v2) via IBM watsonx.ai

## Quick Start

### Backend
```bash
cd backend
cp env.example .env   # fill in WATSONX_API_KEY and WATSONX_PROJECT_ID
python3 -m pip install -r requirements.txt
uvicorn app.main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Docker Compose
```bash
docker compose up --build
```

## IBM watsonx.ai Setup
1. Create an [IBM Cloud account](https://cloud.ibm.com)
2. Provision [watsonx.ai](https://www.ibm.com/watsonx)
3. Create a project and copy the **Project ID**
4. Generate an **API Key** from IAM
5. Set in `backend/.env`:
   ```
   WATSONX_API_KEY=your_key
   WATSONX_PROJECT_ID=your_project_id
   ```

## IBM Cloud Foundry Deploy
```bash
ibmcloud cf push wattwise-ai-backend -f manifest.yml
```

## Features
1. Household appliance management (CRUD)
2. kWh consumption calculation
3. Appliance-wise consumption analysis
4. Monthly electricity bill estimation
5. Unusual consumption detection (z-score anomaly)
6. Personalized AI recommendations (IBM Granite)
7. Conversational AI assistant (IBM Granite)
8. Monthly energy reports (IBM Granite)

## API Docs
Once running, visit `http://localhost:8000/docs` for the interactive Swagger UI.
