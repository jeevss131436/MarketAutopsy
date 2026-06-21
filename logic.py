#!/usr/bin/env python
# coding: utf-8

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report
import yfinance as yf


# ---------------------------------------------------------------------------
# Model Architectures
# ---------------------------------------------------------------------------

class MarketRegressor(nn.Module):
    def __init__(self, input_dim):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, 64), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(64, 32), nn.ReLU(), nn.Linear(32, 1)
        )
    def forward(self, x): return self.network(x)


class MarketClassifier(nn.Module):
    def __init__(self, input_dim):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, 64), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(64, 32), nn.ReLU(), nn.Linear(32, 1)
        )
    def forward(self, x): return self.network(x)


class MarketDataset(Dataset):
    def __init__(self, features, reg_targets, clf_targets):
        self.features = features
        self.reg_targets = reg_targets
        self.clf_targets = clf_targets

    def __len__(self): return len(self.features)
    def __getitem__(self, idx): return self.features[idx], self.reg_targets[idx], self.clf_targets[idx]


# ---------------------------------------------------------------------------
# Feature Engineering
# ---------------------------------------------------------------------------

def extract_market_features(ticker: str, start_date: str, end_date: str):
    """
    Download OHLCV data and engineer 8 features.
    Returns (df, close) — df has feat_* columns (dropna applied), close is the full price Series.
    Feature order is fixed: rsi_14, return_1d, return_5d, return_21d,
    ma_5_ratio, ma_21_ratio, volatility_21d, volume_ratio.
    """
    raw_data = yf.download(ticker, start=start_date, end=end_date, progress=False)

    if isinstance(raw_data.columns, pd.MultiIndex):
        raw_data.columns = raw_data.columns.get_level_values(0)

    close = raw_data['Adj Close'] if 'Adj Close' in raw_data.columns else raw_data['Close']
    volume = raw_data['Volume']

    df = pd.DataFrame(index=raw_data.index)

    # RSI (14-period)
    delta = close.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / (loss + 1e-9)
    df['feat_rsi_14'] = 100 - (100 / (1 + rs))

    # Multi-period returns
    df['feat_return_1d'] = close.pct_change(1)
    df['feat_return_5d'] = close.pct_change(5)
    df['feat_return_21d'] = close.pct_change(21)

    # Moving average ratios
    df['feat_ma_5_ratio'] = (close / close.rolling(5).mean()) - 1
    df['feat_ma_21_ratio'] = (close / close.rolling(21).mean()) - 1

    # Volatility and volume force
    df['feat_volatility_21d'] = df['feat_return_1d'].rolling(21).std()
    df['feat_volume_ratio'] = (volume / volume.rolling(5).mean()) - 1

    df = df.dropna()
    return df, close


# ---------------------------------------------------------------------------
# Training Pipeline
# ---------------------------------------------------------------------------

def train_pipeline(base_ticker: str, epochs: int = 20):
    """
    Train MarketRegressor and MarketClassifier on base_ticker (2016-01-01 to today).
    Returns (reg_model, clf_model, scaler) — all in eval() mode.
    """
    print(f"[train_pipeline] Fetching data for {base_ticker}...")
    df, close = extract_market_features(base_ticker, "2016-01-01", "2026-06-20")

    # Forward-looking targets — last 5 rows become NaN after shift(-5)
    df = df.copy()
    df['target_next_day_price'] = close.shift(-1) / close - 1
    df['target_return_1wk'] = (close.shift(-5) - close) / close
    df['target_action'] = (df['target_return_1wk'] > 0.005).astype(int)
    df = df.dropna()

    feature_cols = [c for c in df.columns if c.startswith('feat_')]
    X_raw = df[feature_cols].values
    y_regressor_raw = df['target_next_day_price'].values
    y_classifier_raw = df['target_action'].values

    split_idx = int(len(df) * 0.80)
    X_train_raw = X_raw[:split_idx]
    y_reg_train_raw = y_regressor_raw[:split_idx]
    y_clf_train = y_classifier_raw[:split_idx]

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train_raw)

    X_train_tensor = torch.tensor(X_train_scaled, dtype=torch.float32)
    y_reg_train_tensor = torch.tensor(y_reg_train_raw, dtype=torch.float32).unsqueeze(1)
    y_clf_train_tensor = torch.tensor(y_clf_train, dtype=torch.float32).unsqueeze(1)

    train_loader = DataLoader(
        MarketDataset(X_train_tensor, y_reg_train_tensor, y_clf_train_tensor),
        batch_size=32, shuffle=False
    )

    input_dim = X_train_tensor.shape[1]
    reg_model = MarketRegressor(input_dim=input_dim)
    clf_model = MarketClassifier(input_dim=input_dim)

    criterion_reg = nn.MSELoss()
    criterion_clf = nn.BCEWithLogitsLoss()
    optimizer_reg = optim.Adam(reg_model.parameters(), lr=0.001)
    optimizer_clf = optim.Adam(clf_model.parameters(), lr=0.001)

    print(f"[train_pipeline] Training {epochs} epochs on {len(X_train_raw)} samples...")
    for epoch in range(1, epochs + 1):
        reg_model.train()
        clf_model.train()
        running_reg_loss, running_clf_loss = 0.0, 0.0

        for batch_features, batch_reg_targets, batch_clf_targets in train_loader:
            optimizer_reg.zero_grad()
            loss_reg = criterion_reg(reg_model(batch_features), batch_reg_targets)
            loss_reg.backward()
            optimizer_reg.step()
            running_reg_loss += loss_reg.item() * batch_features.size(0)

            optimizer_clf.zero_grad()
            loss_clf = criterion_clf(clf_model(batch_features), batch_clf_targets)
            loss_clf.backward()
            optimizer_clf.step()
            running_clf_loss += loss_clf.item() * batch_features.size(0)

        if epoch == 1 or epoch % 5 == 0:
            n = len(X_train_raw)
            print(f"  Epoch {epoch:02d}/{epochs} | Reg Loss: {running_reg_loss/n:.6f} | Clf Loss: {running_clf_loss/n:.4f}")

    reg_model.eval()
    clf_model.eval()
    print(f"[train_pipeline] Complete. Input dim: {input_dim}")
    return reg_model, clf_model, scaler


# ---------------------------------------------------------------------------
# Notebook / Script Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # =========================================================
    # GLOBALS: Change your ticker asset here to test robustness!
    # =========================================================
    TARGET_TICKER = "AAPL"
    START_DATE = "2016-01-01"
    END_DATE = "2026-06-20"

    print(f"--- Fetching and Engineering Data for: {TARGET_TICKER} ---")
    raw_data = yf.download(TARGET_TICKER, start=START_DATE, end=END_DATE)

    if isinstance(raw_data.columns, pd.MultiIndex):
        raw_data.columns = raw_data.columns.get_level_values(0)

    df = pd.DataFrame(index=raw_data.index)
    close = raw_data['Adj Close'] if 'Adj Close' in raw_data.columns else raw_data['Close']
    volume = raw_data['Volume']

    # RSI
    delta = close.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / (loss + 1e-9)
    df['feat_rsi_14'] = 100 - (100 / (1 + rs))

    # Core features
    df['feat_return_1d'] = close.pct_change(1)
    df['feat_return_5d'] = close.pct_change(5)
    df['feat_return_21d'] = close.pct_change(21)
    df['feat_ma_5_ratio'] = (close / close.rolling(5).mean()) - 1
    df['feat_ma_21_ratio'] = (close / close.rolling(21).mean()) - 1
    df['feat_volatility_21d'] = df['feat_return_1d'].rolling(21).std()
    df['feat_volume_ratio'] = (volume / volume.rolling(5).mean()) - 1

    # Targets
    df['target_next_day_price'] = close.shift(-1) / close - 1
    df['target_return_1wk'] = (close.shift(-5) - close) / close
    df['target_action'] = (df['target_return_1wk'] > 0.005).astype(int)
    df = df.dropna()

    print("--- Feature Expansion Layer Complete ---")
    print(f"Total structured trading days for {TARGET_TICKER}: {df.shape[0]}")
    feature_cols_nb = [c for c in df.columns if c.startswith('feat_')]
    print(f"Total unique features extracted (X Matrix): {len(feature_cols_nb)}")
    print("\nVerifying Extended Input Sample:")
    print(df[feature_cols_nb].head())

    # =========================================================
    # Chronological Train/Test Split & Feature Scaling
    # =========================================================
    X_raw = df[feature_cols_nb].values
    y_regressor_raw = df['target_next_day_price'].values
    y_classifier_raw = df['target_action'].values

    split_idx = int(len(df) * 0.80)
    X_train_raw, X_test_raw = X_raw[:split_idx], X_raw[split_idx:]
    y_reg_train_raw, y_reg_test_raw = y_regressor_raw[:split_idx], y_regressor_raw[split_idx:]
    y_clf_train, y_clf_test = y_classifier_raw[:split_idx], y_classifier_raw[split_idx:]

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train_raw)
    X_test_scaled = scaler.transform(X_test_raw)

    X_train_tensor = torch.tensor(X_train_scaled, dtype=torch.float32)
    X_test_tensor = torch.tensor(X_test_scaled, dtype=torch.float32)
    y_reg_train_tensor = torch.tensor(y_reg_train_raw, dtype=torch.float32).unsqueeze(1)
    y_reg_test_tensor = torch.tensor(y_reg_test_raw, dtype=torch.float32).unsqueeze(1)
    y_clf_train_tensor = torch.tensor(y_clf_train, dtype=torch.float32).unsqueeze(1)
    y_clf_test_tensor = torch.tensor(y_clf_test, dtype=torch.float32).unsqueeze(1)

    print(f"Training days: {X_train_tensor.shape[0]} | Testing days: {X_test_tensor.shape[0]}")

    BATCH_SIZE = 32
    train_loader = DataLoader(
        MarketDataset(X_train_tensor, y_reg_train_tensor, y_clf_train_tensor),
        batch_size=BATCH_SIZE, shuffle=False
    )
    test_loader = DataLoader(
        MarketDataset(X_test_tensor, y_reg_test_tensor, y_clf_test_tensor),
        batch_size=BATCH_SIZE, shuffle=False
    )

    # =========================================================
    # Model Instantiation & Training
    # =========================================================
    INPUT_DIMENSIONS = X_train_tensor.shape[1]
    reg_model = MarketRegressor(input_dim=INPUT_DIMENSIONS)
    clf_model = MarketClassifier(input_dim=INPUT_DIMENSIONS)

    criterion_regressor = nn.MSELoss()
    criterion_classifier = nn.BCEWithLogitsLoss()
    LEARNING_RATE = 0.001
    optimizer_regressor = optim.Adam(reg_model.parameters(), lr=LEARNING_RATE)
    optimizer_classifier = optim.Adam(clf_model.parameters(), lr=LEARNING_RATE)

    EPOCHS = 20
    print("--- Starting Model Training ---")
    for epoch in range(1, EPOCHS + 1):
        reg_model.train(); clf_model.train()
        running_reg_loss, running_clf_loss = 0.0, 0.0

        for batch_features, batch_reg_targets, batch_clf_targets in train_loader:
            optimizer_regressor.zero_grad()
            loss_reg = criterion_regressor(reg_model(batch_features), batch_reg_targets)
            loss_reg.backward(); optimizer_regressor.step()
            running_reg_loss += loss_reg.item() * batch_features.size(0)

            optimizer_classifier.zero_grad()
            loss_clf = criterion_classifier(clf_model(batch_features), batch_clf_targets)
            loss_clf.backward(); optimizer_classifier.step()
            running_clf_loss += loss_clf.item() * batch_features.size(0)

        if epoch == 1 or epoch % 2 == 0:
            print(f"Epoch {epoch:02d}/{EPOCHS} | Regressor Loss: {running_reg_loss/len(X_train_tensor):.6f} | Classifier Loss: {running_clf_loss/len(X_train_tensor):.4f}")

    # =========================================================
    # Out-of-Sample Evaluation
    # =========================================================
    reg_model.eval(); clf_model.eval()

    with torch.no_grad():
        test_reg_preds = reg_model(X_test_tensor).numpy()
        test_clf_logits = clf_model(X_test_tensor)
        test_clf_preds = (test_clf_logits >= 0.0).float().numpy()

    actual_returns = y_reg_test_tensor.numpy()
    actual_actions = y_clf_test_tensor.numpy()

    mae_pct = np.mean(np.abs(actual_returns - test_reg_preds)) * 100
    rmse_pct = np.sqrt(np.mean((actual_returns - test_reg_preds) ** 2)) * 100
    accuracy = accuracy_score(actual_actions, test_clf_preds)

    print("==================================================")
    print("          SYNCHRONIZED EVALUATION RESULTS         ")
    print("==================================================")
    print(f"--- REGRESSOR (Next-Day % Return Prediction) ---")
    print(f"Mean Absolute Error (MAE):  {mae_pct:.4f}%")
    print(f"Root Mean Squared Error (RMSE): {rmse_pct:.4f}%")
    print(f"\n--- CLASSIFIER (1-Week Trend Binary Signal) ---")
    print(f"Directional Prediction Accuracy: {accuracy * 100:.2f}%")
    print("\nDetailed Classification Breakdown:")
    print(classification_report(actual_actions, test_clf_preds, target_names=["Hold/Sell (0)", "Buy Signal (1)"]))

    # =========================================================
    # TEST ENGINE: Input any ticker to test out-of-sample models
    # =========================================================
    TEST_TICKER = "QQQ"
    print(f"--- Running Sandbox Prediction Engine on: {TEST_TICKER} ---")

    test_df, t_close = extract_market_features(TEST_TICKER, START_DATE, END_DATE)
    test_df = test_df.copy()
    test_df['target_next_day_price'] = t_close.shift(-1) / t_close - 1
    test_df['target_return_1wk'] = (t_close.shift(-5) - t_close) / t_close
    test_df['target_action'] = (test_df['target_return_1wk'] > 0.005).astype(int)
    test_df = test_df.dropna()

    sandbox_feature_cols = [c for c in test_df.columns if c.startswith('feat_')]
    X_ticker_raw = test_df[sandbox_feature_cols].values

    if X_ticker_raw.shape[1] != scaler.n_features_in_:
        print(f"\n❌ Shape Mismatch: {X_ticker_raw.shape[1]} features vs {scaler.n_features_in_} expected.")
    else:
        X_ticker_scaled = scaler.transform(X_ticker_raw)
        X_ticker_tensor = torch.tensor(X_ticker_scaled, dtype=torch.float32)

        with torch.no_grad():
            ticker_reg_preds = reg_model(X_ticker_tensor).numpy()
            ticker_clf_logits = clf_model(X_ticker_tensor)
            ticker_clf_preds = (ticker_clf_logits >= 0.0).float().numpy()

        t_mae = np.mean(np.abs(test_df['target_next_day_price'].values - ticker_reg_preds.flatten())) * 100
        t_acc = accuracy_score(test_df['target_action'].values, ticker_clf_preds.flatten())

        print("==================================================")
        print(f"      SANDBOX RESULTS FOR ASSET: {TEST_TICKER}     ")
        print("==================================================")
        print(f"Regressor Next-Day Error (MAE):     {t_mae:.4f}%")
        print(f"Classifier Move Accuracy:           {t_acc * 100:.2f}%")
        print("==================================================")

        print("\nMost Recent Days Prediction Signals:")
        latest_days = test_df.index[-5:]
        for i, day in enumerate(latest_days):
            pred_move = ticker_reg_preds[-5 + i][0] * 100
            signal = "BUY" if ticker_clf_preds[-5 + i][0] == 1 else "HOLD/SELL"
            print(f"Date: {day.strftime('%Y-%m-%d')} | Est. Next-Day Return: {pred_move:+.2f}% | 1-Wk Action: {signal}")
