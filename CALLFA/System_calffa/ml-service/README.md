# CALFFA ML service (Python)

FastAPI + **scikit-learn** for next-step **total expense** forecasts. The Node backend calls `POST /forecast/expenses` when `ML_API_URL` is set.

## Run locally

```bash
cd ml-service
python -m venv .venv
# Windows: .venv\Scripts\activate
# Unix:    source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 5001
```

Health: `GET http://127.0.0.1:5001/health`

## API

`POST /forecast/expenses` JSON body:

```json
{ "total_expenses": [47950, 46750, 52100] }
```

Response includes `model_name` (`linear_regression_lags`, `ridge_regression_lags`, or `random_forest_regressor_lags`), `predicted_total_expenses`, and uncertainty bands.

## Node integration

Set in backend `.env`:

```env
ML_API_URL=http://127.0.0.1:5001
```

If the ML service is down, the Node app uses an OLS fallback automatically.
