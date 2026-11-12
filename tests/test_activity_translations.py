def test_every_activity_has_complete_slovenian_details(client):
    endpoint = "/activities"

    response = client.get(endpoint)

    assert response.status_code == 200
    assert response.json()
    for details in response.json().values():
        translated = details["translations"]["sl"]
        for field in ("name", "description", "schedule"):
            assert translated[field].strip(), field
        assert isinstance(details["participants"], list)


def test_signup_uses_the_original_activity_identifier(client, activity_data):
    email = "translation-test@example.test"
    expected_translation = activity_data["Art Club"]["translations"]["sl"].copy()

    response = client.post(
        "/activities/Art%20Club/signup", params={"email": email}
    )
    listing = client.get("/activities")

    assert response.status_code == 200
    assert listing.status_code == 200
    activity = listing.json()["Art Club"]
    assert email in activity["participants"]
    assert activity["translations"]["sl"] == expected_translation
    assert activity["translations"]["sl"]["name"] == "Likovni krožek"
