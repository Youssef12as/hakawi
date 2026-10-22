# Hakawi Kaggle submission demo

Import **Hakawi_Kaggle_Demo.ipynb** into a private [Kaggle notebook](https://www.kaggle.com/code).
It is self-contained: you do not need to upload the repository or helper files.

1. Select **File → Import Notebook** (or the notebook upload option) and choose the `.ipynb`.
2. Enable **Internet** and **GPU T4 ×2** in Session options. Finish account/phone verification if required. Only the first GPU is used.
3. Edit `DEMO_API_KEY` in section 1 to your private key, with at least 32 ASCII characters and no spaces. The same value becomes your backend's `VOICE_API_KEY`. No key is supplied in the downloadable notebook and no input prompt is used.
4. Set `PRESENTATION_MINUTES` in section 1 (default **180** minutes after setup). Set `RUN_CUSTOM_VOICE_TESTS=True` only if you want the additional custom voice checks. Choose **Save Version → Save & Run All**, which starts a fresh background session. First installation and model loading can take several minutes and several GB of downloads.
5. Inspect the background run's logs/output. Section 6 prints **`DEMO_ENDPOINT_READY | VOICE_API_URL=https://...`** after public health/authentication and speech checks. It also writes `hakawi-tts/public-endpoint.json`, containing the URL without the key. Use this run's URL, not a previous interactive session's URL.
6. Follow section 7: set `VOICE_API_URL` and your key in the backend environment and restart it. Test the website before turning off your laptop. Listen to the generated samples to verify voice quality.
7. The final section monitors the running demo for `PRESENTATION_MINUTES`. Your laptop can be off while the background run continues. There is no automatic `demo.stop()` cell. When the timer ends, the notebook finishes; expect the background processes and public URL to stop. Kaggle limits and failures can stop it sooner. Stop the run manually in Kaggle when finished early.

For interactive use, run sections in order and interrupt the final monitor when you need the notebook prompt again. Interrupting monitoring does not call `demo.stop()`; run that manually to stop services. A saved background run is separate from an interactive session and creates its own endpoint. This setup does not bypass Kaggle quotas or maximum session durations.

## What matches Lightning

The notebook embeds `deployment/lightning-tts/server.py`, audio normalization, all configured voice references, pinned model and tokenizer revisions, preflight, smoke tests and CPU service tests. The server source is copied unchanged. It provides `POST /` with the same `generate`/`save_character` JSON contract and WAV output. Built-in prompt preparation, CPU voice caching, input limits and model warmup are retained.

The additional gateway checks `Authorization: Bearer <VOICE_API_KEY>` before forwarding requests. Its only routes are `GET /health` and `POST /`. Cloudflare exposes that gateway on port 8001, not the unprotected model service on port 8000. The model port stays internal to the notebook machine; it is not the tunnel target.

The isolated Python environment avoids altering Kaggle's kernel packages. Core versions come from the existing Lightning requirements. PyTorch and torchaudio remain 2.8.0; the default CUDA build is **cu126** for compatibility with Kaggle T4/older drivers. Choose **cu128** in cell 2 if the driver supports it and you want Lightning's original build. Preflight executes a CUDA operation; environment variables alone cannot make an incompatible driver work. Prefer a T4 or newer GPU, rather than the older P100.

Setup repairs an existing environment that is missing pip, using ensurepip or the notebook interpreter's pip with `--python`. It removes inherited Python path/startup overrides from service subprocesses and installs wrapt for compatibility with startup hooks. If you imported an earlier notebook and saw `No module named pip` or a sitecustomize/wrapt error in section 2, import the updated notebook and rerun sections 1–2; no model download is needed until section 3.

## What needs a live Kaggle check

GPU allocation, installed driver, available package wheels, internet access, reference audio downloads, actual model memory use, voice quality, tunnel connectivity and backend latency must be tested in your session. This package has not been executed on your Kaggle account. The notebook includes gates for those checks and stops on failures. No fixed setup time or response latency is promised.

The public tunnel is account-free but requires outbound TCP port 7844. It uses HTTP/2 and a checksum-verified official cloudflared release. If Kaggle blocks that connection, it cannot produce a public URL; the local audio demo still works. Cloudflare Quick Tunnels have no SLA and a 200 concurrent-request limit. Long inference calls can encounter proxy timeouts. Keep submission demo responses short.

Kaggle sessions and quotas are finite. The URL changes after restarting the tunnel, and the backend must receive the new URL. Custom voices live in session storage; after a new session, the existing backend's inline-reference retry can recreate them. The backend's current `save_character` call has a 10-second timeout; prepare the custom voice in advance via cell 8 if needed. No backend timeout policy is changed.

Keep the notebook private because your demo key is in its source. The generated downloadable notebook contains an empty key setting that you fill in on Kaggle. Do not save/share personal recording outputs. Do not use browser keep-alive scripts or attempt to bypass Kaggle limits. A submission video downloaded while the demo runs will remain usable after the temporary endpoint expires.

## Updating this notebook

From the repository root, run `python deployment/kaggle-tts/build_notebook.py` after changing the Lightning source. Run `python -m unittest discover -s deployment/kaggle-tts/tests -v` to check the gateway and embedded notebook. The builder uses only Python's standard library. The generated notebook contains source hashes and no execution output or credentials.

## Sources

- [Kaggle notebooks](https://www.kaggle.com/docs/notebooks)
- [Kaggle GPU usage](https://www.kaggle.com/docs/efficient-gpu-usage)
- [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)
- [PyTorch CUDA build choices](https://pytorch.org/get-started/previous-versions/)
