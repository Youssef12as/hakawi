"""Monitor the running demo during a presentation; does not bypass Kaggle limits."""
import time
import urllib.request


def watch_presentation(demo, minutes=90):
    if not 0 < minutes <= 720:
        raise ValueError("Choose a duration between 0 and 720 minutes")
    if not demo.url:
        raise RuntimeError("Run section 6 to start the public tunnel first")
    deadline = time.monotonic() + minutes * 60
    print("Presentation monitor started. Interrupt this cell to stop monitoring.")
    print("Kaggle idle shutdown, quotas and session limits still apply.")
    try:
        while time.monotonic() < deadline:
            for name in ("model", "gateway", "tunnel"):
                if name not in demo.processes:
                    raise RuntimeError(f"{name} has not been started")
                demo.check(name)
            request = urllib.request.Request(
                demo.url + "/health",
                headers={"Authorization": "Bearer " + demo.token},
            )
            try:
                with urllib.request.urlopen(request, timeout=10) as response:
                    healthy = response.status == 200
                status = "READY" if healthy else "CHECK CONNECTION"
            except OSError:
                status = "HEALTH CHECK FAILED — inspect diagnostics"
            remaining = max(0, deadline - time.monotonic())
            print(f"{time.strftime('%H:%M:%S')} | {status} | {remaining / 60:.0f} min remaining", flush=True)
            time.sleep(min(30, remaining))
    except KeyboardInterrupt:
        print("Monitoring interrupted.")
    finally:
        print("Monitor finished. Model and tunnel were not stopped. Use demo.stop() when done.")
