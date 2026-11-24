"""Offline safety tests: no credentials, cloud access or project mutation."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("setup", Path(__file__).resolve().parents[1] / "scripts/setup-cloud-shell.py")
setup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup)


class FakeClient:
    def __init__(self, responses):
        self.responses = responses
        self.calls = []

    def call(self, service, method, path, body=None, query=None):
        self.calls.append((service, method, path, body, query))
        key = (service, method, path)
        response = self.responses.get(key)
        if key not in self.responses:
            raise AssertionError(f"Unexpected request {key}")
        if isinstance(response, Exception):
            raise response
        return response(body, query) if callable(response) else response


class SetupSafetyTests(unittest.TestCase):
    def test_wrong_project_number_cannot_mutate(self):
        client = FakeClient({("firebase", "GET", f"projects/{setup.PROJECT}"): {
            "projectId": setup.PROJECT, "projectNumber": "123", "state": "ACTIVE"}})
        with self.assertRaises(setup.SetupError):
            setup.run(client, True, "rules", [], [])
        self.assertTrue(all(call[1] == "GET" for call in client.calls))

    def test_existing_database_is_never_migrated(self):
        client = FakeClient({
            ("firebase", "GET", f"projects/{setup.PROJECT}"): {
                "projectId": setup.PROJECT, "projectNumber": setup.NUMBER, "state": "ACTIVE"},
            ("firestore", "GET", setup.DB): {"locationId": "nam5", "type": "FIRESTORE_NATIVE", "databaseEdition": "STANDARD"},
        })
        with self.assertRaises(setup.SetupError):
            setup.run(client, True, "rules", [], [])
        self.assertTrue(all(call[1] == "GET" for call in client.calls))

    def test_uninitialized_auth_remains_pending_without_initialize_call(self):
        client = FakeClient({("auth", "GET", setup.CONFIG): setup.ApiError(404, "NOT_FOUND")})
        report = []
        setup.setup_auth(client, True, report)
        self.assertEqual(len(client.calls), 1)
        self.assertEqual(report[0][0], "PENDING")
        self.assertIn("Get started", report[0][1])

    def test_auth_preserves_domains_and_only_enables_existing_provider(self):
        config = {"authorizedDomains": ["localhost", "example.edu"], "signIn": {"email": {"enabled": True}}}
        provider = {"clientId": "existing-client", "clientSecret": "must-not-be-printed", "enabled": False}
        def patch_config(body, query):
            self.assertEqual(query, {"updateMask": "signIn.anonymous.enabled,authorizedDomains"})
            self.assertEqual(body["authorizedDomains"], ["localhost", "example.edu", setup.DOMAIN])
            self.assertEqual(body["signIn"], {"anonymous": {"enabled": True}})
            config["authorizedDomains"] = body["authorizedDomains"]
            config["signIn"]["anonymous"] = body["signIn"]["anonymous"]
            return config
        def patch_provider(body, query):
            self.assertEqual(body, {"enabled": True})
            self.assertEqual(query, {"updateMask": "enabled"})
            provider.update(body)
            return provider
        client = FakeClient({
            ("auth", "GET", setup.CONFIG): config,
            ("auth", "PATCH", setup.CONFIG): patch_config,
            ("auth", "GET", setup.GOOGLE): provider,
            ("auth", "PATCH", setup.GOOGLE): patch_provider,
        })
        report = []
        setup.setup_auth(client, True, report)
        self.assertTrue(all(status == "READY" for status, _ in report))
        self.assertTrue(config["signIn"]["email"]["enabled"])
        self.assertNotIn("must-not-be-printed", str(report))

    def test_absent_google_provider_is_not_fabricated(self):
        client = FakeClient({
            ("auth", "GET", setup.CONFIG): {"authorizedDomains": [setup.DOMAIN], "signIn": {"anonymous": {"enabled": True}}},
            ("auth", "GET", setup.GOOGLE): setup.ApiError(404, "NOT_FOUND"),
        })
        report = []
        setup.setup_auth(client, True, report)
        self.assertEqual(report[-1][0], "PENDING")
        self.assertTrue(all(call[1] == "GET" for call in client.calls))

    def test_custom_rules_cannot_be_overwritten(self):
        name = f"projects/{setup.PROJECT}/rulesets/existing"
        client = FakeClient({
            ("rules", "GET", setup.RELEASE): {"rulesetName": name},
            ("rules", "GET", name): {"source": {"files": [{"content": "custom rules"}]}},
        })
        with self.assertRaises(setup.SetupError):
            setup.inspect_rules(client, "new application rules")
        self.assertTrue(all(call[1] == "GET" for call in client.calls))

    def test_url_regex_difference_is_not_hidden_as_a_comment(self):
        name = f"projects/{setup.PROJECT}/rulesets/existing"
        existing = "allow write: if value.matches('https?://unsafe.example');"
        expected = "allow write: if value.matches('https?://trusted.example');"
        client = FakeClient({
            ("rules", "GET", setup.RELEASE): {"rulesetName": name},
            ("rules", "GET", name): {"source": {"files": [{"content": existing}]}},
        })
        with self.assertRaises(setup.SetupError):
            setup.inspect_rules(client, expected)
        self.assertTrue(all(call[1] == "GET" for call in client.calls))


if __name__ == "__main__":
    unittest.main()
