import json, tempfile, unittest
from pathlib import Path
from home_lab.observer import load_allowlist, scan, ObservationError
from home_lab.store import Store
from home_lab.model import OllamaClient, ModelError
from home_lab.experiments import retrieve

class Task2Tests(unittest.TestCase):
    def test_observer_allowlist_and_dedup(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d); doc=root/'a.md'; doc.write_text('texto seguro',encoding='utf-8')
            cfg=root/'c.json'; cfg.write_text(json.dumps({'sources':[{'id':'a','domain':'brain','path':str(doc)}]}),encoding='utf-8')
            s=Store(root/'db.sqlite'); first=scan(s,cfg); scan(s,cfg)
            self.assertEqual(first[0]['sha256'], first[0]['sha256']); self.assertEqual(len(s.list_events()),1)
    def test_observer_rejects_injection_and_bad_path(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d); cfg=root/'c.json'; cfg.write_text(json.dumps({'sources':[{'id':'x\" OR 1=1','domain':'brain','path':str(root/'x.py')}]}),encoding='utf-8')
            with self.assertRaises(ObservationError): load_allowlist(cfg)
    def test_model_rejects_invented_source(self):
        def transport(payload):
            return json.dumps({'message':{'content':json.dumps([{'title':'t','body':'b','reason':'r','verification':'v','kind':'hypothesis','sources':[{'source_id':'other','sha256':'0'*64}]}])}}).encode()
        with self.assertRaises(ModelError): OllamaClient(transport=transport).propose('brain',[{'source_id':'a','sha256':'1'*64}],'x')
    def test_retrieval_is_deterministic_and_bounded(self):
        docs=[{'source_id':'b','text':'alpha beta'},{'source_id':'a','text':'alpha'}]
        self.assertEqual([x['source_id'] for x in retrieve('alpha',docs)],['a','b'])
        with self.assertRaises(ValueError): retrieve('x',docs,topk=0)
