"""Build a self-contained Kaggle notebook from the current Lightning deployment."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import textwrap

HERE = Path(__file__).resolve().parent
LIGHTNING = HERE.parent / "lightning-tts"
SOURCE_FILES = ["server.py", "audio_utils.py", "prepare_assets.py", "preflight.py",
                "smoke_test.py", "requirements.txt", "asset_versions.json", "voices.json",
                "tests/test_server.py"]


def build() -> dict:
    files = {name: (LIGHTNING / name).read_text(encoding="utf-8") for name in SOURCE_FILES}
    files.update({name: (HERE / name).read_text(encoding="utf-8")
                  for name in ["gateway.py", "demo_runtime.py", "runtime_env.py"]})
    manifest = {name: hashlib.sha256(content.encode()).hexdigest() for name, content in files.items()}
    cells = []

    def add(kind: str, source: str) -> None:
        cell = {"cell_type": kind, "metadata": {}, "source": textwrap.dedent(source).strip() + "\n"}
        if kind == "code":
            cell.update(execution_count=None, outputs=[])
        cells.append(cell)

    add("markdown", """
        # Hakawi voice demo — Kaggle GPU

        This notebook embeds the current `deployment/lightning-tts` service, model revisions,
        voices and smoke tests. No repository clone, payment method, or tunnel account is needed.
        The first setup downloads several GB. No model weights are embedded in this notebook.

        **Before running:** Create/import a private Kaggle notebook. In Session options enable
        **Internet** and select **GPU T4 ×2** (or a newer NVIDIA GPU). Only GPU 0 is used;
        two T4s do not combine their memory. Complete Kaggle phone verification if GPU/Internet
        controls require it. Check your available quota in the UI.

        In section 1 set **DEMO_API_KEY** to your private 32+ character key and choose
        **PRESENTATION_MINUTES** (default 180 minutes after setup). Then choose
        **Save Version → Save & Run All** for a fresh background session.
        No input prompts are used. The last code cell monitors the serving window.
        Section 6 prints **DEMO_ENDPOINT_READY** and the new URL in this run's logs/output.
        Update your backend with that URL and your key, and test the app before closing your laptop.
        Your laptop can then be off while the background run continues within Kaggle's limits.
        Kaggle sessions and the temporary URL expire; this is not permanent hosting.
        Outbound tunnel access and GPU availability must be confirmed in your actual session.
        Do not bypass Kaggle session limits or use browser keep-alive scripts.
    """)
    add("markdown", """
        ## 1. Unpack the embedded service
        Run again safely in the same session. The original server is copied without edits.
    """)
    add("code", textwrap.dedent("""
        import hashlib
        import json
        import pathlib
        import subprocess
        import sys
        DEMO_API_KEY = ''  # Paste your private demo key here: 32+ ASCII characters, no spaces.
        PRESENTATION_MINUTES = 180  # Serving time AFTER installation, downloads and smoke tests.
        RUN_CUSTOM_VOICE_TESTS = False  # Optional extra save/reuse/inline-cloning checks.
        if len(DEMO_API_KEY) < 32 or not DEMO_API_KEY.isascii() or any(c.isspace() for c in DEMO_API_KEY):
            raise ValueError('Set DEMO_API_KEY in section 1 to at least 32 ASCII characters without spaces.')
        if not 0 < PRESENTATION_MINUTES <= 720:
            raise ValueError('Choose PRESENTATION_MINUTES between 0 and 720; Kaggle limits still apply.')
        ROOT = pathlib.Path('/kaggle/working/hakawi-tts')
        ROOT.mkdir(parents=True, exist_ok=True)
        previous_demo = globals().get('demo')
        if previous_demo and any(p.poll() is None for p in previous_demo.processes.values()):
            raise RuntimeError('A demo is running. Stop it before unpacking/setup again.')
    """) + "\nFILES = " + repr(files) + "\nMANIFEST = " + repr(manifest) + "\n" + textwrap.dedent("""
        for name, content in FILES.items():
            destination = ROOT / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            assert hashlib.sha256(content.encode()).hexdigest() == MANIFEST[name]
            destination.write_text(content, encoding='utf-8')
        (ROOT / 'source-manifest.json').write_text(json.dumps(MANIFEST, indent=2))
        print('Service unpacked:', ROOT)
        print('Model revisions:', json.loads(FILES['asset_versions.json']))
    """))
    add("markdown", """
        ## 2. Install an isolated runtime
        The notebook kernel's packages stay separate. Setup uses its own Python environment.
        Keep `CUDA_BUILD='cu126'` for Kaggle T4/older drivers. To reproduce Lightning's CUDA
        build on a compatible driver, choose `cu128` **before** running this cell.
        Both use PyTorch/torchaudio 2.8.0; all other core versions come from Lightning's file.
        Stop if this cell fails. Do not continue to later cells with a broken install.
    """)
    add("code", """
        import shutil
        if not (3, 11) <= sys.version_info[:2] <= (3, 13):
            raise RuntimeError('This package requires Python 3.11–3.13; inspect Kaggle image settings.')
        if not shutil.which('nvidia-smi'):
            raise RuntimeError('Enable an NVIDIA GPU in Kaggle Session options first.')
        subprocess.run(['nvidia-smi'], check=True)
        if any(not shutil.which(tool) for tool in ['ffmpeg', 'gcc']):
            subprocess.run(['apt-get', 'update', '-qq'], check=True)
            subprocess.run(['apt-get', 'install', '-y', '-qq', 'ffmpeg', 'libsndfile1', 'gcc'], check=True)
        CUDA_BUILD = 'cu126'  # cu128 matches Lightning if the driver supports it.
        if CUDA_BUILD not in {'cu126', 'cu128'}:
            raise ValueError('Choose cu126 or cu128')
        ENV = ROOT / '.venv'
        if str(ROOT) not in sys.path:
            sys.path.insert(0, str(ROOT))
        from runtime_env import clean_env, prepare_runtime  # noqa: E402
        PYTHON = prepare_runtime(ENV)
        def run(*args, env=None):
            subprocess.run([str(PYTHON), *map(str, args)], cwd=ROOT, env=clean_env(env), check=True)
        # One resolver transaction pins the matching CUDA pair and current application versions.
        requirements = '\\n'.join(line for line in FILES['requirements.txt'].splitlines()
                                 if line.strip() and not line.startswith(('#', '--', 'torch==', 'torchaudio==')))
        requirements += f'\\ntorch==2.8.0+{CUDA_BUILD}\\ntorchaudio==2.8.0+{CUDA_BUILD}\\n'
        (ROOT / 'requirements-kaggle.txt').write_text(requirements)
        run('-m', 'pip', 'install', '--extra-index-url', 'https://download.pytorch.org/whl/' + CUDA_BUILD,
            '-r', 'requirements-kaggle.txt')
        run('-m', 'pip', 'check')
        run('-c', "import torch; assert torch.cuda.is_available(), 'CUDA unavailable'; "
            "x=torch.ones(16, device='cuda:0'); assert (x*2).sum().item()==32; "
            "print(torch.__version__, torch.version.cuda, torch.cuda.get_device_name(0))")
        with (ROOT / 'installed-versions.txt').open('w') as inventory:
            subprocess.run([str(PYTHON), '-m', 'pip', 'freeze'], stdout=inventory, env=clean_env(), check=True)
        print('Isolated runtime ready.')
    """)
    add("markdown", """
        ## 3. Download the model, tokenizer and voice references
        Uses the same pinned model revisions and voice URLs as Lightning. Public assets normally
        need no Hugging Face token. If access is gated for your account, add an optional Kaggle
        Secret called `HF_TOKEN` and enable notebook access to it. Never paste tokens into code.
    """)
    add("code", """
        asset_env = clean_env()
        asset_env.pop('HF_HUB_OFFLINE', None)
        asset_env.pop('TRANSFORMERS_OFFLINE', None)
        try:
            from kaggle_secrets import UserSecretsClient
            hf_token = UserSecretsClient().get_secret('HF_TOKEN')
        except Exception:
            hf_token = None  # Optional; public model downloads do not require this secret.
        if hf_token:
            asset_env['HF_TOKEN'] = hf_token
        run('prepare_assets.py', env=asset_env)
        hf_token = None
        asset_env.pop('HF_TOKEN', None)
        run('preflight.py')
        run('-m', 'unittest', 'discover', '-s', 'tests', '-v')
        print('Assets, CUDA operation and CPU service tests passed.')
    """)
    add("markdown", """
        ## 4. Set the demo key and start the service
        Uses **DEMO_API_KEY** from section 1 without a prompt, so a background run can proceed.
        Save the same value privately for your backend's **VOICE_API_KEY** setting.
        The notebook never prints it. Startup loads voices and performs a warmup generation.
    """)
    add("code", """
        voice_key = DEMO_API_KEY
        if len(voice_key) < 32 or not voice_key.isascii() or any(c.isspace() for c in voice_key):
            raise ValueError('Use at least 32 ASCII characters without whitespace.')
        if str(ROOT) not in sys.path:
            sys.path.insert(0, str(ROOT))
        from demo_runtime import Demo  # noqa: E402
        previous_demo = globals().get('demo')
        if previous_demo:
            previous_demo.stop()
        demo = Demo(ROOT, PYTHON, voice_key)
        voice_key = None
        demo.start_model()
        demo.start_gateway()
    """)
    add("markdown", """
        ## 5. Generate and listen locally
        Both character names below are configured in the current deployment. Check pronunciation,
        identity and clarity yourself. A valid WAV alone does not prove voice quality.
    """)
    add("code", """
        from IPython.display import Audio, display
        for character in ['am-othman', 'khufu']:
            audio_path = demo.smoke(character)
            display(Audio(filename=str(audio_path)))
    """)
    add("markdown", """
        ## 6. Create a temporary HTTPS URL and test it
        Uses Cloudflare Quick Tunnel, without an account or payment method. Only the protected
        gateway is exposed. The client binary is verified against the official release digest.
        HTTP/2 is used because notebook networks may restrict QUIC/UDP.
        The URL changes when you restart the tunnel. Outbound TCP port 7844 must be available.
        If tunneling fails, inspect diagnostics; no permanent URL or uptime is promised.
    """)
    add("code", """
        VOICE_API_URL = demo.start_tunnel()
        public_audio = demo.smoke('am-othman', public=True)
        display(Audio(filename=str(public_audio)))
        (ROOT / 'public-endpoint.json').write_text(json.dumps({'VOICE_API_URL': VOICE_API_URL}), encoding='utf-8')
        print('DEMO_ENDPOINT_READY | VOICE_API_URL=' + VOICE_API_URL, flush=True)
        print('Use your private VOICE_API_KEY value from cell 4. It is intentionally not printed.')
    """)
    add("markdown", """
        ## 7. Connect Hakawi and record the submission demo
        In your **backend hosting environment**, set these values (do not put them in the frontend):

        ```dotenv
        VOICE_API_URL="COPY_THE_HTTPS_URL_FROM_CELL_6"
        VOICE_API_KEY="YOUR_SAME_PRIVATE_KEY_FROM_CELL_4"
        ```

        For a local backend, edit `backend/.env` and restart the backend. For a hosted backend,
        update its environment variables and restart/redeploy it. Existing `generate` and
        `save_character` request/response formats are preserved. No frontend code change is needed.
        Test a built-in character in Hakawi, then test one custom recording. The backend's existing
        save-character request has a 10-second timeout: prepare custom demo voices with cell 8 if
        first-time cloning exceeds that window. Generation retains its current timeout behavior.

        Record and download your submission video while the session is live. Keep a local video
        copy because a notebook session is not a persistent deployed service. Stop the session
        when finished. A new Kaggle session needs setup again and a new tunnel URL; it may also
        need custom voice references resent. Do not publish saved notebook outputs containing
        personal recordings. Quotas/session availability are controlled by Kaggle.
    """)
    add("markdown", """
        ## 8. Optional — verify save-character, reuse and inline cloning
        Set RUN_CUSTOM_VOICE_TESTS=True in section 1 to verify the same three operations your backend uses.
        This uses the included am-othman sample to create two disposable demo voice names.
    """)
    add("code", """
        if RUN_CUSTOM_VOICE_TESTS:
            reference = ROOT / 'pre_existing_voices/am-othman.wav'
            transcript = (ROOT / 'pre_existing_voices/am-othman.txt').read_text(encoding='utf-8')
            inline_args = ['--inline-audio', str(reference), '--ref-text', transcript]
            demo.smoke('kaggle-saved-demo', public=True, extra=inline_args + ['--save-only'])
            display(Audio(filename=str(demo.smoke('kaggle-saved-demo', public=True))))
            display(Audio(filename=str(demo.smoke('kaggle-inline-demo', public=True, extra=inline_args))))
            print('Save, saved-voice reuse and inline cloning passed.')
        else:
            print('Optional custom voice tests skipped.')
    """)
    add("markdown", """
        ## 9. Diagnostics — run manually when needed
        Logs report model failures and tunnel connection problems. The current server can log
        character identifiers. Review logs before sharing them. Never print `demo.token` or env vars.
        If only the tunnel stopped, run `demo.stop('tunnel')`, then rerun cell 6.
        For a failed model, run demo.stop() manually, correct the reported problem and rerun cell 4.
    """)
    add("code", """
        demo.diagnostics()
        subprocess.run(['nvidia-smi'], check=False)
    """)
    add("markdown", """
        ## References
        - [Kaggle Notebook settings](https://www.kaggle.com/docs/notebooks)
        - [Kaggle GPU usage](https://www.kaggle.com/docs/efficient-gpu-usage)
        - [Cloudflare Quick Tunnels and limitations](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)
        - [PyTorch 2.8 CUDA builds](https://pytorch.org/get-started/previous-versions/)

        Cloudflare Quick Tunnels have no uptime SLA, a 200 concurrent-request limit and no SSE.
        This API uses ordinary JSON responses. Long generations may still encounter proxy limits;
        use short demo responses and measure the public request time in cell 6.
    """)
    add("markdown", """
        ## 10. Background presentation window — final running cell
        Checks the model, gateway, tunnel and public health endpoint every 30 seconds for
        PRESENTATION_MINUTES (set in section 1). There is no automatic stop cell after this.
        In Save & Run All mode, the notebook remains executing during this bounded serving window.
        When the timer finishes, the background run completes; expect its processes and URL to stop.
        Kaggle may terminate the session earlier due to its limits or failures.
        To finish early, stop the background run in Kaggle. During interactive use you can interrupt
        this cell and run demo.stop() manually. No fake browser activity or quota bypass is used.
    """)
    add("code", (HERE / "presentation_monitor.py").read_text(encoding="utf-8").partition("\n")[2]
        + "\nwatch_presentation(demo, minutes=PRESENTATION_MINUTES)\n")
    return {"cells": cells, "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                                           "language_info": {"name": "python"},
                                           "kaggle": {"isInternetEnabled": True, "isGpuEnabled": True}},
            "nbformat": 4, "nbformat_minor": 4}


if __name__ == "__main__":
    path = HERE / "Hakawi_Kaggle_Demo.ipynb"
    path.write_text(json.dumps(build(), ensure_ascii=False, indent=1), encoding="utf-8")
    print(path)
