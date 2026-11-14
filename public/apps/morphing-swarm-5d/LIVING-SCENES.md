# Living Scene Layer — Additive Build

The existing Morphing Swarm 5D application, original donor archives, swarm reality engine, morph engine, sprite runtime, Yi Jing integration, image loading, capture and recording remain present.

New: `core/scene-world.js` draws layered, perspective-styled procedural worlds into the existing 2D canvas. Four built-in environments are Forest, Learning Laboratory, Community City and Dream Playground. Switching via the Living worlds buttons, Life-event dropdown or Next event animates a 2.4-second crossfade while the original world particles and morph form remain active. The current activity label changes with the selected world. The current scene is included in Save state JSON.

The layer exposes `SwarmLivingScenes.LivingScene`: `transition(name)`, `render(ctx,width,height,time)`, `register(name,definition)` for future scene content. Registered scene definitions require `kind` from `forest`, `learning`, `city`, `dream`; two `sky` colors, `ground` and `accent` six-digit hex colors. It is an API for additional styles, not a new generative AI model.

**Limits:** Scenes are stylized 2.5D procedural environments drawn on the existing canvas. This does not reconstruct arbitrary photorealistic 3D geometry, create new image/video content with a trained model, or output an APK. No existing user scenes or character assets are deleted. No automatic astronomical/life-event data feed is claimed; events are selected in the UI or can be called by integration code.

Test with `node --test tests/*.test.mjs`. Start locally by serving the directory with `python3 -m http.server 8000` and open `http://127.0.0.1:8000/`, or use the preserved Node server.
