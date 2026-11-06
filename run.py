import os
import subprocess
import sys
import time
import webbrowser

def cleanup_ports(ports):
    """
    Kills any lingering zombie processes listening on the target ports before starting.
    """
    for port in ports:
        if sys.platform == "win32":
            cmd = f'powershell -Command "Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | ForEach-Object {{ Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }}"'
            try:
                subprocess.run(cmd, shell=True, capture_output=True, timeout=3)
            except Exception:
                pass

def get_python_executable():
    """
    Returns the virtual environment Python interpreter if present, otherwise sys.executable.
    """
    if sys.platform == "win32":
        venv_python = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".venv", "Scripts", "python.exe")
    else:
        venv_python = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".venv", "bin", "python")
        
    if os.path.exists(venv_python):
        return venv_python
    return sys.executable

def main():
    """
    Runner script to launch both the NexStep Flask Backend and Frontend server concurrently.
    """
    print("==================================================")
    print("             Launching NexStep                    ")
    print("==================================================")
    
    # Clean up any stale zombie processes on ports 3000 and 5000
    cleanup_ports([3000, 5000])
    time.sleep(0.5)

    python_bin = get_python_executable()
    
    print("[1/2] Starting Flask Backend (http://127.0.0.1:5000/)...")
    backend_proc = subprocess.Popen([python_bin, "Backend/app.py"])
    
    time.sleep(1)
    
    print("[2/2] Starting Frontend Web Server (http://127.0.0.1:3000/)...")
    frontend_proc = subprocess.Popen([python_bin, "-m", "http.server", "3000", "--directory", "Frontend"])
    
    no_browser = "--no-browser" in sys.argv
    if not no_browser:
        time.sleep(1.5)
        webbrowser.open("http://127.0.0.1:3000/")
    
    print("\n--------------------------------------------------")
    print(" NexStep application is RUNNING successfully!")
    print(" [KEEP THIS TERMINAL OPEN WHILE BROWSING THE APP]")
    print()
    print(" - Landing Page:  http://127.0.0.1:3000/")
    print(" - Login Page:    http://127.0.0.1:3000/login.html")
    print(" - Register Page: http://127.0.0.1:3000/register.html")
    print(" - Backend API:   http://127.0.0.1:5000/")
    print()
    print(" (Press Ctrl+C ONLY when you want to stop the servers)")
    print("--------------------------------------------------\n")

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\n[Shutting down NexStep servers...]")
    finally:
        try:
            backend_proc.terminate()
        except Exception:
            pass
        try:
            frontend_proc.terminate()
        except Exception:
            pass
        print("Servers stopped cleanly.")

if __name__ == '__main__':
    main()
