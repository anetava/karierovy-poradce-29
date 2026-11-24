#!/usr/bin/env python3
"""Publikuje prověřenou revizi pravidel pro výběr případu. Spouštějte bez další souběžné publikace pravidel."""

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

PROJECT = 'pravni-audit-ai'
NUMBER = '205779594399'
OLD = '99628f4351e949e2ef021e5577d7ef4c4095aa0ad78c6a34ef8ec934dc1bb2e7'
NEW = '82e377f91e0f7f75e9204862a28fb273b9abd7a0d0b171d11e73b0b677b46c7b'
PROJECT_URL = f'https://firebase.googleapis.com/v1beta1/projects/{PROJECT}'
API = 'https://firebaserules.googleapis.com/v1'
RELEASE = f'projects/{PROJECT}/releases/cloud.firestore'
RULESETS = f'projects/{PROJECT}/rulesets'


class Refused(Exception):
    pass


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def digest(source):
    return hashlib.sha256(source.encode('utf-8')).hexdigest()


def ruleset_name(name):
    if not isinstance(name, str) or not re.fullmatch(rf'projects/(?:{PROJECT}|{NUMBER})/rulesets/[A-Za-z0-9_-]+', name):
        raise Refused('Google vrátil neočekávaný název sady pravidel.')
    return name


def source_digest(call, name):
    source = call('GET', f'{API}/{ruleset_name(name)}').get('source', {}).get('files', [])
    if len(source) != 1 or not isinstance(source[0].get('content'), str):
        raise Refused('Sada pravidel nemá očekávaný tvar.')
    return digest(source[0]['content'])


def upgrade(call, source):
    if digest(source) != NEW:
        raise Refused('Soubor pravidel v balíku neodpovídá ověřené verzi.')
    project = call('GET', PROJECT_URL)
    if (project.get('projectId'), str(project.get('projectNumber')), project.get('state')) != (PROJECT, NUMBER, 'ACTIVE'):
        raise Refused('Identitu aktivního projektu se nepodařilo ověřit.')
    release_url = f'{API}/{RELEASE}'
    original = call('GET', release_url)
    previous = source_digest(call, original.get('rulesetName'))
    if previous == NEW:
        return 'Požadovaná pravidla jsou již aktivní.'
    if previous != OLD or not original.get('updateTime'):
        raise Refused('Nasazená pravidla se liší od známé předchozí revize nebo chybí čas vydání.')
    candidate = call('POST', f'{API}/{RULESETS}', {'source': {'files': [{'name': 'firestore.rules', 'content': source}]}})
    candidate_name = ruleset_name(candidate.get('name'))
    if source_digest(call, candidate_name) != NEW:
        raise Refused('Vytvořená sada v Google neodpovídá prověřenému obsahu. Publikování zastaveno.')
    # The API models rulesets as immutable. A moved release is a separate edit,
    # even when another publisher has restored its earlier ruleset target.
    latest = call('GET', release_url)
    if (latest.get('rulesetName'), latest.get('updateTime')) != (original['rulesetName'], original['updateTime']):
        raise Refused('Jiná publikace mezitím změnila aktivní revizi. Publikování zastaveno.')
    call('PATCH', release_url, {'release': {'name': RELEASE, 'rulesetName': candidate_name}, 'updateMask': 'rulesetName'})
    active = call('GET', release_url)
    if active.get('rulesetName') != candidate_name or source_digest(call, candidate_name) != NEW:
        raise Refused('Po publikování se nepodařilo potvrdit přesnou aktivní revizi. Zkontrolujte Firebase Console.')
    return f'Nasazená pravidla ověřena. SHA-256 {NEW}'


def main():
    path = Path(__file__).resolve().parent.parent / 'firebase' / 'firestore.rules'
    try:
        source = path.read_bytes().decode('utf-8')
        credentials = subprocess.run(['gcloud', 'auth', 'print-access-token'], check=True, capture_output=True, text=True, timeout=60)
        token = credentials.stdout.strip()
        if not token or any(character.isspace() for character in token):
            raise Refused('Cloud Shell nevrátil platné pověření.')
        opener = build_opener(NoRedirect())

        def call(method, url, body=None):
            headers = {'Authorization': f'Bearer {token}', 'X-Goog-User-Project': PROJECT, 'Content-Type': 'application/json'}
            request = Request(url, method=method, headers=headers, data=json.dumps(body).encode('utf-8') if body else None)
            with opener.open(request, timeout=30) as response:
                return json.load(response)

        print(upgrade(call, source))
        return 0
    except Refused as error:
        print(str(error), file=sys.stderr)
    except HTTPError as error:
        print(f'Google API vrátilo HTTP {error.code}. Zkontrolujte oprávnění a aktivní revizi v konzoli.', file=sys.stderr)
    except (OSError, URLError, ValueError, KeyError, TypeError, AttributeError, subprocess.SubprocessError):
        print('Nepodařilo se načíst balík, autorizovat Cloud Shell nebo potvrdit odpověď Google. Opakování znovu ověří aktuální stav.', file=sys.stderr)
    return 1


if __name__ == '__main__':
    sys.exit(main())
