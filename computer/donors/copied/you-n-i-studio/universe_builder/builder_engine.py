
import os, logging
from parser.file_classifier import classify_file
from parser.spec_extractor import extract_specs
from parser.layout_organizer import generate_layout

UPLOAD_DIR = "uploads"
GENERATED_DIR = "generated_app"

logging.basicConfig(filename="logs/builder.log", level=logging.INFO)

def run_builder():
    try:
        files = [f for f in os.listdir(UPLOAD_DIR) if os.path.isfile(os.path.join(UPLOAD_DIR, f))]
        if not files:
            logging.warning("No files found in uploads directory")
            return
        all_specs = []
        for fname in files:
            path = os.path.join(UPLOAD_DIR, fname)
            ftype = classify_file(path)
            specs = extract_specs(path, ftype)
            all_specs.append(specs)
            logging.info(f"Processed file: {fname}, type: {ftype}")

        layout = generate_layout(all_specs)
        for folder in layout.get("folders", []):
            os.makedirs(os.path.join(GENERATED_DIR, folder), exist_ok=True)
        for file_name, file_content in layout.get("files", {}).items():
            out_path = os.path.join(GENERATED_DIR, file_name)
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(file_content)
            logging.info(f"Generated file: {file_name}")
    except Exception as e:
        logging.exception("Builder engine failed")
        raise
