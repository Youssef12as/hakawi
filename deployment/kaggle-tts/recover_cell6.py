"""Replacement cell 6: start a fresh tunnel or recover an existing one."""
# ruff: noqa: F821 -- demo, ROOT, json, Audio and display come from earlier notebook cells.
import time
import urllib.error

if not demo.url:
    # A new Save & Run All session has no tunnel yet.
    tunnel = demo.processes.get("tunnel")
    if tunnel is not None and tunnel.poll() is None:
        demo.stop("tunnel")  # Only replace a tunnel that has no recorded URL.
    demo.start_tunnel()

# Reuse the loaded GPU model and the tunnel URL established above or by an earlier cell.
VOICE_API_URL = demo.url
for attempt in range(6):
    try:
        demo.wait_health(VOICE_API_URL + "/health", "tunnel", demo.token, seconds=30)
        demo.assert_protected(VOICE_API_URL)
        break
    except urllib.error.URLError:
        if attempt == 5:
            raise
        print("Temporary DNS failure; retrying...", flush=True)
        time.sleep(10)

public_audio = demo.smoke("am-othman", public=True)
display(Audio(filename=str(public_audio)))
(ROOT / "public-endpoint.json").write_text(json.dumps({"VOICE_API_URL": VOICE_API_URL}), encoding="utf-8")
print("DEMO_ENDPOINT_READY | VOICE_API_URL=" + VOICE_API_URL, flush=True)
