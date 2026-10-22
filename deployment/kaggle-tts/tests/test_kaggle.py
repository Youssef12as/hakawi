"""Real loopback HTTP tests and deterministic notebook validation; no GPU downloads."""
import ast
import hashlib
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import io
import json
from pathlib import Path
import sys
import threading
import tempfile
import unittest
from unittest.mock import Mock, patch

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from gateway import MAX_PAYLOAD, make_handler  # noqa: E402
from build_notebook import SOURCE_FILES, LIGHTNING, build  # noqa: E402
from demo_runtime import Demo  # noqa: E402
from runtime_env import clean_env, prepare_runtime  # noqa: E402

TOKEN = "unit-test-token-" + "x" * 32


class Upstream(BaseHTTPRequestHandler):
    calls = []

    def log_message(self, *_args):
        pass

    def handle_request(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        self.calls.append((self.command, self.path, body, self.headers.get("Authorization")))
        content = json.dumps({"status": "success", "body": body.decode()}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    do_GET = handle_request
    do_POST = handle_request


class GatewayTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.upstream = ThreadingHTTPServer(("127.0.0.1", 0), Upstream)
        cls.gateway = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(TOKEN, cls.upstream.server_port))
        cls.threads = []
        for server in [cls.upstream, cls.gateway]:
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            cls.threads.append(thread)

    @classmethod
    def tearDownClass(cls):
        for server in [cls.gateway, cls.upstream]:
            server.shutdown()
            server.server_close()
        for thread in cls.threads:
            thread.join(timeout=3)

    def request(self, method="POST", path="/", token=TOKEN, body=b'{"action":"generate"}', headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.gateway.server_port, timeout=3)
        request_headers = dict(headers or {})
        if token is not None:
            request_headers["Authorization"] = "Bearer " + token
        try:
            connection.request(method, path, body, request_headers)
            response = connection.getresponse()
            return response.status, response.read()
        finally:
            connection.close()

    def test_missing_and_wrong_key_rejected_before_upstream(self):
        before = len(Upstream.calls)
        for token in [None, "wrong", "é" * 32]:
            for method, path in [("POST", "/"), ("GET", "/health")]:
                self.assertEqual(self.request(method, path, token)[0], 401)
        self.assertEqual(len(Upstream.calls), before)

    def test_generate_and_save_body_pass_unchanged_without_secret(self):
        for action in ["generate", "save_character"]:
            body = json.dumps({"action": action, "char_name": "عم عثمان", "text": "أهلا"}).encode()
            status, _ = self.request(body=body)
            self.assertEqual(status, 200)
            self.assertEqual(Upstream.calls[-1], ("POST", "/", body, None))

    def test_protected_health(self):
        self.assertEqual(self.request("GET", "/health", body=None)[0], 200)

    def test_unknown_paths_and_query_strings_rejected(self):
        for path in ["/docs", "/health?token=secret", "http://example.com/", "/other"]:
            self.assertEqual(self.request(path=path)[0], 404)

    def test_payload_bounds_and_invalid_length(self):
        for length, expected in [(str(MAX_PAYLOAD + 1), 413), ("-1", 413), ("oops", 400), ("0", 400)]:
            self.assertEqual(self.request(body=None, headers={"Content-Length": length})[0], expected)

    def test_chunked_body_rejected(self):
        self.assertEqual(self.request(headers={"Transfer-Encoding": "chunked"})[0], 400)

    def test_short_or_invalid_key_cannot_start_gateway(self):
        for token in ["", "short", "a " * 32, "é" * 32]:
            with self.assertRaises(ValueError):
                make_handler(token)


class RuntimeTests(unittest.TestCase):
    def test_clean_environment_drops_injected_paths_preserves_gpu_and_secrets(self):
        original = {'PYTHONPATH': '/kaggle/lib', 'PYTHONHOME': '/wrong', 'PYTHONSTARTUP': '/hook',
                    'PYTHONUSERBASE': '/other', 'CUDA_VISIBLE_DEVICES': '0', 'HF_TOKEN': 'test-token'}
        cleaned = clean_env(original)
        self.assertEqual(cleaned, {'CUDA_VISIBLE_DEVICES': '0', 'HF_TOKEN': 'test-token', 'PYTHONNOUSERSITE': '1'})
        self.assertIn('PYTHONPATH', original)

    def test_existing_interpreter_without_pip_is_repaired(self):
        with patch('runtime_env.Path.exists', return_value=True), patch('runtime_env.subprocess.run') as run:
            run.side_effect = [Mock(returncode=1), Mock(returncode=0), Mock(returncode=0)]
            prepare_runtime(Path('/temporary/venv'))
        commands = [call.args[0] for call in run.call_args_list]
        self.assertIn('ensurepip', commands[1])
        self.assertIn('wrapt', commands[2])
        self.assertTrue(all('-I' in command for command in commands))

    def test_missing_ensurepip_uses_host_pip_target_interpreter(self):
        with patch('runtime_env.Path.exists', return_value=True), patch('runtime_env.subprocess.run') as run:
            run.side_effect = [Mock(returncode=1), Mock(returncode=1), Mock(returncode=0), Mock(returncode=0)]
            prepare_runtime(Path('/temporary/venv'))
        command = run.call_args_list[2].args[0]
        self.assertEqual(command[0], sys.executable)
        self.assertIn('--python', command)

    def test_exited_process_fails_health_without_waiting(self):
        demo = Demo(HERE, Path(sys.executable), TOKEN)
        demo.processes['model'] = Mock(poll=Mock(return_value=1), returncode=1)
        with self.assertRaisesRegex(RuntimeError, 'model exited'):
            demo.wait_health('http://127.0.0.1:1/health', 'model')

    def test_start_tunnel_refuses_unverified_binary(self):
        for digest in ['', 'sha256:' + '0' * 64]:
            with self.subTest(digest=digest), tempfile.TemporaryDirectory() as directory:
                demo = Demo(Path(directory), Path(sys.executable), TOKEN)
                demo.processes['gateway'] = Mock(poll=Mock(return_value=None))
                metadata = json.dumps({'assets': [{'name': 'cloudflared-linux-amd64',
                                                  'digest': digest,
                                                  'browser_download_url': 'https://example.com/binary'}]}).encode()
                with patch('demo_runtime.urllib.request.urlopen', side_effect=[io.BytesIO(metadata), io.BytesIO(b'wrong binary')]):
                    with self.assertRaisesRegex(RuntimeError, 'digest|checksum'):
                        demo.start_tunnel()
                self.assertNotIn('tunnel', demo.processes)
                self.assertFalse((Path(directory) / 'cloudflared').exists())

    def test_stop_terminates_only_owned_processes(self):
        demo = Demo(HERE, Path(sys.executable), TOKEN)
        process = Mock(poll=Mock(return_value=None), pid=12345)
        demo.processes['tunnel'] = process
        demo.url = 'https://example.trycloudflare.com'
        with patch('demo_runtime.os.killpg', create=True) as kill:
            demo.stop('tunnel')
        self.assertEqual(kill.call_count, 1)
        self.assertEqual(kill.call_args.args[0], 12345)
        process.wait.assert_called_once_with(timeout=15)
        self.assertIsNone(demo.url)

    def test_smoke_requires_public_url(self):
        demo = Demo(HERE, Path(sys.executable), TOKEN)
        with self.assertRaisesRegex(RuntimeError, 'Start the tunnel'):
            demo.smoke(public=True)


class NotebookTests(unittest.TestCase):
    def test_all_code_cells_compile(self):
        for index, cell in enumerate(build()["cells"]):
            if cell["cell_type"] == "code":
                compile(cell["source"], f"cell-{index}", "exec")

    def test_embedded_sources_match_current_deployment(self):
        unpack = next(cell for cell in build()["cells"] if "FILES = " in cell["source"])
        assignments = {}
        for node in ast.parse(unpack["source"]).body:
            if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name):
                if node.targets[0].id in {"FILES", "MANIFEST"}:
                    assignments[node.targets[0].id] = ast.literal_eval(node.value)
        for name in SOURCE_FILES:
            self.assertEqual(assignments["FILES"][name], (LIGHTNING / name).read_text(encoding="utf-8"))
        for name, content in assignments["FILES"].items():
            self.assertEqual(hashlib.sha256(content.encode()).hexdigest(), assignments["MANIFEST"][name])

    def test_artifact_has_no_outputs_and_is_current(self):
        artifact = json.loads((HERE / "Hakawi_Kaggle_Demo.ipynb").read_text(encoding="utf-8"))
        self.assertEqual(artifact, build())
        for cell in artifact["cells"]:
            if cell["cell_type"] == "code":
                self.assertEqual(cell["outputs"], [])
                self.assertIsNone(cell["execution_count"])

    def test_install_cell_generates_real_requirement_lines(self):
        cell = next(cell for cell in build()["cells"] if "requirements = " in cell["source"])
        tree = ast.parse(cell["source"])
        snippets = [node for node in tree.body if isinstance(node, (ast.Assign, ast.AugAssign))
                    and isinstance(getattr(node, "target", None) or node.targets[0], ast.Name)
                    and (getattr(node, "target", None) or node.targets[0]).id == "requirements"]
        namespace = {"FILES": {"requirements.txt": (LIGHTNING / "requirements.txt").read_text()}, "CUDA_BUILD": "cu126"}
        exec(compile(ast.Module(body=snippets, type_ignores=[]), "requirements", "exec"), namespace)
        lines = namespace["requirements"].splitlines()
        self.assertIn("torch==2.8.0+cu126", lines)
        self.assertIn("torchaudio==2.8.0+cu126", lines)
        self.assertNotIn("torch==2.8.0+cu128", lines)


if __name__ == "__main__":
    unittest.main()
