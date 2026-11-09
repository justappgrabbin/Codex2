import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, Search, Download, Star, Users, Sparkles, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { TEMPLATE_REGISTRY } from "@/lib/templateRegistry";
import { FileSystem } from "@/lib/fileSystem";

interface StoreItem {
  id: string;
  name: string;
  author: string;
  description: string;
  category: "app" | "agent" | "template" | "tool" | "game" | "gan";
  downloads: number;
  rating: number;
  tags: string[];
  icon?: string;
  featured?: boolean;
  isTemplate?: boolean;
}

// Static community items
const COMMUNITY_ITEMS: StoreItem[] = [
  {
    id: "cosmic-chat",
    name: "Cosmic Chat Agent",
    author: "YOU–N–I–VERSE Team",
    description: "Advanced conversational AI agent with cosmic personality and deep creative knowledge",
    category: "agent",
    downloads: 1247,
    rating: 4.9,
    tags: ["AI", "Chat", "Creative"],
    featured: true
  },
  {
    id: "pixel-studio",
    name: "Pixel Art Studio",
    author: "PixelMaster",
    description: "Full-featured pixel art editor with animation support and export tools",
    category: "app",
    downloads: 892,
    rating: 4.7,
    tags: ["Art", "Graphics", "Tools"],
    featured: true
  },
  {
    id: "rpg-template",
    name: "RPG Adventure Template",
    author: "GameDev Pro",
    description: "Complete RPG game template with inventory, combat, and quest systems",
    category: "template",
    downloads: 2134,
    rating: 4.8,
    tags: ["Game", "RPG", "Template"],
    featured: true
  },
  {
    id: "code-mentor",
    name: "Code Mentor Agent",
    author: "DevHelper",
    description: "AI coding assistant specialized in JavaScript, Python, and web development",
    category: "agent",
    downloads: 1876,
    rating: 4.6,
    tags: ["AI", "Coding", "Education"]
  },
  {
    id: "music-sequencer",
    name: "Cosmic Music Sequencer",
    author: "SoundCraft",
    description: "Create and sequence music with a cosmic-themed interface",
    category: "app",
    downloads: 654,
    rating: 4.5,
    tags: ["Music", "Audio", "Creative"]
  },
  {
    id: "3d-viewer",
    name: "3D Model Viewer",
    author: "3D Universe",
    description: "Interactive 3D model viewer with rotation, zoom, and texture controls",
    category: "app",
    downloads: 1123,
    rating: 4.7,
    tags: ["3D", "Graphics", "Viewer"]
  },
  {
    id: "story-agent",
    name: "Story Weaver Agent",
    author: "NarrativeAI",
    description: "Creative writing assistant that helps craft compelling stories and narratives",
    category: "agent",
    downloads: 987,
    rating: 4.8,
    tags: ["AI", "Writing", "Creative"]
  },
  {
    id: "visual-novel",
    name: "Visual Novel Engine",
    author: "NovelCraft",
    description: "Complete visual novel game engine with branching dialogue and save system",
    category: "template",
    downloads: 756,
    rating: 4.6,
    tags: ["Game", "Story", "Template"]
  },
  {
    id: "data-viz",
    name: "Data Visualization Tool",
    author: "ChartMaster",
    description: "Create beautiful charts and graphs from your data with interactive controls",
    category: "tool",
    downloads: 1432,
    rating: 4.7,
    tags: ["Data", "Charts", "Analytics"]
  },
  {
    id: "shader-playground",
    name: "Shader Playground",
    author: "GraphicsGuru",
    description: "Experiment with WebGL shaders and create stunning visual effects",
    category: "app",
    downloads: 543,
    rating: 4.9,
    tags: ["Graphics", "WebGL", "Effects"]
  }
];

// Convert templates from registry to store items
const TEMPLATE_ITEMS: StoreItem[] = TEMPLATE_REGISTRY.map(template => ({
  id: template.id,
  name: template.title,
  author: template.author,
  description: template.description,
  category: template.category,
  downloads: template.downloads,
  rating: template.rating,
  tags: template.tags,
  icon: template.icon,
  featured: template.featured,
  isTemplate: true
}));

// Combine all store items
const STORE_ITEMS: StoreItem[] = [...COMMUNITY_ITEMS, ...TEMPLATE_ITEMS];

export function GroveStore() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const categories = [
    { id: "all", label: "All Items" },
    { id: "agent", label: "Agents" },
    { id: "app", label: "Apps" },
    { id: "template", label: "Templates" },
    { id: "game", label: "Games" },
    { id: "gan", label: "GANs" },
    { id: "tool", label: "Tools" }
  ];

  const filteredItems = STORE_ITEMS.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const featuredItems = filteredItems.filter(item => item.featured);
  const regularItems = filteredItems.filter(item => !item.featured);

  const handleDownload = (item: StoreItem) => {
    if (item.isTemplate) {
      const template = TEMPLATE_REGISTRY.find(t => t.id === item.id);
      if (!template) return;
      
      if (confirm(`Load ${item.name} template into IDE? This will replace current files.`)) {
        FileSystem.loadFileTree(template.files);
        toast({
          title: "Template Loaded!",
          description: `${item.name} is ready in the IDE`,
        });
        setTimeout(() => setLocation('/ide'), 500);
      }
    } else {
      toast({
        title: "Downloaded!",
        description: `${item.name} has been added to your workspace`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">

      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Store className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-primary">Grove Store</h1>
            <Sparkles className="h-6 w-6 text-primary/60" />
          </div>
          <p className="text-muted-foreground">
            Discover apps, agents, templates, and tools created by the YOU–N–I–VERSE community
          </p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="input-search-store"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Grove Store..."
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <Button
                key={category.id}
                data-testid={`button-category-${category.id}`}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className={selectedCategory === category.id ? "bg-primary hover:bg-primary/90" : ""}
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>

        {featuredItems.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Featured
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredItems.map((item) => (
                <StoreItemCard key={item.id} item={item} onDownload={handleDownload} featured />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xl font-semibold mb-4">
            {selectedCategory === "all" ? "All Items" : categories.find(c => c.id === selectedCategory)?.label}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularItems.map((item) => (
              <StoreItemCard key={item.id} item={item} onDownload={handleDownload} />
            ))}
          </div>
          
          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground">No items found matching your search</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

interface StoreItemCardProps {
  item: StoreItem;
  onDownload: (item: StoreItem) => void;
  featured?: boolean;
}

function StoreItemCard({ item, onDownload, featured }: StoreItemCardProps) {
  const categoryColors: Record<StoreItem['category'], string> = {
    app: "bg-primary/10 text-primary",
    agent: "bg-primary/10 text-primary",
    template: "bg-primary/10 text-primary",
    game: "bg-primary/10 text-primary",
    gan: "bg-primary/10 text-primary",
    tool: "bg-primary/10 text-primary"
  };

  const categoryIcons: Record<StoreItem['category'], string> = {
    app: "📱",
    agent: "🤖",
    template: "📋",
    game: "🎮",
    gan: "🧠",
    tool: "🛠️"
  };

  return (
    <Card
      className={`p-6 hover:border-primary/50 transition-all hover:shadow-lg ${
        featured ? "border-primary/30 bg-primary/5" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{item.icon || categoryIcons[item.category]}</span>
          <Badge className={categoryColors[item.category]}>
            {item.category}
          </Badge>
          {item.isTemplate && (
            <Badge variant="outline" className="text-xs">
              <Play className="h-3 w-3 mr-1" />
              Template
            </Badge>
          )}
        </div>
        {featured && (
          <Sparkles className="h-4 w-4 text-primary" />
        )}
      </div>

      <h3 className="text-lg font-semibold mb-1">{item.name}</h3>
      <p className="text-xs text-muted-foreground mb-3">by {item.author}</p>
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{item.description}</p>

      <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 fill-primary text-primary" />
          <span>{item.rating}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span>{item.downloads.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {item.tags.map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      <Button
        data-testid={`button-download-${item.id}`}
        className="w-full bg-primary hover:bg-primary/90"
        onClick={() => onDownload(item)}
      >
        {item.isTemplate ? (
          <>
            <Play className="h-4 w-4 mr-2" />
            Load Template
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Download
          </>
        )}
      </Button>
    </Card>
  );
}
