#!/usr/bin/env python3
"""Read-only project verification. Run with python3 in an authorized Google Cloud Shell."""

import hashlib
import json
import re
import subprocess
import sys
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener


PROJECT = 'pravni-audit-ai'
NUMBER = '205779594399'
APP_ID = '1:205779594399:web:d3f720e5f920d438f786aa'
LEGACY_RULES_SHA256 = '99628f4351e949e2ef021e5577d7ef4c4095aa0ad78c6a34ef8ec934dc1bb2e7'
EXPECTED_RULES_SHA256 = '82e377f91e0f7f75e9204862a28fb273b9abd7a0d0b171d11e73b0b677b46c7b'
FIRESTORE = f'https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)'
AUTH = f'https://identitytoolkit.googleapis.com/admin/v2/projects/{PROJECT}'
RULES = 'https://firebaserules.googleapis.com/v1'


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def verify(get, emit=print):
    success = True

    def check(label, read):
        nonlocal success
        try:
            valid, detail = read()
        except HTTPError as error:
            valid, detail = False, f'HTTP {error.code}'
        except (OSError, ValueError, KeyError, TypeError, URLError):
            valid, detail = False, 'odpověď Google API se nepodařilo ověřit'
        success = success and valid
        emit(f'{"OK" if valid else "NEOVĚŘENO"} | {label} | {detail}')
        return valid

    def project():
        data = get(f'https://firebase.googleapis.com/v1beta1/projects/{PROJECT}')
        return (data.get('projectId') == PROJECT and str(data.get('projectNumber')) == NUMBER
                and data.get('state') == 'ACTIVE', f'{PROJECT} / {NUMBER}')

    def app():
        data = get(f'https://firebase.googleapis.com/v1beta1/projects/{PROJECT}/webApps/{APP_ID}')
        return data.get('appId') == APP_ID and data.get('state') == 'ACTIVE', APP_ID

    def database():
        data = get(FIRESTORE)
        edition = data.get('databaseEdition', 'STANDARD')
        result = [str(data.get('locationId')), str(data.get('type')), str(edition)]
        return result == ['europe-west3', 'FIRESTORE_NATIVE', 'STANDARD'], ' / '.join(result)

    def published_rules():
        release = get(f'{RULES}/projects/{PROJECT}/releases/cloud.firestore')
        name = release.get('rulesetName', '')
        if not re.fullmatch(rf'projects/(?:{PROJECT}|{NUMBER})/rulesets/[a-zA-Z0-9_-]+', name):
            return False, 'neočekávaný odkaz na aktivní sadu pravidel'
        files = get(f'{RULES}/{name}').get('source', {}).get('files', [])
        if len(files) != 1:
            return False, 'počet zdrojových souborů se liší od otestované verze'
        source = files[0]['content']
        digest = hashlib.sha256(source.encode('utf-8')).hexdigest()
        if digest == LEGACY_RULES_SHA256:
            return False, f'původní otestovaná pravidla ({digest}); odpovědi lze ukládat, samostatnou volbu případu tato verze nepovoluje'
        if digest != EXPECTED_RULES_SHA256:
            return False, f'jiný zdroj než obě prověřené verze; SHA-256 {digest}'
        return True, f'ověřena verze s volbou případu; SHA-256 {digest}'

    def index(group, field):
        data = get(f'{FIRESTORE}/collectionGroups/{group}/fields/{field}')
        config = data.get('indexConfig')
        if not isinstance(config, dict):
            return False, 'chybí výslovné nastavení indexu'
        if config.get('reverting') or config.get('usesAncestorConfig'):
            return False, 'zděděné nastavení nebo probíhající návrat ke zděděné konfiguraci'
        if config.get('indexes', []):
            return False, 'pro pole se vytváří nejméně jeden index'
        return True, 'vlastní výjimka bez indexů'

    def anonymous():
        config = get(f'{AUTH}/config')
        enabled = config.get('signIn', {}).get('anonymous', {}).get('enabled') is True
        domain = 'anetava.github.io' in config.get('authorizedDomains', [])
        return enabled and domain, f'anonymní přihlášení {"ano" if enabled else "ne"}, doména GitHub Pages {"ano" if domain else "ne"}'

    def google():
        data = get(f'{AUTH}/defaultSupportedIdpConfigs/google.com?fields=enabled,clientId')
        enabled = data.get('enabled') is True and bool(data.get('clientId'))
        return enabled, 'zapnuto' if enabled else 'neaktivní nebo chybí ID klienta'

    if not check('Identita projektu', project):
        return False
    check('Registrovaná webová aplikace', app)
    check('Výchozí databáze', database)
    check('Nasazená pravidla odpovídají testované verzi', published_rules)
    for group, field in [('cases', 'record'), ('history', 'record'), ('students', 'caseSummaries')]:
        check(f'Výjimka {group}.{field}', lambda: index(group, field))
    check('Přístup studentů', anonymous)
    check('Přihlašování Google', google)
    return success


def main():
    try:
        cli = subprocess.run(['gcloud', 'auth', 'print-access-token'], capture_output=True,
                             text=True, check=True, timeout=60)
        token = cli.stdout.strip()
        if not token or any(char.isspace() for char in token):
            raise ValueError('token')
    except (OSError, ValueError, subprocess.SubprocessError):
        print('Přihlášený účet v Google Cloud Shell není k dispozici.')
        return 2
    opener = build_opener(NoRedirect())

    def get(url):
        request = Request(url, method='GET', headers={'Authorization': f'Bearer {token}',
                                                     'X-Goog-User-Project': PROJECT})
        with opener.open(request, timeout=25) as response:
            return json.load(response)

    return 0 if verify(get) else 1


if __name__ == '__main__':
    sys.exit(main())
