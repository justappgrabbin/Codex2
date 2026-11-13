# Local learning and coding workspace

Open **Import → Learn, retrieve and build** in the existing Computer shell.

1. Import text, Markdown, source files, or ZIPs, then choose **Learn imported text**. Binary files are preserved by the existing importer; this workspace does not yet extract PDF, DOCX, scanned pages, or media.
2. Search questions or remember user teaching/corrections. Results contain source paths, line ranges, SHA-256 digests, and provenance. Retrieval currently uses lexical matching, not a claim of complete semantic understanding. Chat also retrieves indexed passages and records user interactions as user-stated evidence.
3. Import selected files from a public GitHub repository using `owner/repository` and file paths. The service resolves the requested revision to a commit SHA before fetching files. Cached source remains searchable offline. No private source is uploaded to GitHub, and private repository authentication is not implemented.
4. Supply a goal, bundled JavaScript modules, entry path, exported function, and input/expected checks. Passing components are retained, appear in the Computer capability registry, and run after restart. Failed attempts retain their check receipts without replacing previous working components.

For local model coding, start an OpenAI-compatible model server with suitable coding weights already installed, then configure the Computer host:

```sh
SYNTHIA_CODER_URL=http://127.0.0.1:1234/v1/chat/completions \
SYNTHIA_CODER_MODEL=your-local-coding-model npm --prefix computer start
```

Omit `files` from the build specification to have that model write modules using retrieved source passages. The loop executes the supplied acceptance checks, sends observed failures back for up to two repairs, and retains only a passing revision. The model receives the goal, checks, and retrieved excerpts locally. There is no cloud provider default. Model weights are not bundled: without a configured model, supplied source modules can still be assembled, checked and retained, but new code is not autonomously generated.

Component execution uses an embedded QuickJS runtime, independent of host filesystem, network and process APIs, with a 16 MiB heap and a 500 ms execution deadline per check. Only included synchronous JavaScript ES modules and JSON input/output are supported here. This bounded component runner supplements the existing Computer execution spine; it does not replace its native JavaScript or other donor execution paths. Passing supplied checks is evidence for those checks, not general correctness.

The workspace is persisted in existing Computer state. Source revisions and components are append-only except repeated identical evidence is refreshed. This is a working foundation for goal-driven assembly, not completion of the proposed universal compiler, arbitrary app synthesis, biological memory model, or unresolved semantic address rules. Existing resident neural organs remain mounted; the new retrieval ranking is lexical and does not claim to train those organs.

API routes (same local-origin boundary as existing APIs): `GET /api/learning`; `POST /api/learning/index`, `/search` (`query`), `/teach` (`text`, optional `correctionOf`), `/github` (`repository`, optional `ref`, `paths`), `/build`, and `/run` (`id`, `input`). The UI includes a complete sample build specification.

Checks: `npm --prefix computer run test:integration` and `npm --prefix computer run build`.
