from copy import deepcopy

import pytest


def test_root_redirects_to_static_index(client):
    endpoint = "/"

    response = client.get(endpoint, follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"] == "/static/index.html"


def test_static_index_serves_html(client):
    endpoint = "/static/index.html"

    response = client.get(endpoint)

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "<html" in response.text.lower()


def test_get_activities_returns_details_and_participants(client, activity_data):
    endpoint = "/activities"
    expected_data = deepcopy(activity_data)

    response = client.get(endpoint)

    assert response.status_code == 200
    assert response.json() == expected_data
    assert activity_data == expected_data
    for details in response.json().values():
        assert isinstance(details["description"], str)
        assert isinstance(details["schedule"], str)
        assert isinstance(details["max_participants"], int)
        assert isinstance(details["participants"], list)
        assert isinstance(details["translations"], dict)


def test_signup_adds_student_without_removing_existing_students(
    client, activity_data
):
    email = "student+tag@example.test"
    expected_data = deepcopy(activity_data)
    expected_data["Chess Club"]["participants"].append(email)

    response = client.post(
        "/activities/Chess%20Club/signup", params={"email": email}
    )
    listing = client.get("/activities")

    assert response.status_code == 200
    assert response.json() == {"message": f"Signed up {email} for Chess Club"}
    assert listing.status_code == 200
    assert listing.json() == expected_data
    assert activity_data == expected_data


@pytest.mark.parametrize(
    ("activity_name", "full", "email", "status_code", "detail"),
    [
        ("Unknown", False, "new@example.test", 404, "Activity not found"),
        (
            "Chess Club", False, "michael@mergington.edu",
            409, "Student already signed up for this activity",
        ),
        ("Chess Club", True, "new@example.test", 409, "Activity is full"),
        (
            "Chess Club", True, "michael@mergington.edu",
            409, "Student already signed up for this activity",
        ),
    ],
)
def test_signup_rejects_invalid_requests_without_changing_data(
    client, activity_data, activity_name, full, email, status_code, detail
):
    if full:
        activity = activity_data[activity_name]
        activity["participants"].extend(
            f"student{index}@example.test"
            for index in range(
                activity["max_participants"] - len(activity["participants"])
            )
        )
    original_data = deepcopy(activity_data)

    response = client.post(
        f"/activities/{activity_name}/signup", params={"email": email}
    )

    assert response.status_code == status_code
    assert response.json() == {"detail": detail}
    assert activity_data == original_data


def test_signup_accepts_last_available_place_then_rejects_next_student(
    client, activity_data
):
    activity = activity_data["Chess Club"]
    original_participants = [
        f"student{index}@example.test"
        for index in range(activity["max_participants"] - 1)
    ]
    activity["participants"] = original_participants.copy()
    last_email = "last@example.test"

    last_signup = client.post(
        "/activities/Chess%20Club/signup", params={"email": last_email}
    )
    overflow_signup = client.post(
        "/activities/Chess%20Club/signup",
        params={"email": "overflow@example.test"},
    )

    assert last_signup.status_code == 200
    assert last_signup.json() == {
        "message": f"Signed up {last_email} for Chess Club"
    }
    assert overflow_signup.status_code == 409
    assert overflow_signup.json() == {"detail": "Activity is full"}
    assert activity["participants"] == original_participants + [last_email]
    assert len(activity["participants"]) == activity["max_participants"]


@pytest.mark.parametrize("method", ["post", "delete"])
def test_signup_endpoints_require_email(client, activity_data, method):
    original_data = deepcopy(activity_data)
    endpoint = "/activities/Chess%20Club/signup"

    response = client.request(method, endpoint)

    assert response.status_code == 422
    assert any(
        error["loc"] == ["query", "email"]
        for error in response.json()["detail"]
    )
    assert activity_data == original_data
