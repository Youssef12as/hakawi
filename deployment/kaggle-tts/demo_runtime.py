"""Notebook process management; no notebook-kernel model imports required."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import time
import urllib.error
import urllib.request

from runtime_env import clean_env


class Demo:
    def __init__(self, root: Path, python: Path, token: str):
        self.root, self.python, self.token = root, python, token
        self.processes: dict[str, subprocess.Popen] = {}
        self.url: str | None = None

    def launch(self, name: str, args: list[str], env: dict[str, str] | None = None) -> None:
        existing = self.processes.get(name)
        if existing is not None and existing.poll() is None:
            raise RuntimeError(f"{name} is already running; stop it first")
        with (self.root / f"{name}.log").open("w", encoding="utf-8") as log:
            self.processes[name] = subprocess.Popen(
                args, cwd=self.root, env=clean_env(env), stdout=log, stderr=subprocess.STDOUT,
                start_new_session=True,
            )

    def check(self, name: str) -> None:
        process = self.processes[name]
        if process.poll() is not None:
            raise RuntimeError(f"{name} exited with {process.returncode}. Run the diagnostics cell.")

    def wait_health(self, url: str, name: str, token: str | None = None, seconds: int = 1200) -> None:
        deadline = time.monotonic() + seconds
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        while time.monotonic() < deadline:
            self.check(name)
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=5) as response:
                    if response.status == 200:
                        return
            except (OSError, urllib.error.URLError):
                pass
            time.sleep(2)
        raise RuntimeError(f"{name} did not become healthy within {seconds}s. Run diagnostics.")

    def start_model(self) -> None:
        env = clean_env()
        env.update(CUDA_VISIBLE_DEVICES="0", HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1",
                   TOKENIZERS_PARALLELISM="false", PYTHONUNBUFFERED="1", PORT="8000",
                   VOICE_CACHE_DIR=str(self.root / "runtime_voices"), WARMUP="1")
        env.pop("VOICE_API_KEY", None)
        self.launch("model", [str(self.python), "server.py"], env)
        print("Loading model, preparing voices and warming up; allow several minutes...")
        self.wait_health("http://127.0.0.1:8000/health", "model")
        print("Model ready.")

    def start_gateway(self) -> None:
        env = clean_env()
        env["VOICE_API_KEY"] = self.token
        self.launch("gateway", [str(self.python), "gateway.py"], env)
        self.wait_health("http://127.0.0.1:8001/health", "gateway", self.token, 30)
        self.assert_protected("http://127.0.0.1:8001")
        print("Bearer gateway ready; unauthenticated requests rejected.")

    @staticmethod
    def assert_protected(url: str) -> None:
        for suffix in ["/health", "/"]:
            request = urllib.request.Request(url + suffix, data=b"{}" if suffix == "/" else None)
            try:
                with urllib.request.urlopen(request, timeout=30):
                    pass
            except urllib.error.HTTPError as exc:
                if exc.code == 401:
                    continue
                raise RuntimeError(f"Expected 401 from {suffix}, received {exc.code}") from exc
            raise RuntimeError("Endpoint accepted an unauthenticated request; do not connect backend")

    def start_tunnel(self) -> str:
        self.check("gateway")
        binary = self.root / "cloudflared"
        # Download from the vendor's official release and verify GitHub's asset digest.
        request = urllib.request.Request("https://api.github.com/repos/cloudflare/cloudflared/releases/latest",
                                         headers={"User-Agent": "hakawi-kaggle-demo"})
        with urllib.request.urlopen(request, timeout=60) as response:
            release = json.load(response)
        asset = next(item for item in release["assets"] if item["name"] == "cloudflared-linux-amd64")
        digest = asset.get("digest", "")
        if not digest.startswith("sha256:"):
            raise RuntimeError("Official release has no SHA256 digest; download not executed")
        expected = digest.split(":", 1)[1]
        if not binary.is_file() or hashlib.sha256(binary.read_bytes()).hexdigest() != expected:
            with urllib.request.urlopen(asset["browser_download_url"], timeout=120) as response:
                content = response.read()
            if hashlib.sha256(content).hexdigest() != expected:
                raise RuntimeError("cloudflared checksum mismatch")
            binary.write_bytes(content)
            binary.chmod(0o700)
        print("Tunnel client:", release["tag_name"])
        self.launch("tunnel", [str(binary), "tunnel", "--url", "http://127.0.0.1:8001",
                               "--protocol", "http2", "--no-autoupdate"])
        deadline = time.monotonic() + 90
        while time.monotonic() < deadline:
            self.check("tunnel")
            log = (self.root / "tunnel.log").read_text(encoding="utf-8", errors="replace")
            match = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", log)
            if match:
                self.url = match.group()
                self.wait_health(self.url + "/health", "tunnel", self.token, 120)
                self.assert_protected(self.url)
                print("VOICE_API_URL=" + self.url)
                print("Public health and authentication checks passed.")
                return self.url
            time.sleep(2)
        raise RuntimeError("Tunnel URL not available; inspect tunnel.log. Kaggle may restrict outbound tunnels.")

    def smoke(self, character: str = "am-othman", public: bool = False, extra: list[str] | None = None) -> Path:
        if public and not self.url:
            raise RuntimeError("Start the tunnel first")
        env = clean_env()
        env["VOICE_API_KEY"] = self.token
        output = self.root / "test-output" / f"{'public' if public else 'local'}-{character}.wav"
        args = [str(self.python), "smoke_test.py", "--url", self.url if public else "http://127.0.0.1:8001",
                "--character", character, "--output", str(output)]
        subprocess.run(args + (extra or []), cwd=self.root, env=env, check=True)
        return output

    def diagnostics(self) -> None:
        for name, process in self.processes.items():
            print(f"\n{name}: {'running' if process.poll() is None else 'stopped'}")
            log = self.root / f"{name}.log"
            if log.exists():
                print("\n".join(log.read_text(encoding="utf-8", errors="replace").splitlines()[-35:]))

    def stop(self, name: str | None = None) -> None:
        names = [name] if name else ["tunnel", "gateway", "model"]
        for item in names:
            process = self.processes.get(item)
            if process is not None and process.poll() is None:
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    process.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait(timeout=15)
        if name is None or name == "tunnel":
            self.url = None
        print("Stopped:", ", ".join(names))
