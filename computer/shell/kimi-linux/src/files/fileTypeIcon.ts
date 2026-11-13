import type { LucideIcon } from 'lucide-react';
import {
  Folder, FileText, FileCode, FileJson, FileImage, FileVideo, FileAudio,
  FileArchive, FileSpreadsheet, Brain, Box, File, AppWindow,
} from 'lucide-react';

/** Lucide (ISC) icons that represent a file's type. */
const BY_EXT: Record<string, LucideIcon> = {
  txt: FileText, md: FileText, markdown: FileText, rtf: FileText, pdf: FileText, doc: FileText, docx: FileText,
  js: FileCode, mjs: FileCode, cjs: FileCode, jsx: FileCode, ts: FileCode, tsx: FileCode, py: FileCode,
  rb: FileCode, go: FileCode, rs: FileCode, java: FileCode, c: FileCode, h: FileCode, cpp: FileCode,
  cc: FileCode, cs: FileCode, php: FileCode, swift: FileCode, kt: FileCode, sh: FileCode, bash: FileCode,
  html: FileCode, htm: FileCode, css: FileCode, scss: FileCode, less: FileCode, vue: FileCode, svelte: FileCode,
  json: FileJson, jsonl: FileJson, yaml: FileCode, yml: FileCode, xml: FileCode, toml: FileCode,
  png: FileImage, jpg: FileImage, jpeg: FileImage, gif: FileImage, webp: FileImage, svg: FileImage, ico: FileImage, bmp: FileImage,
  mp4: FileVideo, webm: FileVideo, mov: FileVideo, mkv: FileVideo, avi: FileVideo,
  mp3: FileAudio, wav: FileAudio, flac: FileAudio, ogg: FileAudio, m4a: FileAudio,
  zip: FileArchive, tar: FileArchive, gz: FileArchive, tgz: FileArchive, '7z': FileArchive, rar: FileArchive,
  csv: FileSpreadsheet, xls: FileSpreadsheet, xlsx: FileSpreadsheet,
  pt: Brain, pth: Brain, ckpt: Brain, onnx: Brain, gguf: Brain, safetensors: Brain, bin: Brain, h5: Brain, tflite: Brain,
  wasm: Box, exe: AppWindow, apk: AppWindow, dmg: AppWindow,
};

export function fileTypeKind(name: string, type?: string): string {
  if (type === 'folder') return 'folder';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['pt', 'pth', 'ckpt', 'onnx', 'gguf', 'safetensors', 'tflite'].includes(ext)) return 'model';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(ext)) return 'audio';
  if (['zip', 'tar', 'gz', 'tgz', '7z', 'rar'].includes(ext)) return 'zip';
  if (['txt', 'md', 'markdown', 'rtf', 'pdf', 'doc', 'docx'].includes(ext)) return 'doc';
  if (['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'h', 'cpp', 'html', 'css', 'json', 'sh'].includes(ext)) return 'code';
  return 'file';
}

export function fileTypeIcon(name: string, type?: string): LucideIcon {
  if (type === 'folder') return Folder;
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return BY_EXT[ext] || File;
}

export const FILE_TYPE_ICON_LICENSE = 'Lucide icons, ISC License';
