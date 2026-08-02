"""
start.py — One-command launcher for TalentMatch AI.

Starts all three components:
  1. Ollama   -> serves LLM on http://localhost:11434 (only if not already running)
  2. Backend  -> FastAPI / uvicorn on http://localhost:8000
  3. Frontend -> Vite / React dev server on http://localhost:5173

Press Ctrl+C to stop everything cleanly.
"""

import os
import socket
import subprocess
import sys
import time
import urllib.request

BACKEND_PORT = 8000
FRONTEND_PORT = 5173
OLLAMA_URL = "http://localhost:11434"
OLLAMA_VERSION_URL = f"{OLLAMA_URL}/api/version"


def is_port_open(host: str, port: int) -> bool:
    """Return True if a TCP connection to host:port succeeds."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(1.0)
        try:
            sock.connect((host, port))
            return True
        except OSError:
            return False


def is_ollama_ready() -> bool:
    """Return True if the Ollama API is already responding."""
    try:
        with urllib.request.urlopen(OLLAMA_VERSION_URL, timeout=2) as resp:
            return resp.status == 200
    except Exception:
        return False


def wait_for_http(url: str, what: str, timeout: int = 60) -> bool:
    """Poll a URL until it responds (any HTTP status < 500) or timeout."""
    print(f"   ⏳ Waiting for {what} to become ready ...")
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as resp:
                if resp.status < 500:
                    print(f"   ✅ {what} is ready: {url}")
                    return True
        except Exception:
            pass
        time.sleep(1)
    print(f"   ⚠️  {what} did not become ready within {timeout}s")
    return False


def terminate_tree(proc: subprocess.Popen) -> None:
    """Terminate a process and (on Windows) its whole child tree."""
    if proc.poll() is not None:
        return
    if sys.platform == "win32":
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    else:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


def start_ollama():
    """Ensure Ollama is running; start `ollama serve` if needed."""
    if is_ollama_ready():
        print(f"🦙 Ollama already running on {OLLAMA_URL}")
        return None
    print("🦙 Starting Ollama serve ...")
    flags = 0
    if sys.platform == "win32":
        flags = subprocess.CREATE_NEW_PROCESS_GROUP
    try:
        proc = subprocess.Popen(["ollama", "serve"], creationflags=flags)
    except FileNotFoundError:
        print("   ❌ `ollama` was not found on PATH.")
        print("      Install it from https://ollama.com or start it manually.")
        return None
    wait_for_http(OLLAMA_VERSION_URL, "Ollama", timeout=30)
    return proc


def start_backend():
    """Start the FastAPI backend with uvicorn on port 8000."""
    venv_python = os.path.join("backend", "venv", "Scripts", "python.exe")
    if not os.path.exists(venv_python):
        venv_python = sys.executable
    cmd = [
        venv_python,
        "-m", "uvicorn",
        "app.main:app",
        "--app-dir", "backend",
        "--reload",
        "--port", str(BACKEND_PORT),
    ]
    print(f"🚀 Starting TalentMatch AI Backend on http://localhost:{BACKEND_PORT} ...")
    flags = 0
    if sys.platform == "win32":
        flags = subprocess.CREATE_NEW_PROCESS_GROUP
    return subprocess.Popen(cmd, creationflags=flags)


def start_frontend():
    """Start the Vite/React frontend dev server on port 5173."""
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    cmd = [npm_cmd, "run", "dev", "--prefix", "frontend"]
    print(f"🎨 Starting TalentMatch AI Frontend on http://localhost:{FRONTEND_PORT} ...")
    flags = 0
    if sys.platform == "win32":
        flags = subprocess.CREATE_NEW_PROCESS_GROUP
    return subprocess.Popen(cmd, creationflags=flags)


def main() -> int:
    processes = []  # list of (name, Popen)

    # 1. Ollama
    ollama = start_ollama()
    if ollama is not None:
        processes.append(("Ollama", ollama))

    # 2. Backend
    backend = start_backend()
    processes.append(("Backend", backend))

    # 3. Frontend
    frontend = start_frontend()
    processes.append(("Frontend", frontend))

    # Wait for everything to come up
    wait_for_http(f"http://localhost:{BACKEND_PORT}", "Backend", timeout=60)
    wait_for_http(f"http://localhost:{FRONTEND_PORT}", "Frontend", timeout=60)

    print()
    print("=" * 62)
    print("🎉 TalentMatch AI is running!")
    print(f"   🎨 Frontend: http://localhost:{FRONTEND_PORT}")
    print(f"   🚀 Backend:  http://localhost:{BACKEND_PORT}")
    print(f"   📚 API docs: http://localhost:{BACKEND_PORT}/api/v1/docs")
    print(f"   🦙 Ollama:   {OLLAMA_URL}")
    print("=" * 62)
    print("Press Ctrl+C to stop all services.")
    print()

    try:
        while True:
            for name, proc in list(processes):
                code = proc.poll()
                if code is not None:
                    print(f"❌ {name} exited unexpectedly (code {code}). Stopping everything ...")
                    return 1
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Stopping all services ...")
    finally:
        for name, proc in reversed(processes):
            if proc.poll() is None:
                print(f"   Stopping {name} ...")
                terminate_tree(proc)
    return 0


if __name__ == "__main__":
    sys.exit(main())
