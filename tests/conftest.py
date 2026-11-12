from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from src import app as app_module


@pytest.fixture
def activity_data(monkeypatch):
    data = deepcopy(app_module.activities)
    monkeypatch.setattr(app_module, "activities", data)
    return data


@pytest.fixture
def client(activity_data):
    with TestClient(app_module.app) as test_client:
        yield test_client
