import unittest

from fastapi.testclient import TestClient

from src.app import activities, app


class ActivityTranslationTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_every_activity_has_complete_slovenian_details(self):
        response = self.client.get("/activities")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json())

        for name, details in response.json().items():
            with self.subTest(activity=name):
                translated = details["translations"]["sl"]
                for field in ("name", "description", "schedule"):
                    self.assertTrue(translated[field].strip(), field)
                self.assertIsInstance(details["participants"], list)

    def test_signup_uses_the_original_activity_identifier(self):
        participants = activities["Art Club"]["participants"]
        original_participants = participants[:]
        self.addCleanup(participants.__setitem__, slice(None), original_participants)
        email = "translation-test@example.test"

        response = self.client.post("/activities/Art%20Club/signup", params={"email": email})
        self.assertEqual(response.status_code, 200)
        activity = self.client.get("/activities").json()["Art Club"]
        self.assertIn(email, activity["participants"])
        self.assertEqual(activity["translations"]["sl"]["name"], "Likovni krožek")


if __name__ == "__main__":
    unittest.main()
