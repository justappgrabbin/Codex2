
import os, logging

logging.basicConfig(filename="logs/builder.log", level=logging.INFO)

def extract_specs(path, ftype):
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        if ftype == "text":
            lines = content.splitlines()
            low = content.lower().splitlines()
            def first_name():
                # Try to infer a module name from lines mentioning 'system', 'module', 'bonding', or 'chart'
                for src in (low,):
                    for l in src:
                        if " system" in l or "module" in l or "bonding" in l or "chart" in l:
                            return l.split(":")[0].strip().title().replace(" ", "")
                # fallback to filename
                return os.path.basename(path).split(".")[0]
            module_name = first_name() or os.path.basename(path).split(".")[0]

            # Extract very simple "bonds" like: "UserA bonds with UserB at 0.8"
            bonds = []
            for line in lines:
                s = line.strip()
                if "bonds with" in s and " at " in s:
                    try:
                        left, right = s.split("bonds with", 1)
                        user1 = left.strip().split()[-1]
                        other, rest = right.strip().split(" at ", 1)
                        user2 = other.strip().split()[0]
                        strength = float(rest.strip().split()[0])
                        bonds.append({"user1": user1, "user2": user2, "strength": strength})
                    except Exception:
                        continue

            # Extract chart data like: "LabelX at 0.9"
            chart_data = []
            for line in lines:
                if " at " in line and "-" in line:
                    # e.g. "UserA-UserB at 0.8"
                    try:
                        left, right = line.split(" at ")
                        label = left.split(":")[-1].strip()
                        value = float(right.strip().split()[0])
                        chart_data.append({"label": label, "value": value})
                    except Exception:
                        pass

            intents = [l for l in low if any(k in l for k in ["module", "system", "bond", "chart"])]
            return {
                "type": ftype,
                "module_name": module_name,
                "intents": intents,
                "bonds": bonds,
                "chart_data": chart_data,
                "raw": content[:500]
            }

        elif ftype == "python":
            functions = [line for line in content.splitlines() if line.strip().startswith("def ")]
            module_name = os.path.basename(path).replace(".py", "")
            return {"type": ftype, "module_name": module_name, "functions": functions, "raw": content[:500]}

        elif ftype == "html":
            module_name = os.path.basename(path).replace(".html", "")
            contains_ui = "<div" in content or "<canvas" in content
            return {"type": ftype, "module_name": module_name, "contains_ui": contains_ui, "raw": content[:500]}

        return {"type": "unknown", "module_name": "unknown", "raw": content[:500]}
    except Exception:
        logging.exception(f"Spec extraction failed for {path}")
        return {"type": "unknown", "raw": "", "module_name": "unknown"}
