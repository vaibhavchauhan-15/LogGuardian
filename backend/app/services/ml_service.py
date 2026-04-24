from __future__ import annotations

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

    def _heuristic_component(self, message: str) -> float:
        lower = message.lower()
        critical_terms = ["panic", "fatal", "out of memory", "segfault", "crash", "timeout"]
        suspicious_terms = ["error", "retry", "exception", "denied", "slow", "throttle"]

        if any(term in lower for term in critical_terms):
            return 0.9
        if any(term in lower for term in suspicious_terms):
            return 0.62
        return 0.12

    def score(self, message: str) -> ModelScore:
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
            ae_score = self._heuristic_component(message)

        anomaly_score = min(0.99, max(0.01, 0.62 * iso_score + 0.38 * ae_score))
        classification = self._classification(anomaly_score)

        explanation = (
            f"Hybrid inference iso={iso_score:.3f}, autoencoder={ae_score:.3f}, "
            f"decision={raw_decision:.4f}, prediction={prediction}"
        )

        return ModelScore(
            anomaly_score=round(anomaly_score, 4),
            classification=classification,
            explanation=explanation,
            model_breakdown={
                "isolation_forest": round(float(iso_score), 4),
                "autoencoder": round(float(ae_score), 4),
            },
        )

    def _heuristic_score(self, message: str) -> ModelScore:
        score = self._heuristic_component(message)
        classification = self._classification(score)
        if classification == "critical":
            reason = "Keyword heuristic detected high-risk tokens"
        elif classification == "suspicious":
            reason = "Keyword heuristic detected suspicious behavior"
        else:
            reason = "No anomaly indicators detected by heuristic model"

        return ModelScore(
            anomaly_score=round(score, 4),
            classification=classification,
            explanation=reason,
            model_breakdown={"heuristic": round(score, 4)},
        )

    def _classification(self, score: float) -> str:
        if score >= self.critical_threshold:
            return "critical"
        if score >= self.suspicious_threshold:
            return "suspicious"
        return "normal"
