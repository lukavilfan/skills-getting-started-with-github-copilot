from copy import deepcopy

import pytest


def test_unregister_removes_only_the_requested_student(client, activity_data):
    email = "student+tag@example.test"
    participants = activity_data["Chess Club"]["participants"]
    participants.append(email)
    expected_participants = participants[:-1]

    response = client.delete(
        "/activities/Chess%20Club/signup", params={"email": email}
    )
    listing = client.get("/activities")

    assert response.status_code == 200
    assert response.json() == {
        "message": f"Unregistered {email} from Chess Club"
    }
    assert listing.status_code == 200
    assert listing.json()["Chess Club"]["participants"] == expected_participants


def test_unregister_frees_a_spot_without_removing_other_students(
    client, activity_data
):
    activity = activity_data["Chess Club"]
    email = "student+tag@example.test"
    other_participants = [
        f"student{index}@example.test"
        for index in range(activity["max_participants"] - 1)
    ]
    activity["participants"] = other_participants + [email]

    removal = client.delete(
        "/activities/Chess%20Club/signup", params={"email": email}
    )
    participants_after_removal = list(activity["participants"])
    signup = client.post(
        "/activities/Chess%20Club/signup", params={"email": email}
    )

    assert removal.status_code == 200
    assert removal.json() == {
        "message": f"Unregistered {email} from Chess Club"
    }
    assert participants_after_removal == other_participants
    assert signup.status_code == 200
    assert activity["participants"] == other_participants + [email]


@pytest.mark.parametrize(
    ("activity_name", "detail"),
    [
        ("Unknown", "Activity not found"),
        ("Chess Club", "Student not signed up for this activity"),
    ],
)
def test_unregister_rejects_missing_activity_or_participant(
    client, activity_data, activity_name, detail
):
    original_data = deepcopy(activity_data)
    email = "missing@example.test"

    response = client.delete(
        f"/activities/{activity_name}/signup", params={"email": email}
    )

    assert response.status_code == 404
    assert response.json() == {"detail": detail}
    assert activity_data == original_data
