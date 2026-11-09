import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Save, Download, FileCode, Eye, Terminal as TerminalIcon } from 'lucide-react';

const TEMPLATES = {
  game: {
    name: 'Canvas Game',
    code: `// Consciousness Field Game
class FieldGame {
  constructor() {
    this.particles = [];
    this.dimensions = ['MOVEMENT', 'MIND', 'BODY', 'EGO', 'PERSONALITY'];
    this.currentDim = 0;
  }

  createParticle() {
    return {
      x: Math.random() * 800,
      y: Math.random() * 600,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      color: this.getColor()
    };
  }

  getColor() {
    const colors = ['#9333ea', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
    return colors[this.currentDim % colors.length];
  }

  update() {
    if (this.particles.length < 50) {
      this.particles.push(this.createParticle());
    }
    
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > 800) p.vx *= -1;
      if (p.y < 0 || p.y > 600) p.vy *= -1;
    });
  }

  render() {
    return \`Consciousness Game Running
    Dimension: \${this.dimensions[this.currentDim]}
    Particles: \${this.particles.length}
    Field: Active\`;
  }
}

const game = new FieldGame();
game.update();
console.log(game.render());
return game.render();
`
  },
  website: {
    name: 'Website Builder',
    code: `// Consciousness Website Generator
const createPage = (title, content) => {
  return \`
<!DOCTYPE html>
<html>
<head>
  <title>\${title}</title>
  <style>
    body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-family: system-ui;
      padding: 2rem;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      text-align: center;
      max-width: 600px;
    }
    h1 { font-size: 3rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>\${title}</h1>
    <p>\${content}</p>
  </div>
</body>
</html>
  \`;
};

const page = createPage(
  'Consciousness Field Generator',
  'Your semantic journey begins here...'
);

console.log('Website created!');
return page;
`
  },
  agent: {
    name: 'AI Agent',
    code: `// Consciousness-Aware AI Agent
class SemanticAgent {
  constructor(dimension) {
    this.dimension = dimension;
    this.memory = [];
  }

  async process(input) {
    const field = this.parseField(input);
    const response = await this.generateResponse(field);
    this.memory.push({ input, response, field });
    return response;
  }

  parseField(input) {
    // Parse using 5-field consciousness system
    return {
      dimension: this.dimension,
      gate: this.extractGate(input),
      keynote: this.getKeynote()
    };
  }

  async generateResponse(field) {
    return \`Processing through \${field.dimension} field...\`;
  }

  extractGate(input) {
    const match = input.match(/gate\\s*(\\d+)/i);
    return match ? parseInt(match[1]) : null;
  }

  getKeynote() {
    const keynotes = {
      MOVEMENT: 'I Define',
      MIND: 'I Remember',
      BODY: 'I Am',
      EGO: 'I Design',
      PERSONALITY: 'I Think'
    };
    return keynotes[this.dimension] || 'I Exist';
  }
}

const agent = new SemanticAgent('MIND');
console.log(await agent.process('Gate 46 activation'));
`
  }
};

export default function DevEnvironment() {
  const [code, setCode] = useState(TEMPLATES.website.code);
  const [currentTemplate, setCurrentTemplate] = useState('website');
  const [output, setOutput] = useState('');
  const [showPreview, setShowPreview] = useState(true);

  const runCode = async () => {
    try {
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const asyncFn = new AsyncFunction(code);
      const result = await asyncFn();
      setOutput(result || 'Code executed successfully');
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Toolbar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-3">
        <select
          value={currentTemplate}
          onChange={(e) => {
            setCurrentTemplate(e.target.value);
            setCode(TEMPLATES[e.target.value].code);
          }}
          className="px-3 py-1 bg-gray-800 rounded text-xs outline-none"
        >
          <option value="game">Game Template</option>
          <option value="website">Website Template</option>
          <option value="agent">Agent Template</option>
        </select>

        <button
          onClick={runCode}
          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs flex items-center gap-1"
        >
          <Play size={12} /> Run
        </button>

        <button
          onClick={() => setShowPreview(!showPreview)}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs flex items-center gap-1"
        >
          <Eye size={12} /> {showPreview ? 'Hide' : 'Show'} Preview
        </button>

        <button className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs flex items-center gap-1">
          <Save size={12} /> Save
        </button>

        <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs flex items-center gap-1">
          <Download size={12} /> Export
        </button>
      </div>

      {/* Editor and Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Editor */}
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} border-r border-gray-800`}>
          <Editor
            height="100%"
            defaultLanguage="javascript"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>

        {/* Preview/Output */}
        {showPreview && (
          <div className="w-1/2 bg-gray-900 flex flex-col">
            <div className="bg-gray-800 px-4 py-2 text-xs font-bold border-b border-gray-700 flex items-center gap-2">
              <TerminalIcon size={12} /> Console Output
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">
                {output || 'Run code to see output...'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
