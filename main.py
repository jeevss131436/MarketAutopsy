from contextlib import asynccontextmanager
from datetime import date

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from logic import extract_market_features, train_pipeline

_state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[startup] Training pipeline on AAPL — this takes ~30s...")
    reg_model, clf_model, scaler = train_pipeline("AAPL", epochs=20)
    _state["reg_model"] = reg_model
    _state["clf_model"] = clf_model
    _state["scaler"] = scaler
    print("[startup] Models ready.")
    yield
    _state.clear()


app = FastAPI(title="MarketAutopsy API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/predict/{ticker}")
def predict(ticker: str):
    ticker = ticker.upper().strip()
    end_date = date.today().strftime("%Y-%m-%d")

    try:
        df, close = extract_market_features(ticker, "2016-01-01", end_date)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Data fetch failed for {ticker}: {exc}")

    if df.empty:
        raise HTTPException(status_code=404, detail=f"No trading data found for {ticker}")

    scaler = _state["scaler"]
    reg_model = _state["reg_model"]
    clf_model = _state["clf_model"]

    feature_cols = [c for c in df.columns if c.startswith("feat_")]
    X_raw = df[feature_cols].values[-1].reshape(1, -1)

    if X_raw.shape[1] != scaler.n_features_in_:
        raise HTTPException(
            status_code=500,
            detail=f"Feature mismatch: got {X_raw.shape[1]}, expected {scaler.n_features_in_}",
        )

    X_scaled = scaler.transform(X_raw)
    X_tensor = torch.tensor(X_scaled, dtype=torch.float32)

    with torch.no_grad():
        reg_pred = reg_model(X_tensor).numpy()[0][0]
        clf_logit = clf_model(X_tensor)
        clf_pred = int((clf_logit >= 0.0).float().numpy()[0][0])

    latest_close = float(close.loc[df.index[-1]])
    return_pct = float(reg_pred) * 100
    action = "BUY" if clf_pred == 1 else "HOLD/SELL"

    return {
        "ticker": ticker,
        "latest_close": round(latest_close, 2),
        "estimated_next_day_return_pct": round(return_pct, 4),
        "one_week_action_signal": action,
        "execution_date": date.today().isoformat(),
    }
