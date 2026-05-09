"""CALFFA expense forecasting ML API (scikit-learn). Run: uvicorn main:app --host 127.0.0.1 --port 5001"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from forecaster import forecast_next_total_expenses

app = FastAPI(title="CALFFA ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExpenseForecastRequest(BaseModel):
    total_expenses: list[float] = Field(..., min_length=1, description="Cronological total_expenses series")


@app.get("/health")
def health():
    return {"status": "ok", "service": "calffa-ml"}


@app.post("/forecast/expenses")
def post_forecast_expenses(body: ExpenseForecastRequest):
    return forecast_next_total_expenses(body.total_expenses)
