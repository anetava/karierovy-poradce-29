#!/usr/bin/env python3
"""Narrow, rerunnable Firebase bootstrap for pravni-audit-ai. Python 3 + gcloud.

No login, billing/IAM changes, database deletion, OAuth client creation or web
deployment. Authentication must already have been started in Firebase Console.
Use --plan offline, --check for authenticated reads, or --apply for setup.
"""

import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, build_opener, HTTPRedirectHandler

PROJECT = "pravni-audit-ai"
NUMBER = "205779594399"
LOCATION = "europe-west3"
DOMAIN = "anetava.github.io"
ROOT = Path(__file__).resolve().parent.parent
BASES = {
    "firebase": "https://firebase.googleapis.com/v1beta1/",
    "firestore": "https://firestore.googleapis.com/v1/",
    "rules": "https://firebaserules.googleapis.com/v1/",
    "auth": "https://identitytoolkit.googleapis.com/admin/v2/",
}
DB = f"projects/{PROJECT}/databases/(default)"
RELEASE = f"projects/{PROJECT}/releases/cloud.firestore"
CONFIG = f"projects/{PROJECT}/config"
GOOGLE = f"projects/{PROJECT}/defaultSupportedIdpConfigs/google.com"
EXPECTED_FIELDS = {("cases", "record"), ("history", "record"), ("students", "caseSummaries")}


class SetupError(Exception):
    pass


class ApiError(SetupError):
    def __init__(self, code, status, reason=""):
        self.code = code
        self.status = status
        self.reason = reason
        super().__init__(f"Google API HTTP {code}: {status}" + (f" ({reason})" if reason else ""))


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Never forward a bearer token to a redirect destination.
        return None


def gcloud(*args):
    try:
        result = subprocess.run(["gcloud", *args, "--quiet"], capture_output=True,
                                text=True, check=False, timeout=90)
    except (OSError, subprocess.TimeoutExpired):
        raise SetupError("gcloud is unavailable or authorization timed out. Use Google Cloud Shell.") from None
    if result.returncode:
        # stderr can contain credential details; deliberately do not print it.
        raise SetupError("Existing Cloud Shell authorization is unavailable. Authorize Cloud Shell, then rerun; no credential should be pasted into chat.")
    return result.stdout.strip()


class Client:
    def __init__(self):
        if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
            raise SetupError("GOOGLE_APPLICATION_CREDENTIALS is set. This script only uses the existing Cloud Shell ADC, not a key file.")
        self.token = gcloud("auth", "application-default", "print-access-token")
        if not self.token or any(c.isspace() for c in self.token):
            raise SetupError("Cloud Shell did not return a usable ADC access token.")
        self.opener = build_opener(NoRedirect())
        self.project_verified = False

    def call(self, service, method, path, body=None, query=None):
        prefixes = [f"projects/{PROJECT}"]
        if self.project_verified:
            prefixes.append(f"projects/{NUMBER}")
        if service not in BASES or not isinstance(path, str) or not any(path == prefix or path.startswith(prefix + "/") for prefix in prefixes):
            raise SetupError("Refusing an unexpected API resource.")
        url = BASES[service] + path
        if query:
            url += "?" + urlencode(query)
        data = None if body is None else json.dumps(body).encode("utf-8")
        request = Request(url, data=data, method=method, headers={
            "Authorization": "Bearer " + self.token,
            "Content-Type": "application/json",
            "X-Goog-User-Project": PROJECT,
        })
        try:
            with self.opener.open(request, timeout=40) as response:
                raw = response.read()
                return json.loads(raw) if raw else {}
        except HTTPError as error:
            try:
                payload = json.loads(error.read()).get("error", {})
            except (ValueError, AttributeError):
                payload = {}
            # Only standard status/reason identifiers are emitted, never response
            # bodies, OAuth configuration, headers or bearer tokens.
            status = payload.get("status", "REQUEST_FAILED")
            if not re.fullmatch(r"[A-Z_]+", str(status)):
                status = "REQUEST_FAILED"
            reasons = [d.get("reason", "") for d in payload.get("details", []) if isinstance(d, dict)]
            reason = next((r for r in reasons if re.fullmatch(r"[A-Z_]+", str(r))), "")
            raise ApiError(error.code, status, reason) from None
        except (URLError, TimeoutError, ValueError):
            raise SetupError("Google API request failed or timed out. No secret values were printed; rerun --check before retrying.") from None


def optional(client, service, path):
    try:
        return client.call(service, "GET", path)
    except ApiError as error:
        if error.code == 404:
            return None
        raise


def poll(client, service, operation):
    if not operation.get("name"):
        raise SetupError("Google returned no operation name; inspect the console before retrying.")
    # Bound polling, never invent an endpoint or follow an arbitrary URL.
    for _ in range(60):
        if operation.get("done"):
            if operation.get("error"):
                raise SetupError("Google reported an unsuccessful setup operation. Inspect the Firebase Console.")
            return
        time.sleep(3)
        operation = client.call(service, "GET", operation["name"])
    raise SetupError("A Google setup operation is still pending. Wait, then rerun --check; do not delete or recreate the database.")


def load_inputs():
    rules = (ROOT / "firebase/firestore.rules").read_text(encoding="utf-8")
    indexes = json.loads((ROOT / "firebase/firestore.indexes.json").read_text(encoding="utf-8"))
    fields = indexes.get("fieldOverrides", [])
    if indexes.get("indexes") != [] or len(fields) != 3 or {
        (f.get("collectionGroup"), f.get("fieldPath")) for f in fields
    } != EXPECTED_FIELDS or any(f.get("indexes") != [] or set(f) != {"collectionGroup", "fieldPath", "indexes"} for f in fields):
        raise SetupError("The bundled index definition changed. Review the setup script before applying it.")
    if "aneta.vadovicova@gmail.com" not in rules or "courses/pravni-audit-ai/students" not in rules:
        raise SetupError("The expected application rules are missing. Use the complete reviewed repository bundle.")
    return rules, fields


def compact_rules(value):
    return re.sub(r"\s+", "", re.sub(r"//[^\n]*", "", value))


def bootstrap_rules(value):
    # Only the stock Firebase deny-all or expiring test-mode template is
    # replaceable automatically. Custom rules require an explicit review.
    normalized = compact_rules(value)
    prefix = "rules_version='2';servicecloud.firestore{match/databases/{database}/documents{match/{document=**}{allowread,write:if"
    suffix = ";}}}"
    if not normalized.startswith(prefix) or not normalized.endswith(suffix):
        return False
    expression = normalized[len(prefix):-len(suffix)]
    return expression == "false" or bool(re.fullmatch(r"request.time<timestamp.date\(\d{4},\d{1,2},\d{1,2}\)", expression))


def inspect_rules(client, expected):
    release = optional(client, "rules", RELEASE)
    if release is None:
        return None, False
    name = release.get("rulesetName", "")
    if not any(name.startswith(f"projects/{project}/rulesets/") for project in (PROJECT, NUMBER)):
        raise SetupError("Unexpected Firestore ruleset resource; nothing will be overwritten.")
    source = client.call("rules", "GET", name).get("source", {}).get("files", [])
    same = len(source) == 1 and source[0].get("content", "").replace("\r\n", "\n").strip() == expected.replace("\r\n", "\n").strip()
    if not same and (len(source) != 1 or not bootstrap_rules(source[0].get("content", ""))):
        raise SetupError("The database has custom rules different from this bundle. No existing rules were overwritten; review is required.")
    return release, same


def install_rules(client, rules, release):
    # Detect a concurrent console edit before replacing a release.
    latest = optional(client, "rules", RELEASE)
    if (latest or {}).get("rulesetName") != (release or {}).get("rulesetName"):
        raise SetupError("Firestore rules changed during setup. Rerun --check; nothing was overwritten.")
    result = client.call("rules", "POST", f"projects/{PROJECT}/rulesets", {
        "source": {"files": [{"name": "firestore.rules", "content": rules}]}
    })
    name = result.get("name", "")
    if not any(name.startswith(f"projects/{project}/rulesets/") for project in (PROJECT, NUMBER)):
        raise SetupError("Google returned an unexpected ruleset; no release was changed.")
    desired = {"name": RELEASE, "rulesetName": name}
    if release is None:
        client.call("rules", "POST", f"projects/{PROJECT}/releases", desired)
    else:
        client.call("rules", "PATCH", RELEASE, {"release": desired, "updateMask": "rulesetName"})
    verified = client.call("rules", "GET", RELEASE)
    if verified.get("rulesetName") != name:
        raise SetupError("The new rules release could not be verified. Authentication was not changed.")


def setup_auth(client, apply, report):
    try:
        config = optional(client, "auth", CONFIG)
    except ApiError as error:
        report.append(("PENDING", f"Authentication configuration unavailable: {error}. Open Firebase Console → Authentication → Get started."))
        return
    if config is None:
        report.append(("PENDING", "Authentication is not initialized. Open Firebase Console → Authentication → Get started, then rerun. No paid initializeAuth API was called."))
        return
    domains = config.get("authorizedDomains", [])
    if not isinstance(domains, list) or any(not isinstance(d, str) for d in domains):
        raise SetupError("Unexpected authorized domains data; Authentication was left unchanged.")
    anonymous = config.get("signIn", {}).get("anonymous", {}).get("enabled") is True
    patch, mask = {}, []
    if not anonymous:
        patch["signIn"] = {"anonymous": {"enabled": True}}
        mask.append("signIn.anonymous.enabled")
    if DOMAIN not in domains:
        patch["authorizedDomains"] = domains + [DOMAIN]
        mask.append("authorizedDomains")
    if patch and apply:
        client.call("auth", "PATCH", CONFIG, patch, {"updateMask": ",".join(mask)})
        config = client.call("auth", "GET", CONFIG)
        anonymous = config.get("signIn", {}).get("anonymous", {}).get("enabled") is True
        if not set(domains + [DOMAIN]).issubset(set(config.get("authorizedDomains", []))):
            raise SetupError("Authorized domains could not be verified; inspect Authentication settings.")
    report.append(("READY" if anonymous else "PENDING", "Anonymous student sign-in"))
    report.append(("READY" if DOMAIN in config.get("authorizedDomains", []) else "PENDING", f"Authorized domain {DOMAIN}; existing domains retained"))
    provider = optional(client, "auth", GOOGLE)
    if not provider or not provider.get("clientId"):
        report.append(("PENDING", "Teacher Google sign-in: enable Google in Firebase Console → Authentication → Sign-in method, select the support email and save. OAuth credentials cannot be inferred from the web API key."))
        return
    if not provider.get("enabled") and apply:
        client.call("auth", "PATCH", GOOGLE, {"enabled": True}, {"updateMask": "enabled"})
        provider = client.call("auth", "GET", GOOGLE)
    report.append(("READY" if provider.get("enabled") else "PENDING", "Existing Google provider for teacher sign-in"))


def run(client, apply, rules, fields, report):
    project = client.call("firebase", "GET", f"projects/{PROJECT}")
    if project.get("projectId") != PROJECT or str(project.get("projectNumber")) != NUMBER or project.get("state") != "ACTIVE":
        raise SetupError("Firebase project ID, number or active state does not match the intended project. No changes were made.")
    client.project_verified = True
    report.append(("READY", f"Project identity verified: {PROJECT} / {NUMBER}"))
    database = optional(client, "firestore", DB)
    if database:
        if database.get("locationId") != LOCATION or database.get("type") != "FIRESTORE_NATIVE" or database.get("databaseEdition", "STANDARD") != "STANDARD":
            actual = str(database.get("locationId", "unknown"))
            actual = actual if re.fullmatch(r"[a-z0-9-]{1,40}", actual) else "unknown"
            raise SetupError(f"The existing database is located in {actual} and is not the expected Standard / Native / europe-west3 configuration. It was preserved without deletion or migration; review its existing configuration.")
    release, rules_current = inspect_rules(client, rules)
    if database is None and apply:
        operation = client.call("firestore", "POST", f"projects/{PROJECT}/databases", {
            "locationId": LOCATION, "type": "FIRESTORE_NATIVE", "databaseEdition": "STANDARD"
        }, {"databaseId": "(default)"})
        poll(client, "firestore", operation)
        database = client.call("firestore", "GET", DB)
        if database.get("locationId") != LOCATION or database.get("type") != "FIRESTORE_NATIVE" or database.get("databaseEdition", "STANDARD") != "STANDARD":
            raise SetupError("The created database has an unexpected configuration. It was preserved; inspect the console.")
        # Database creation may create stock rules, so inspect again.
        release, rules_current = inspect_rules(client, rules)
    report.append(("READY" if database else "PENDING", "Firestore (default), Standard / Native / europe-west3"))
    if not rules_current and apply:
        install_rules(client, rules, release)
        rules_current = True
    report.append(("READY" if rules_current else "PENDING", "Application Firestore security rules"))
    if database:
        ready_fields = 0
        for field in fields:
            path = f"{DB}/collectionGroups/{field['collectionGroup']}/fields/{field['fieldPath']}"
            response = client.call("firestore", "GET", path)
            current = response.get("indexConfig", {})
            ready = "indexConfig" in response and not current.get("usesAncestorConfig", False) and not current.get("indexes", [])
            if not ready and apply:
                operation = client.call("firestore", "PATCH", path, {"indexConfig": {"indexes": []}}, {"updateMask": "indexConfig"})
                poll(client, "firestore", operation)
                response = client.call("firestore", "GET", path)
                current = response.get("indexConfig", {})
                ready = "indexConfig" in response and not current.get("usesAncestorConfig", False) and not current.get("indexes", [])
            ready_fields += bool(ready)
        report.append(("READY" if ready_fields == len(fields) else "PENDING", f"Field index exemptions: {ready_fields}/{len(fields)}; other indexes and TTL policies untouched"))
    else:
        report.append(("PENDING", "Field index exemptions await database creation"))
    if apply and not rules_current:
        raise SetupError("Application security rules are not verified; sign-in configuration was not changed.")
    setup_auth(client, apply, report)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true", help="Apply only the reviewed setup changes")
    mode.add_argument("--check", action="store_true", help="Read current Google settings without changing them (default)")
    mode.add_argument("--plan", action="store_true", help="Offline plan; no authentication or network")
    args = parser.parse_args()
    report = []
    try:
        rules, fields = load_inputs()
        if args.plan:
            print(f"Target: {PROJECT} / {NUMBER}. Existing Cloud Shell ADC only.")
            print("Plan: inspect project and existing database; create (default) only if absent, Standard / Native / europe-west3.")
            print("Install bundled security rules only over stock defaults or an identical previous version.")
            print("Apply the three bundled field index exemptions; preserve other indexes and TTL settings.")
            print(f"For initialized Auth only: enable anonymous sign-in and append {DOMAIN}; enable existing Google provider only if its clientId exists.")
            print("Never initialize paid Identity Platform, change billing/IAM, delete or migrate a database, create OAuth credentials, or deploy the website.")
            return 0
        if not (os.environ.get("CLOUD_SHELL") or os.environ.get("DEVSHELL_PROJECT_ID")):
            raise SetupError("Run this script inside Google Cloud Shell, using the already signed-in console account.")
        current = gcloud("config", "get-value", "project")
        if current != PROJECT:
            raise SetupError(f"The active Cloud Shell project must be {PROJECT}. Select that project in the console and reopen Cloud Shell; this script does not change your global project configuration.")
        run(Client(), args.apply, rules, fields, report)
    except (SetupError, OSError, ValueError, KeyError) as error:
        report.append(("PENDING", str(error) if isinstance(error, SetupError) else "Bundled setup files are unavailable or invalid. Use the complete repository bundle."))
    print("\nFirebase setup status" + (" (read-only)" if not args.apply else ""))
    for status, message in report:
        print(f"{status}: {message}")
    print("PENDING: Publish the reviewed frontend to the existing GitHub Pages address and test a student save plus the teacher overview. This script does not deploy or verify the live app.")
    return 2 if any(status == "PENDING" for status, _ in report) else 0


if __name__ == "__main__":
    sys.exit(main())
