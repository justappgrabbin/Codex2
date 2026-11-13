
from flask import Flask, request, jsonify, render_template
import os, time, threading, logging
from builder_engine import run_builder

app = Flask(__name__, template_folder=".", static_folder=".")
UPLOAD_DIR = "uploads"
GENERATED_DIR = "generated_app"

logging.basicConfig(filename="logs/builder.log", level=logging.INFO,
                    format="%(asctime)s - %(levelname)s - %(message)s")

@app.route("/build", methods=["POST"])
def trigger_build():
    try:
        run_builder()
        logging.info("Build triggered successfully")
        return jsonify({"status": "Build triggered."})
    except Exception as e:
        logging.exception("Build failed")
        return jsonify({"status": "Error", "message": str(e)}), 500

@app.route("/status", methods=["GET"])
def status():
    try:
        files = os.listdir(UPLOAD_DIR)
        return jsonify({"uploads": files})
    except Exception as e:
        logging.exception("Status failed")
        return jsonify({"status": "Error", "message": str(e)}), 500

@app.route("/preview", methods=["GET"])
def preview():
    try:
        files = []
        for root, _, filenames in os.walk(GENERATED_DIR):
            for fname in filenames:
                files.append(os.path.relpath(os.path.join(root, fname), GENERATED_DIR))
        return render_template("universe_builder/replit_ui/index.html", files=files)
    except Exception as e:
        logging.exception("Preview failed")
        return jsonify({"status": "Error", "message": str(e)}), 500

@app.route("/file_content", methods=["GET"])
def file_content():
    try:
        path = request.args.get("path")
        full_path = os.path.join(GENERATED_DIR, path)
        if os.path.exists(full_path) and os.path.isfile(full_path):
            with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                return jsonify({"content": f.read()})
        return jsonify({"content": "File not found."}), 404
    except Exception as e:
        logging.exception("file_content failed")
        return jsonify({"status": "Error", "message": str(e)}), 500

def watch_uploads():
    last_files = set()
    while True:
        try:
            current_files = set(os.listdir(UPLOAD_DIR))
            if current_files != last_files:
                logging.info("New files detected, triggering build")
                run_builder()
                last_files = set(current_files)
            time.sleep(10)
        except Exception:
            logging.exception("watch_uploads failed")
            time.sleep(10)

if __name__ == "__main__":
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(GENERATED_DIR, exist_ok=True)
    os.makedirs("logs", exist_ok=True)
    threading.Thread(target=watch_uploads, daemon=True).start()
    app.run(host="0.0.0.0", port=5000, debug=True)
