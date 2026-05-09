"""
Next-step total_expense forecast from a 1D series.
Uses lag + rolling features; picks Ridge / RandomForest by sample size.
"""
from __future__ import annotations

import numpy as np
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor


def _round_php(x: float) -> float:
    return max(0.0, round(x / 10.0) * 10.0)


def _soft_clamp_to_history(y: np.ndarray, pred: float) -> float:
    """Magsara ng extrapolation layo sa obserbado (pero payak lamang para sa agraryong lakihan ng PHP)."""
    y_min = float(np.min(y))
    y_max = float(np.max(y))
    span = float(y_max - y_min) + 1e-3
    lo = y_min - span * 0.08
    hi = y_max + span * 0.52
    return float(np.clip(pred, max(0.0, lo), hi))


def _blend_with_naive_delta(y: np.ndarray, raw: float, weight_naive: float = 0.42) -> float:
    """Halo ng huling delta (ARIMA-0 klaseng basa) tungo sa modelo para sa makatotohanang hakbang."""
    if len(y) < 2:
        return float(raw)
    delta = float(y[-1]) - float(y[-2])
    naive = float(y[-1]) + delta
    w = float(np.clip(weight_naive, 0.0, 1.0))
    return float((1.0 - w) * raw + w * naive)


def _build_supervised(y: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Each row predicts y[k] from features at step k (k >= 1)."""
    n = len(y)
    X_list: list[list[float]] = []
    Y_list: list[float] = []
    for k in range(1, n):
        prev1 = float(y[k - 1])
        prev2 = float(y[k - 2]) if k >= 2 else prev1
        roll = float(np.mean(y[max(0, k - 3) : k]))
        X_list.append([float(k), prev1, prev2, roll])
        Y_list.append(float(y[k]))
    return np.asarray(X_list, dtype=np.float64), np.asarray(Y_list, dtype=np.float64)


def _metrics(Y: np.ndarray, yhat: np.ndarray) -> tuple[float, float]:
    ss_res = float(np.sum((Y - yhat) ** 2))
    ss_tot = float(np.sum((Y - np.mean(Y)) ** 2))
    r2 = float(1.0 - ss_res / ss_tot) if ss_tot > 1e-9 else 0.0
    rmse = float(np.sqrt(max(ss_res / max(len(Y) - 1, 1), 0.0)))
    return r2, rmse


def forecast_next_total_expenses(y_in: list[float]) -> dict:
    """
    Returns dict ok/model_name/predicted/ci/r2/rmse/method_description_ph
    Requires len(y_in) >= 3.
    """
    y = np.asarray(y_in, dtype=np.float64)
    n = int(y.size)
    if n < 3:
        return {"ok": False, "error": "Kailangan ng hindi bababa sa 3 punto."}

    if np.any(~np.isfinite(y)):
        return {"ok": False, "error": "May hindi numero sa serye ng gastos."}

    X, Y = _build_supervised(y)
    if X.shape[0] < 1:
        return {"ok": False, "error": "Kulang ang supervised rows."}

    k_next = float(n)
    prev1 = float(y[-1])
    prev2 = float(y[-2]) if n >= 2 else prev1
    roll_next = float(np.mean(y[max(0, n - 3) : n]))
    x_next = np.array([[k_next, prev1, prev2, roll_next]], dtype=np.float64)

    n_rows = X.shape[0]

    # Model selection by panel length (still conservative for small farmers)
    if n_rows < 5:
        # Malakas na L2: iwas sa perfect-fit extrapolation error sa kakaunting row
        model = Ridge(alpha=650.0)
        model.fit(X, Y)
        yhat_train = model.predict(X)
        raw = float(model.predict(x_next)[0])
        point = _soft_clamp_to_history(y, _blend_with_naive_delta(y, raw, 0.72))
        model_name = "ridge_regression_lags_small"
        method_ph = (
            "Python scikit-learn: Ridge (matinding regularisasyon) + lag/rolling mean - angkop sa maikling serye."
        )
    elif n_rows < 12:
        model = Ridge(alpha=12.0)
        model.fit(X, Y)
        yhat_train = model.predict(X)
        raw = float(model.predict(x_next)[0])
        point = _soft_clamp_to_history(y, _blend_with_naive_delta(y, raw, 0.35))
        model_name = "ridge_regression_lags"
        method_ph = (
            "Python scikit-learn: Ridge regression (regularized linear) para sa lag/rolling na feature."
        )
    else:
        model = RandomForestRegressor(
            n_estimators=120,
            max_depth=6,
            min_samples_leaf=max(1, n_rows // 12),
            random_state=42,
            n_jobs=-1,
        )
        model.fit(X, Y)
        yhat_train = model.predict(X)
        preds_trees = np.array([t.predict(x_next)[0] for t in model.estimators_], dtype=np.float64)
        y_min = float(np.min(y))
        y_max = float(np.max(y))
        span = float(y_max - y_min) + 1e-3
        bound_lo = y_min - span * 0.08
        bound_hi = y_max + span * 0.52
        point = _soft_clamp_to_history(
            y, _blend_with_naive_delta(y, float(np.mean(preds_trees)), 0.22)
        )
        q_low = float(np.clip(np.percentile(preds_trees, 2.5), bound_lo, bound_hi))
        q_high = float(np.clip(np.percentile(preds_trees, 97.5), bound_lo, bound_hi))
        if q_low > q_high:
            q_low, q_high = q_high, q_low
        model_name = "random_forest_regressor_lags"
        method_ph = (
            "Python scikit-learn: RandomForestRegressor sa lag + rolling ng kabuuang gastos - "
            "kayang habulin ang nonlinear na kilos kapag mas mahabang historia."
        )
        r2, rmse = _metrics(Y, yhat_train)
        pred_round = _round_php(point)
        return {
            "ok": True,
            "model_name": model_name,
            "method_description_ph": method_ph,
            "predicted_total_expenses": pred_round,
            "ci95_low": _round_php(max(0.0, q_low)),
            "ci95_high": _round_php(max(0.0, q_high)),
            "r_squared": round(r2, 3),
            "residual_rmse": round(rmse, 2),
            "trees_ci_used": True,
        }

    r2, rmse = _metrics(Y, yhat_train)
    residual_std = float(np.sqrt(max(np.sum((Y - yhat_train) ** 2) / max(len(Y) - 4, 1), 0.0)))
    ci_half = 1.96 * residual_std
    point = max(0.0, _soft_clamp_to_history(y, point))
    pred_round = _round_php(point)

    return {
        "ok": True,
        "model_name": model_name,
        "method_description_ph": method_ph,
        "predicted_total_expenses": pred_round,
        "ci95_low": _round_php(max(0.0, point - ci_half)),
        "ci95_high": _round_php(max(0.0, point + ci_half)),
        "r_squared": round(r2, 3),
        "residual_rmse": round(rmse, 2),
        "trees_ci_used": False,
    }

