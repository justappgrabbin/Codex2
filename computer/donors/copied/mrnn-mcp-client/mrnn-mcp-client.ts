// ============================================================================
// mrnn-mcp-client.ts - MRNN MCP Client & Integration Layer
// ============================================================================
// This client connects the MRNN engine to any MCP-compatible host (Claude Code,
// OpenCode, Cursor, etc.) and provides the bridge between MRNN's multi-layer
// architecture and standard tool interfaces.
// ============================================================================

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// ============================================================================
// MRNN MCP CLIENT
// ============================================================================

export interface MRNNMCPClientConfig {
  serverUrl: string;
  transport: 'stdio' | 'sse' | 'websocket';
  authToken?: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  layerRouting: 'auto' | 'manual' | 'astrological';
  defaultLayer: string;
  enableTracing: boolean;
  enableMorphSync: boolean;
}

export interface InferenceRequest {
  prompt: string;
  layerId?: string;
  options?: {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    recursionDepth?: number;
    convergenceThreshold?: number;
  };
  context?: {
    previousMessages?: { role: string; content: string }[];
    astrologicalCoord?: {
      longitude: number;
      latitude: number;
      date: string;
    };
    userProfile?: {
      humanDesign?: {
        type: string;
        strategy: string;
        authority: string;
        gates: number[];
        channels: string[];
        centers: Record<string, boolean>;
      };
      goals?: string[];
      preferences?: Record<string, any>;
    };
  };
}

export interface InferenceResponse {
  output: string;
  metadata: {
    layerTrace: string[];
    iterations: number;
    convergenceScore: number;
    generationTime: number;
    tokensUsed: number;
    astrologicalCoord: any;
    embeddings: number[][];
  };
  morphState: any;
  growthEvents: any[];
}

export class MRNNMCPClient {
  private client: Client;
  private transport: any;
  private config: MRNNMCPClientConfig;
  private connected = false;
  private reconnectAttempts = 0;
  private messageHistory: InferenceResponse[] = [];
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(config: MRNNMCPClientConfig) {
    this.config = config;
    this.client = new Client({ name: 'mrnn-client', version: '1.0.0' });

    switch (config.transport) {
      case 'stdio':
        this.transport = new StdioClientTransport({
          command: 'node',
          args: ['mrnn-inference-engine.js']
        });
        break;
      case 'sse':
        this.transport = new SSEClientTransport(new URL(config.serverUrl));
        break;
      case 'websocket':
        this.transport = new WebSocketClientTransport(new URL(config.serverUrl));
        break;
    }
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect(this.transport);
      this.connected = true;
      this.reconnectAttempts = 0;
      console.log('[MRNN-Client] Connected to MRNN engine');

      // List available tools
      const tools = await this.client.listTools();
      console.log('[MRNN-Client] Available tools:', tools.tools.map(t => t.name));

    } catch (error) {
      console.error('[MRNN-Client] Connection failed:', error);
      await this.attemptReconnect();
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      throw new Error('Max reconnect attempts reached');
    }

    this.reconnectAttempts++;
    console.log(`[MRNN-Client] Reconnecting... attempt ${this.reconnectAttempts}`);

    await new Promise(r => setTimeout(r, this.config.reconnectInterval));
    await this.connect();
  }

  async infer(request: InferenceRequest): Promise<InferenceResponse> {
    if (!this.connected) {
      throw new Error('Not connected to MRNN engine');
    }

    // Determine target layer
    const layerId = await this.selectLayer(request);

    // Build enriched prompt with context
    const enrichedPrompt = this.enrichPrompt(request);

    // Call MRNN inference tool
    const result = await this.client.callTool({
      name: 'mrnn_infer',
      arguments: {
        prompt: enrichedPrompt,
        layerId,
        options: request.options || {}
      }
    }) as CallToolResult;

    const inferenceResult = JSON.parse(result.content[0].text);

    // Fetch morph state if enabled
    let morphState = null;
    if (this.config.enableMorphSync) {
      const morphResult = await this.client.callTool({
        name: 'mrnn_morph_state',
        arguments: {}
      }) as CallToolResult;
      morphState = JSON.parse(morphResult.content[0].text);
    }

    const response: InferenceResponse = {
      output: inferenceResult.output,
      metadata: {
        layerTrace: inferenceResult.layerTrace,
        iterations: inferenceResult.iterations,
        convergenceScore: inferenceResult.convergenceScore,
        generationTime: inferenceResult.generationTime,
        tokensUsed: inferenceResult.tokens,
        astrologicalCoord: inferenceResult.astrologicalCoords[0],
        embeddings: inferenceResult.embeddings
      },
      morphState,
      growthEvents: []
    };

    this.messageHistory.push(response);
    this.emit('inference', response);

    return response;
  }

  private async selectLayer(request: InferenceRequest): Promise<string> {
    switch (this.config.layerRouting) {
      case 'manual':
        return request.layerId || this.config.defaultLayer;

      case 'astrological':
        // Use astrological coordinates to select layer
        const astroResult = await this.client.callTool({
          name: 'mrnn_astro_coord',
          arguments: {}
        }) as CallToolResult;
        const coord = JSON.parse(astroResult.content[0].text);
        return this.mapAstrologicalToLayer(coord);

      case 'auto':
      default:
        // Analyze prompt content to select best layer
        return this.analyzePromptForLayer(request.prompt);
    }
  }

  private mapAstrologicalToLayer(coord: any): string {
    // Map astrological house/sign to layer dimension
    const house = coord.house;
    const sign = coord.sign;

    // Dimensional mapping based on astrological principles
    const houseToDimension: Record<number, number> = {
      1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3,
      7: 4, 8: 4, 9: 5, 10: 5, 11: 3, 12: 2
    };

    const dimension = houseToDimension[house] || 3;
    return `layer-${dimension}`;
  }

  private analyzePromptForLayer(prompt: string): string {
    const lower = prompt.toLowerCase();

    // Keyword-based routing
    if (lower.includes('syntax') || lower.includes('parse') || lower.includes('token')) {
      return 'layer-1';
    }
    if (lower.includes('meaning') || lower.includes('semantic') || lower.includes('context')) {
      return 'layer-2';
    }
    if (lower.includes('topology') || lower.includes('graph') || lower.includes('structure') || lower.includes('relationship')) {
      return 'layer-3';
    }
    if (lower.includes('cosmology') || lower.includes('pattern') || lower.includes('cycle') || lower.includes('harmony')) {
      return 'layer-4';
    }
    if (lower.includes('emerge') || lower.includes('synthesis') || lower.includes('create') || lower.includes('evolve')) {
      return 'layer-5';
    }

    // Default to topology layer for general coding
    return this.config.defaultLayer;
  }

  private enrichPrompt(request: InferenceRequest): string {
    let enriched = request.prompt;

    // Add user profile context if available
    if (request.context?.userProfile) {
      const profile = request.context.userProfile;

      if (profile.humanDesign) {
        const hd = profile.humanDesign;
        enriched += `\n\n[User Profile: Type=${hd.type}, Strategy=${hd.strategy}, Authority=${hd.authority}, Active Gates=[${hd.gates.join(',')}], Channels=[${hd.channels.join(',')}], Defined Centers=[${Object.entries(hd.centers).filter(([_, v]) => v).map(([k]) => k).join(',')}]]`;
      }

      if (profile.goals?.length) {
        enriched += `\n[User Goals: ${profile.goals.join(', ')}]`;
      }
    }

    // Add astrological context
    if (request.context?.astrologicalCoord) {
      const astro = request.context.astrologicalCoord;
      enriched += `\n[Current Astro: Long=${astro.longitude}, Lat=${astro.latitude}, Date=${astro.date}]`;
    }

    return enriched;
  }

  async getLayerStatus(layerId: string): Promise<any> {
    const result = await this.client.callTool({
      name: 'mrnn_layer_status',
      arguments: { layerId }
    }) as CallToolResult;

    return JSON.parse(result.content[0].text);
  }

  async getGraphStatus(): Promise<any> {
    const result = await this.client.callTool({
      name: 'mrnn_graph_status',
      arguments: {}
    }) as CallToolResult;

    return JSON.parse(result.content[0].text);
  }

  async triggerGrowth(trigger: string): Promise<any> {
    const result = await this.client.callTool({
      name: 'mrnn_grow',
      arguments: { trigger }
    }) as CallToolResult;

    return JSON.parse(result.content[0].text);
  }

  async getMorphState(): Promise<any> {
    const result = await this.client.callTool({
      name: 'mrnn_morph_state',
      arguments: {}
    }) as CallToolResult;

    return JSON.parse(result.content[0].text);
  }

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(h => h(data));
  }

  getMessageHistory(): InferenceResponse[] {
    return [...this.messageHistory];
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    this.connected = false;
    console.log('[MRNN-Client] Disconnected');
  }
}

// ============================================================================
// OPENCODE INTEGRATION
// ============================================================================

export class OpenCodeMRNNIntegration {
  private client: MRNNMCPClient;
  private opencodeConfig: any;

  constructor(mcpClient: MRNNMCPClient, opencodeConfig: any) {
    this.client = mcpClient;
    this.opencodeConfig = opencodeConfig;
  }

  async setupProvider(): Promise<void> {
    // Configure OpenCode to use MRNN as a provider
    const providerConfig = {
      "$schema": "https://opencode.ai/config.json",
      "provider": {
        "mrnn": {
          "npm": "@ai-sdk/openai-compatible",
          "name": "MRNN Multi-Layer Engine (local)",
          "options": {
            "baseURL": "http://127.0.0.1:18082/v1"
          },
          "models": {
            "mrnn-default": {
              "name": "MRNN Topology Layer (Auto-routing)",
              "limit": {
                "context": 262144,
                "output": 16384
              }
            },
            "mrnn-syntax": {
              "name": "MRNN Syntax Layer (Dimension 1)",
              "limit": {
                "context": 32768,
                "output": 8192
              }
            },
            "mrnn-semantic": {
              "name": "MRNN Semantic Layer (Dimension 2)",
              "limit": {
                "context": 65536,
                "output": 8192
              }
            },
            "mrnn-topology": {
              "name": "MRNN Topology Layer (Dimension 3)",
              "limit": {
                "context": 131072,
                "output": 16384
              }
            },
            "mrnn-cosmology": {
              "name": "MRNN Cosmology Layer (Dimension 4)",
              "limit": {
                "context": 131072,
                "output": 16384
              }
            },
            "mrnn-emergence": {
              "name": "MRNN Emergence Layer (Dimension 5)",
              "limit": {
                "context": 262144,
                "output": 16384
              }
            }
          }
        }
      }
    };

    // Write OpenCode config
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.env.HOME || '.', '.config', 'opencode', 'config.json');

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(providerConfig, null, 2));

    console.log('[OpenCode-MRNN] Provider config written to', configPath);
  }

  async createMRNNAgent(): Promise<void> {
    // Create a custom OpenCode agent that leverages MRNN's multi-layer architecture
    const agentConfig = {
      name: 'mrnn-coding-agent',
      description: 'Multi-layer recursive neural network coding agent with astrological awareness',
      systemPrompt: `You are an MRNN-powered coding agent. You operate across 5 dimensional layers:
- Layer 1 (Syntax): Handles parsing, tokenization, structural analysis
- Layer 2 (Semantic): Manages meaning, context, references
- Layer 3 (Topology): Processes graphs, relationships, structures
- Layer 4 (Cosmology): Understands patterns, cycles, harmony
- Layer 5 (Emergence): Creates synthesis, evolution, new forms

Each request is routed through the appropriate layer(s) based on content analysis and astrological coordinates. The system uses message-passing graph topology with wave propagation between layers.

When given a coding task:
1. Let the MRNN engine route to the appropriate starting layer
2. Allow recursive message passing between layers as needed
3. Review the layer trace to understand how the solution was constructed
4. Present the final output with metadata about the inference path`,
      model: 'mrnn-default',
      tools: ['mrnn_infer', 'mrnn_layer_status', 'mrnn_graph_status', 'mrnn_morph_state']
    };

    console.log('[OpenCode-MRNN] Agent config:', agentConfig);
  }
}

// ============================================================================
// CLAUDE CODE INTEGRATION
// ============================================================================

export class ClaudeCodeMRNNIntegration {
  private client: MRNNMCPClient;

  constructor(mcpClient: MRNNMCPClient) {
    this.client = mcpClient;
  }

  async setupClaudeCodeConfig(): Promise<void> {
    // Claude Code uses .mcp.json for MCP server configuration
    const claudeConfig = {
      "mcpServers": {
        "mrnn": {
          "command": "node",
          "args": ["/path/to/mrnn-inference-engine.js"],
          "env": {
            "MRNN_PORT": "18081",
            "MRNN_TRANSPORT": "stdio"
          }
        }
      }
    };

    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.env.HOME || '.', '.claude', 'mcp.json');

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(claudeConfig, null, 2));

    console.log('[ClaudeCode-MRNN] MCP config written to', configPath);
  }

  async createCustomCommands(): Promise<void> {
    // Custom slash commands for Claude Code
    const commands = {
      "/mrnn-infer": {
        description: "Run inference through MRNN engine",
        handler: async (args: string) => {
          const result = await this.client.infer({ prompt: args });
          return result.output;
        }
      },
      "/mrnn-status": {
        description: "Get MRNN engine status",
        handler: async () => {
          const graph = await this.client.getGraphStatus();
          return JSON.stringify(graph, null, 2);
        }
      },
      "/mrnn-morph": {
        description: "Get morphing visualizer state",
        handler: async () => {
          const state = await this.client.getMorphState();
          return JSON.stringify(state, null, 2);
        }
      },
      "/mrnn-layer": {
        description: "Get specific layer status",
        handler: async (layerId: string) => {
          const status = await this.client.getLayerStatus(layerId);
          return JSON.stringify(status, null, 2);
        }
      }
    };

    console.log('[ClaudeCode-MRNN] Custom commands registered:', Object.keys(commands));
  }
}

// ============================================================================
// CURSOR INTEGRATION
// ============================================================================

export class CursorMRNNIntegration {
  private client: MRNNMCPClient;

  constructor(mcpClient: MRNNMCPClient) {
    this.client = mcpClient;
  }

  async setupCursorConfig(): Promise<void> {
    // Cursor uses .cursor/mcp.json
    const cursorConfig = {
      "mcpServers": {
        "mrnn-engine": {
          "url": "http://127.0.0.1:18081/mcp/v1",
          "transport": "sse"
        }
      }
    };

    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.env.HOME || '.', '.cursor', 'mcp.json');

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(cursorConfig, null, 2));

    console.log('[Cursor-MRNN] MCP config written to', configPath);
  }
}

// ============================================================================
// UNIVERSAL MRNN WRAPPER
// ============================================================================

export class UniversalMRNNWrapper {
  private client: MRNNMCPClient;
  private integrations: {
    opencode?: OpenCodeMRNNIntegration;
    claude?: ClaudeCodeMRNNIntegration;
    cursor?: CursorMRNNIntegration;
  } = {};

  constructor(config: MRNNMCPClientConfig) {
    this.client = new MRNNMCPClient(config);
  }

  async initialize(): Promise<void> {
    await this.client.connect();

    // Setup all integrations
    this.integrations.opencode = new OpenCodeMRNNIntegration(this.client, {});
    this.integrations.claude = new ClaudeCodeMRNNIntegration(this.client);
    this.integrations.cursor = new CursorMRNNIntegration(this.client);

    console.log('[MRNN-Wrapper] All integrations initialized');
  }

  async setupAll(): Promise<void> {
    await this.integrations.opencode?.setupProvider();
    await this.integrations.opencode?.createMRNNAgent();
    await this.integrations.claude?.setupClaudeCodeConfig();
    await this.integrations.claude?.createCustomCommands();
    await this.integrations.cursor?.setupCursorConfig();

    console.log('[MRNN-Wrapper] All IDE integrations configured');
  }

  async infer(prompt: string, options?: any): Promise<InferenceResponse> {
    return this.client.infer({
      prompt,
      options,
      context: {
        previousMessages: this.client.getMessageHistory().map(h => ({
          role: 'assistant',
          content: h.output
        }))
      }
    });
  }

  async getStatus(): Promise<{
    connected: boolean;
    graph: any;
    layers: any[];
    morph: any;
  }> {
    const graph = await this.client.getGraphStatus();
    const morph = await this.client.getMorphState();

    const layerIds = ['layer-1', 'layer-2', 'layer-3', 'layer-4', 'layer-5'];
    const layers = await Promise.all(
      layerIds.map(id => this.client.getLayerStatus(id).catch(() => null))
    );

    return {
      connected: true,
      graph,
      layers: layers.filter(Boolean),
      morph
    };
  }

  on(event: string, handler: Function): void {
    this.client.on(event, handler);
  }

  async shutdown(): Promise<void> {
    await this.client.disconnect();
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

export async function main(): Promise<void> {
  const config: MRNNMCPClientConfig = {
    serverUrl: 'ws://127.0.0.1:18081',
    transport: 'websocket',
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    layerRouting: 'auto',
    defaultLayer: 'layer-3',
    enableTracing: true,
    enableMorphSync: true
  };

  const wrapper = new UniversalMRNNWrapper(config);

  try {
    await wrapper.initialize();
    await wrapper.setupAll();

    // Example inference
    const result = await wrapper.infer('Write a recursive function that traverses a 5-dimensional graph');

    console.log('\n=== MRNN Inference Result ===');
    console.log('Output:', result.output.substring(0, 300) + '...');
    console.log('Layer Trace:', result.metadata.layerTrace);
    console.log('Iterations:', result.metadata.iterations);
    console.log('Convergence:', result.metadata.convergenceScore);
    console.log('Generation Time:', result.metadata.generationTime + 'ms');

    // Get status
    const status = await wrapper.getStatus();
    console.log('\n=== MRNN Status ===');
    console.log('Graph Topology:', status.graph.topology);
    console.log('Active Layers:', status.layers.length);

  } catch (error) {
    console.error('[MRNN-Wrapper] Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
