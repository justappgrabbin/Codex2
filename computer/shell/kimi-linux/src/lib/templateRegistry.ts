import { type FileNode } from './fileSystem';
import { GAME_TEMPLATES } from './gameTemplates';
import { GAN_TEMPLATES } from './ganTemplates';

export type TemplateCategory = 'game' | 'gan' | 'app' | 'agent' | 'tool';

export interface Template {
  id: string;
  title: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  author: string;
  downloads: number;
  rating: number;
  icon: string;
  files: FileNode[];
  featured?: boolean;
}

// Convert game templates to unified format
const gameTemplatesUnified: Template[] = GAME_TEMPLATES.map(template => ({
  id: template.id,
  title: template.title,
  description: template.description,
  category: 'game' as TemplateCategory,
  tags: template.tags,
  author: 'YOU–N–I–VERSE',
  downloads: Math.floor(Math.random() * 5000) + 1000,
  rating: 4.5 + Math.random() * 0.5,
  icon: '🎮',
  files: template.files,
  featured: template.id === 'platformer'
}));

// Convert GAN templates to unified format
const ganTemplatesUnified: Template[] = GAN_TEMPLATES.map(template => ({
  id: template.id,
  title: template.title,
  description: template.description,
  category: 'gan' as TemplateCategory,
  tags: template.tags,
  author: 'YOU–N–I–VERSE',
  downloads: Math.floor(Math.random() * 3000) + 500,
  rating: 4.3 + Math.random() * 0.7,
  icon: '🧠',
  files: template.files,
  featured: template.id === 'simple-gan'
}));

// All templates in one registry
export const TEMPLATE_REGISTRY: Template[] = [
  ...gameTemplatesUnified,
  ...ganTemplatesUnified
];

// Helper functions to filter templates
export const getTemplatesByCategory = (category: TemplateCategory): Template[] => {
  return TEMPLATE_REGISTRY.filter(t => t.category === category);
};

export const getFeaturedTemplates = (): Template[] => {
  return TEMPLATE_REGISTRY.filter(t => t.featured);
};

export const getTemplateById = (id: string): Template | undefined => {
  return TEMPLATE_REGISTRY.find(t => t.id === id);
};
