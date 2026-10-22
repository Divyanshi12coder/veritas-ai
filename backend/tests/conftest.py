import os
import sys
from pathlib import Path

# Configure the environment BEFORE the app is imported.
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["LLM_PROVIDER"] = "none"
os.environ["RATE_LIMIT_PER_MINUTE"] = "1000"
os.environ.pop("TRANSFORMER_MODEL", None)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import get_settings  # noqa: E402

ARTIFACTS = Path(get_settings().model_dir)
needs_models = pytest.mark.skipif(not (ARTIFACTS / "tfidf_lr.joblib").exists(), reason="run `python ml/train.py` first")

FAKE_TEXT = (
    "SHOCKING!!! The mainstream media won't tell you this, but a simple kitchen ingredient cures cancer in 7 days and Big Pharma "
    "has been hiding it for decades. This is 100% PROOF that the system is lying to you! An anonymous insider says doctors are "
    "forbidden from telling patients. Everyone knows the truth, so share before it's deleted! Wake up, people! They don't want "
    "you to know what they're hiding, and the deep state is terrified of you finding out."
)
REAL_TEXT = (
    "The city council voted 5-2 on Tuesday to approve a $4.2 million budget for the public library system, according to council "
    "documents. Council member Daniel Reyes said library visits were up about 12 percent compared with last year. A spokesperson "
    "for the library told reporters that staff would announce the new schedule by the end of the month. The finance office reported "
    "that the budget would be covered by existing reserves and a state grant."
)


@pytest.fixture(scope="session")
def client():
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture()
def db():
    from app.database import SessionLocal, init_db

    init_db()
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()
