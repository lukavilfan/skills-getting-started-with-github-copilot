import unittest

from fastapi.testclient import TestClient

from src.app import activities, app


class ActivityUnregistrationTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.participants = activities["Chess Club"]["participants"]
        original_participants = self.participants[:]
        self.addCleanup(self.participants.__setitem__, slice(None), original_participants)

    def test_unregister_frees_a_spot_without_removing_other_students(self):
        capacity = activities["Chess Club"]["max_participants"]
        email = "student+tag@example.test"
        self.participants[:] = [
            f"student{index}@example.test" for index in range(capacity - 1)
        ] + [email]
        other_participants = self.participants[:-1]

        full = self.client.post("/activities/Chess%20Club/signup", params={"email": "new@example.test"})
        self.assertEqual(full.status_code, 409)

        response = self.client.delete("/activities/Chess%20Club/signup", params={"email": email})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], f"Unregistered {email} from Chess Club")
        self.assertEqual(self.client.get("/activities").json()["Chess Club"]["participants"], other_participants)

        signup = self.client.post("/activities/Chess%20Club/signup", params={"email": email})
        self.assertEqual(signup.status_code, 200)
        self.assertEqual(self.participants, other_participants + [email])

    def test_unregister_rejects_missing_activity_or_participant(self):
        original_participants = self.participants[:]
        cases = [
            ("/activities/Unknown/signup", "Activity not found"),
            ("/activities/Chess%20Club/signup", "Student not signed up for this activity"),
        ]
        for path, detail in cases:
            with self.subTest(path=path):
                response = self.client.delete(path, params={"email": "missing@example.test"})
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.json()["detail"], detail)
                self.assertEqual(self.participants, original_participants)


if __name__ == "__main__":
    unittest.main()
