
from jinja2 import Environment, FileSystemLoader
import logging

logging.basicConfig(filename="logs/builder.log", level=logging.INFO)

def generate_layout(specs_list):
    try:
        env = Environment(loader=FileSystemLoader("templates"))
        folders = set()
        files = {}
        counter = 0

        for spec in specs_list:
            module_name = spec.get("module_name", f"module_{counter}") or f"module_{counter}"
            intents = spec.get("intents", [])
            intents_text = " ".join(intents).lower()

            # Bonding system special-case
            if "bond" in intents_text or "bonding" in module_name.lower():
                folders.add("bonding")
                # backend
                logic_t = env.get_template("python_module.py.j2")
                files[f"bonding/{module_name}_logic.py"] = logic_t.render(
                    functions=spec.get("functions", []), module_name=f"{module_name}_logic"
                )
                # dashboard
                dash_t = env.get_template("dashboard.html.j2")
                files[f"bonding/{module_name}_dashboard.html"] = dash_t.render(
                    dashboard_name=module_name, bonds=spec.get("bonds", [])
                )
                # spec doc
                spec_t = env.get_template("spec_doc.txt.j2")
                files[f"bonding/{module_name}_spec.txt"] = spec_t.render(
                    intents=intents, module_name=module_name
                )
            # Chart viewer
            elif "chart" in intents_text or "chart" in module_name.lower():
                folders.add("charts")
                chart_t = env.get_template("chart.html.j2")
                files[f"charts/{module_name}_chart.html"] = chart_t.render(
                    chart_name=module_name, chart_data=spec.get("chart_data", [])
                )
                spec_t = env.get_template("spec_doc.txt.j2")
                files[f"charts/{module_name}_spec.txt"] = spec_t.render(
                    intents=intents, module_name=module_name
                )
            else:
                # generic generation
                if spec.get("type") == "python":
                    folders.add("backend")
                    py_t = env.get_template("python_module.py.j2")
                    files[f"backend/{module_name}.py"] = py_t.render(
                        functions=spec.get("functions", []), module_name=module_name
                    )
                elif spec.get("type") == "html":
                    folders.add("frontend")
                    html_t = env.get_template("html_component.html.j2")
                    files[f"frontend/{module_name}.html"] = html_t.render(
                        raw_content=spec.get("raw",""), component_name=module_name
                    )
                elif spec.get("type") == "text":
                    folders.add("docs")
                    spec_t = env.get_template("spec_doc.txt.j2")
                    files[f"docs/{module_name}.txt"] = spec_t.render(
                        intents=intents, module_name=module_name
                    )
            counter += 1

        # Relationship map
        rel_map = "\n".join(
            f"{r['from']} -> {r['to']}" for spec in specs_list for r in spec.get("relationships", [])
        )
        if rel_map:
            files["docs/relationships.txt"] = rel_map

        return {"folders": list(folders), "files": files}
    except Exception as e:
        logging.exception("Layout generation failed")
        raise
