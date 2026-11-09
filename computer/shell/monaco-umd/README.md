# Synthia Monaco UMD bundle

Monaco Editor is bundled with [rollup-monaco-bundler](https://github.com/janpoem/rollup-monaco-bundler) (MIT License, Copyright (c) 2025 Jiankai Zeng). This is the bundling path for the Computer's workspace editor. The shell is Vite; Monaco itself is pre-bundled as UMD so it stays outside the main app bundle.

Source Monaco is MIT (Microsoft). GUAGAN's `DevEnvironment.jsx` (copied under `computer/donors/copied/guagan-monaco/`) is reused for layout/templates where it fits.
