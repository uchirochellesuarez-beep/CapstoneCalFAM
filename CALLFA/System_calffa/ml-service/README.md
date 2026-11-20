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

### Pretrained Linear Regression (standalone; not wired to Node yet)

`POST /forecast/expenses/pretrained-lr` — loads the offline joblib (no fit on request).

Default artifact: `../ml-training/runs/run_20261120_203925/expense_model.joblib`  
Optional override env: `CALFAM_PRETRAINED_LR_PATH`

Status: `GET /forecast/expenses/pretrained-lr/status`

Tests:

```bash
python -m unittest tests.test_pretrained_lr -v
```

## Node integration

Set in backend `.env`:

```env
ML_API_URL=http://127.0.0.1:5001
```

If the ML service is down, the Node app uses an OLS fallback automatically.
