
import logging
logging.basicConfig(filename="logs/builder.log", level=logging.INFO)

def classify_file(path):
    try:
        if path.endswith(".py"):
            return "python"
        elif path.endswith(".html"):
            return "html"
        elif path.endswith(".txt") or path.endswith(".md"):
            return "text"
        else:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                head = f.read(400)
                if "<html" in head or "<div" in head:
                    return "html"
                elif "def " in head or "import " in head:
                    return "python"
                return "text"
    except Exception:
        logging.exception(f"File classification failed for {path}")
        return "unknown"
