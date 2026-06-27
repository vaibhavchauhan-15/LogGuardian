from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.preprocessing import StandardScaler

try:
    import torch
    from torch import nn, optim
except Exception:  # pragma: no cover
    torch = None
    nn = None
    optim = None

try:
    from sentence_transformers import SentenceTransformer
except Exception:  # pragma: no cover
    SentenceTransformer = None


@dataclass
class ModelScore:
    anomaly_score: float
    classification: str
    explanation: str
    model_breakdown: Optional[dict[str, float]] = None


@dataclass
class TrainSummary:
    trained: bool
    samples_used: int
    message: str


if nn is not None:
    class _AutoencoderModel(nn.Module):
        def __init__(self, input_dim: int) -> None:
            super().__init__()
            hidden = max(32, min(256, input_dim // 2))
            bottleneck = max(16, hidden // 2)
            self.encoder = nn.Sequential(
                nn.Linear(input_dim, hidden),
                nn.ReLU(),
                nn.Linear(hidden, bottleneck),
                nn.ReLU(),
            )
            self.decoder = nn.Sequential(
                nn.Linear(bottleneck, hidden),
                nn.ReLU(),
                nn.Linear(hidden, input_dim),
            )

        def forward(self, tensor: torch.Tensor) -> torch.Tensor:
            encoded = self.encoder(tensor)
            return self.decoder(encoded)
else:
    class _AutoencoderModel:  # pragma: no cover
        def __init__(self, input_dim: int) -> None:
            raise RuntimeError("PyTorch is required for the autoencoder model")


class AnomalyService:
    def __init__(
        self,
        model_path: str,
        suspicious_threshold: float = 0.4,
        critical_threshold: float = 0.7,
        embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
        enable_semantic_embeddings: bool = True,
    ) -> None:
        self.model_path = Path(model_path)
        self.model_path.parent.mkdir(parents=True, exist_ok=True)

        self.suspicious_threshold = suspicious_threshold
        self.critical_threshold = critical_threshold
        self.embedding_model_name = embedding_model_name
        self.enable_semantic_embeddings = enable_semantic_embeddings

        self.vectorizer = HashingVectorizer(
            n_features=384,
            alternate_sign=False,
            norm="l2",
            ngram_range=(1, 2),
        )

        self.isolation_model: Optional[IsolationForest] = None
        self.model: Optional[IsolationForest] = None  # Backwards compatibility.

        self.scaler: Optional[StandardScaler] = None
        self.autoencoder_state: Optional[dict[str, Any]] = None
        self.autoencoder_input_dim: Optional[int] = None
        self.autoencoder_threshold: Optional[float] = None

        self._embedding_model: Optional[Any] = None
        self.trained_at: Optional[str] = None

        self._load_model()

    @property
    def is_trained(self) -> bool:
        return self.isolation_model is not None

    def _load_embedding_model(self) -> Optional[Any]:
        if not self.enable_semantic_embeddings or SentenceTransformer is None:
            return None
        if self._embedding_model is None:
            self._embedding_model = SentenceTransformer(self.embedding_model_name)
        return self._embedding_model

    def _load_model(self) -> None:
        if not self.model_path.exists():
            return

        try:
            payload = joblib.load(self.model_path)
        except Exception:
            return

        self.trained_at = payload.get("trained_at")

        self.isolation_model = payload.get("isolation_model") or payload.get("model")
        self.model = self.isolation_model

        scaler_mean = payload.get("scaler_mean")
        scaler_scale = payload.get("scaler_scale")
        if scaler_mean is not None and scaler_scale is not None:
            scaler = StandardScaler()
            scaler.mean_ = np.array(scaler_mean)
            scaler.scale_ = np.array(scaler_scale)
            scaler.var_ = np.square(scaler.scale_)
            scaler.n_features_in_ = scaler.mean_.shape[0]
            self.scaler = scaler

        self.autoencoder_state = payload.get("autoencoder_state")
        self.autoencoder_input_dim = payload.get("autoencoder_input_dim")
        self.autoencoder_threshold = payload.get("autoencoder_threshold")

    def _save_model(self) -> None:
        if self.isolation_model is None:
            return

        payload = {
            "isolation_model": self.isolation_model,
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "autoencoder_state": self.autoencoder_state,
            "autoencoder_input_dim": self.autoencoder_input_dim,
            "autoencoder_threshold": self.autoencoder_threshold,
            "scaler_mean": self.scaler.mean_.tolist() if self.scaler is not None else None,
            "scaler_scale": self.scaler.scale_.tolist() if self.scaler is not None else None,
        }
        joblib.dump(payload, self.model_path)

    def _feature_matrix(self, messages: list[str]) -> np.ndarray:
        cleaned = [message.strip() for message in messages]
        lexical = self.vectorizer.transform(cleaned).toarray().astype(np.float32)

        embedder = self._load_embedding_model()
        if embedder is None:
            return lexical

        try:
            semantic = embedder.encode(
                cleaned,
                normalize_embeddings=True,
                convert_to_numpy=True,
                show_progress_bar=False,
            ).astype(np.float32)
            return np.hstack([lexical, semantic])
        except Exception:
            return lexical

    def train(self, messages: list[str]) -> TrainSummary:
        clean_messages = [message.strip() for message in messages if message and message.strip()]

        if len(clean_messages) < 16:
            return TrainSummary(
                trained=False,
                samples_used=len(clean_messages),
                message="At least 16 logs are needed to train the hybrid anomaly model.",
            )

        matrix = self._feature_matrix(clean_messages)

        contamination = min(0.2, max(0.02, round(20 / len(clean_messages), 3)))
        self.isolation_model = IsolationForest(
            n_estimators=280,
            contamination=contamination,
            random_state=42,
            n_jobs=-1,
        )
        self.isolation_model.fit(matrix)
        self.model = self.isolation_model

        ae_status = "disabled"
        if torch is not None and nn is not None and optim is not None and len(clean_messages) >= 32:
            try:
                scaled = StandardScaler().fit_transform(matrix).astype(np.float32)
                self.scaler = StandardScaler()
                self.scaler.fit(matrix)
                model = _AutoencoderModel(scaled.shape[1])
                model.train()

                optimizer = optim.Adam(model.parameters(), lr=0.001)
                criterion = nn.MSELoss()

                tensor = torch.tensor(scaled, dtype=torch.float32)
                for _ in range(12):
                    optimizer.zero_grad()
                    reconstructed = model(tensor)
                    loss = criterion(reconstructed, tensor)
                    loss.backward()
                    optimizer.step()

                model.eval()
                with torch.no_grad():
                    reconstructed = model(tensor)
                    errors = torch.mean((reconstructed - tensor) ** 2, dim=1).cpu().numpy()

                self.autoencoder_state = model.state_dict()
                self.autoencoder_input_dim = scaled.shape[1]
                self.autoencoder_threshold = float(np.quantile(errors, 0.9))
                ae_status = "enabled"
            except Exception:
                self.autoencoder_state = None
                self.autoencoder_input_dim = None
                self.autoencoder_threshold = None
                ae_status = "failed"
        else:
            self.autoencoder_state = None
            self.autoencoder_input_dim = None
            self.autoencoder_threshold = None

        self.trained_at = datetime.now(timezone.utc).isoformat()
        self._save_model()

        return TrainSummary(
            trained=True,
            samples_used=len(clean_messages),
            message=(
                f"Hybrid model trained on {len(clean_messages)} logs "
                f"(IsolationForest + autoencoder={ae_status})."
            ),
        )

    def _autoencoder_score(self, matrix: np.ndarray) -> Optional[float]:
        if (
            torch is None
            or nn is None
            or self.autoencoder_state is None
            or self.autoencoder_input_dim is None
            or self.autoencoder_threshold is None
            or self.scaler is None
        ):
            return None

        try:
            scaled = self.scaler.transform(matrix).astype(np.float32)
            model = _AutoencoderModel(self.autoencoder_input_dim)
            model.load_state_dict(self.autoencoder_state)
            model.eval()

            tensor = torch.tensor(scaled, dtype=torch.float32)
            with torch.no_grad():
                reconstructed = model(tensor)
                error = float(torch.mean((reconstructed - tensor) ** 2, dim=1).cpu().numpy()[0])

            threshold = max(1e-6, self.autoencoder_threshold)
            normalized = min(1.0, error / (threshold * 2.0))
            return float(max(0.01, normalized))
        except Exception:
            return None

    # ── Security rule engine ────────────────────────────────────────────────
    # High-confidence patterns that should always be flagged regardless of what
    # the unsupervised model has (or hasn't) learned. Returns (score, reason).
    _SQLI_RE = re.compile(
        r"(union\s+select|or\s+1\s*=\s*1|'\s*or\s*'?\d|--\s|/\*|;\s*drop\s+table"
        r"|xp_cmdshell|information_schema|sleep\s*\(|benchmark\s*\(|waitfor\s+delay)",
        re.IGNORECASE,
    )
    _XSS_RE = re.compile(r"(<script|onerror\s*=|javascript:|<img[^>]+src\s*=)", re.IGNORECASE)
    _TRAVERSAL_RE = re.compile(r"(\.\./\.\.|/etc/passwd|\.\.\\|%2e%2e%2f)", re.IGNORECASE)
    _HTTP_STATUS_RE = re.compile(r"\b(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b[^\n]*?\b([1-5]\d{2})\b", re.IGNORECASE)

    _CRITICAL_PHRASES = (
        "impossible travel", "sql injection", "brute force", "traffic spike",
        "unauthorized admin", "multiple failed login", "account takeover",
        "data exfiltration", "privilege escalation", "ddos", "ransomware",
        "malware", "security breach", "intrusion detected", "fraud",
        "panic", "fatal", "out of memory", "segfault", "kernel panic",
    )
    _SUSPICIOUS_PHRASES = (
        "unauthorized", "forbidden", "access denied", "permission denied",
        "failed login", "login failed", "invalid credentials", "invalid token",
        "rate limit", "throttle", "blocked", "suspicious", "exception",
        "timeout", "timed out", "retry", "deadlock", "rejected", "anomaly",
    )

    def _rule_score(self, message: str) -> tuple[float, str]:
        """Deterministic security heuristics. High recall on common attacks."""
        lower = message.lower()

        # ── Critical: attacks and fatal conditions ──
        if self._SQLI_RE.search(message):
            return 0.96, "SQL injection pattern detected"
        if self._XSS_RE.search(message):
            return 0.95, "Cross-site scripting pattern detected"
        if self._TRAVERSAL_RE.search(message):
            return 0.95, "Path traversal pattern detected"
        for phrase in self._CRITICAL_PHRASES:
            if phrase in lower:
                return 0.94, f"High-risk indicator: '{phrase}'"
        # An explicit ALERT level is, by definition, a critical event.
        if re.search(r"\bALERT\b", message):
            return 0.93, "Explicit ALERT-level event"

        # ── HTTP status codes ──
        status_match = self._HTTP_STATUS_RE.search(message)
        status = int(status_match.group(2)) if status_match else None
        if status is not None:
            if status >= 500:
                return 0.85, f"Server error (HTTP {status})"
            if status in (401, 403):
                return 0.66, f"Auth failure (HTTP {status})"
            if status in (400, 405, 408, 409, 429):
                return 0.6, f"Client error (HTTP {status})"

        # ── Suspicious keywords / levels ──
        for phrase in self._SUSPICIOUS_PHRASES:
            if phrase in lower:
                return 0.62, f"Suspicious indicator: '{phrase}'"
        if re.search(r"\b(ERROR|CRITICAL)\b", message):
            return 0.6, "ERROR/CRITICAL level"
        if re.search(r"\bWARN(?:ING)?\b", message):
            return 0.5, "WARN level"

        return 0.06, "No anomaly indicators detected"

    def _heuristic_component(self, message: str) -> float:
        return self._rule_score(message)[0]

    def score(self, message: str) -> ModelScore:
        rule_value, rule_reason = self._rule_score(message)

        if self.isolation_model is None:
            return self._heuristic_score(message)

        matrix = self._feature_matrix([message])
        raw_decision = float(self.isolation_model.decision_function(matrix)[0])
        prediction = int(self.isolation_model.predict(matrix)[0])

        if prediction == 1:
            iso_score = min(self.suspicious_threshold - 0.01, max(0.01, self.suspicious_threshold - raw_decision))
        else:
            iso_score = min(0.99, max(self.critical_threshold, self.critical_threshold + (-raw_decision)))

        ae_score = self._autoencoder_score(matrix)
        if ae_score is None:
            ae_score = rule_value

        ml_score = 0.62 * iso_score + 0.38 * ae_score
        # The deterministic security rules are high-precision; never let the
        # unsupervised model suppress a known-bad pattern. Take the stronger signal.
        anomaly_score = min(0.99, max(0.01, ml_score, rule_value))
        classification = self._classification(anomaly_score)

        explanation = (
            f"Hybrid inference iso={iso_score:.3f}, ml={ml_score:.3f}, "
            f"rule={rule_value:.3f} ({rule_reason})"
        )

        return ModelScore(
            anomaly_score=round(anomaly_score, 4),
            classification=classification,
            explanation=explanation,
            model_breakdown={
                "isolation_forest": round(float(iso_score), 4),
                "rule_engine": round(float(rule_value), 4),
            },
        )

    def _heuristic_score(self, message: str) -> ModelScore:
        score, reason = self._rule_score(message)
        classification = self._classification(score)
        return ModelScore(
            anomaly_score=round(score, 4),
            classification=classification,
            explanation=f"Rule engine: {reason}",
            model_breakdown={"rule_engine": round(score, 4)},
        )

    def _classification(self, score: float) -> str:
        if score >= self.critical_threshold:
            return "critical"
        if score >= self.suspicious_threshold:
            return "suspicious"
        return "normal"
