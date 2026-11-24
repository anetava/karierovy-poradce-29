"""Verify scoped rule publication against synthetic API responses, without credentials."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('rule_upgrade', ROOT / 'scripts/upgrade-selection-rules.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
TARGET = (ROOT / 'firebase/firestore.rules').read_bytes().decode()


class RulesAPI:
    def __init__(self, previous='old'):
        self.old = f'{mod.RULESETS}/old'
        self.target = f'{mod.RULESETS}/target'
        self.active = self.old
        self.rev = 'one'
        self.sources = {self.old: previous}
        self.writes = []
        self.race = False

    def __call__(self, method, url, body=None):
        if method != 'GET':
            self.writes.append(method)
        if url == mod.PROJECT_URL:
            return {'projectId': mod.PROJECT, 'projectNumber': mod.NUMBER, 'state': 'ACTIVE'}
        if url == f'{mod.API}/{mod.RULESETS}' and method == 'POST':
            self.sources[self.target] = body['source']['files'][0]['content']
            if self.race:
                self.rev = 'external-edit'
            return {'name': self.target}
        if url == f'{mod.API}/{mod.RELEASE}':
            if method == 'PATCH':
                assert body['release']['name'] == mod.RELEASE and body['updateMask'] == 'rulesetName'
                self.active = body['release']['rulesetName']
                self.rev = 'two'
            return {'rulesetName': self.active, 'updateTime': self.rev}
        name = url.removeprefix(mod.API + '/')
        return {'source': {'files': [{'name': 'firestore.rules', 'content': self.sources[name]}]}}


class UpgradeTests(unittest.TestCase):
    def test_publishes_once_then_reads_only(self):
        self.assertEqual(mod.digest(TARGET), mod.NEW)
        api = RulesAPI()
        with patch.object(mod, 'OLD', mod.digest('old')):
            mod.upgrade(api, TARGET)
            self.assertEqual(api.writes, ['POST', 'PATCH'])
            mod.upgrade(api, TARGET)
            self.assertEqual(api.writes, ['POST', 'PATCH'])

    def test_unknown_active_rules_and_changed_local_file(self):
        api = RulesAPI(previous='another-source')
        for local in [TARGET, TARGET + ' ']:
            with self.assertRaises(mod.Refused):
                mod.upgrade(api, local)
            self.assertEqual(api.writes, [])

    def test_competing_edit_stops_activation(self):
        api = RulesAPI()
        api.race = True
        with patch.object(mod, 'OLD', mod.digest('old')), self.assertRaises(mod.Refused):
            mod.upgrade(api, TARGET)
        self.assertEqual(api.writes, ['POST'])
        self.assertEqual(api.active, api.old)

    def test_unknown_identifier_rejected(self):
        api = RulesAPI()
        api.active = 'projects/unrelated/rulesets/other'
        with self.assertRaises(mod.Refused):
            mod.upgrade(api, TARGET)
        self.assertEqual(api.writes, [])


if __name__ == '__main__':
    unittest.main()
