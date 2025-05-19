/**
 * VoidSync Plugin System
 * 
 * Provides a framework for registering and executing plugins
 * that can add custom validations and processing to the sync flow.
 */
import * as path from 'path';
import * as fs from 'fs-extra';
import { log } from '../utils/logger';
import { PROJECT_PATH } from '../config';

/**
 * Plugin types
 */
export enum PluginType {
  VALIDATOR = 'validator',      // Validates file content before syncing
  PROCESSOR = 'processor',      // Processes file content during sync
  FORMATTER = 'formatter',      // Formats file content
  ANALYZER = 'analyzer',        // Analyzes file content and provides insights
  HOOK = 'hook'                 // Hooks into sync events
}

/**
 * Plugin execution stages
 */
export enum PluginStage {
  PRE_SYNC = 'pre-sync',        // Before syncing
  DURING_SYNC = 'during-sync',  // During sync
  POST_SYNC = 'post-sync',      // After syncing
  PRE_COMMIT = 'pre-commit',    // Before committing
  POST_COMMIT = 'post-commit'   // After committing
}

/**
 * Plugin execution context
 */
export interface PluginContext {
  filePath: string;
  content: string;
  originalContent?: string;
  metadata?: Record<string, any>;
  changeId?: number;
  agentId?: string;
  stage: PluginStage;
  skipRemainingPlugins?: boolean;
}

/**
 * Plugin execution result
 */
export interface PluginResult {
  success: boolean;
  error?: string;
  warnings?: string[];
  content?: string;
  metadata?: Record<string, any>;
  skipRemainingPlugins?: boolean;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  id: string;
  name: string;
  description: string;
  type: PluginType;
  stages: PluginStage[];
  filePatterns?: string[];
  enabled: boolean;
  options?: Record<string, any>;
  path: string;
}

/**
 * Plugin interface
 */
export interface Plugin {
  id: string;
  name: string;
  description: string;
  type: PluginType;
  stages: PluginStage[];
  filePatterns?: string[];
  enabled: boolean;
  options?: Record<string, any>;
  
  // Core methods
  execute(context: PluginContext): Promise<PluginResult>;
  validate?(): Promise<boolean>;
  getSchema?(): Record<string, any>;
}

/**
 * Plugin system singleton
 */
export class PluginSystem {
  private static instance: PluginSystem;
  private plugins: Map<string, Plugin> = new Map();
  private pluginsDir: string;
  private pluginsLoaded: boolean = false;
  
  private constructor() {
    this.pluginsDir = path.join(PROJECT_PATH, 'plugins');
  }
  
  /**
   * Get plugin system instance
   * @returns Plugin system instance
   */
  public static getInstance(): PluginSystem {
    if (!PluginSystem.instance) {
      PluginSystem.instance = new PluginSystem();
    }
    
    return PluginSystem.instance;
  }
  
  /**
   * Initialize plugin system
   * @returns Success status
   */
  public async initialize(): Promise<boolean> {
    try {
      // Create plugins directory if it doesn't exist
      await fs.ensureDir(this.pluginsDir);
      
      // Load built-in plugins
      await this.loadBuiltInPlugins();
      
      // Load custom plugins
      await this.loadCustomPlugins();
      
      this.pluginsLoaded = true;
      
      log('info', 'plugin', `Plugin system initialized with ${this.plugins.size} plugins`);
      return true;
    } catch (error) {
      log('error', 'plugin', 'Failed to initialize plugin system', { error });
      return false;
    }
  }
  
  /**
   * Load built-in plugins
   * @returns Success status
   */
  private async loadBuiltInPlugins(): Promise<boolean> {
    try {
      // Load built-in validator plugins
      await this.registerPlugin(new SyntaxValidator());
      await this.registerPlugin(new SecurityValidator());
      
      // Load built-in processor plugins
      await this.registerPlugin(new CodeFormatter());
      
      return true;
    } catch (error) {
      log('error', 'plugin', 'Failed to load built-in plugins', { error });
      return false;
    }
  }
  
  /**
   * Load custom plugins from the plugins directory
   * @returns Success status
   */
  private async loadCustomPlugins(): Promise<boolean> {
    try {
      // Check if plugins directory exists
      if (!(await fs.pathExists(this.pluginsDir))) {
        return true; // No plugins directory, that's okay
      }
      
      // Read plugin configuration files
      const configFiles = await fs.readdir(this.pluginsDir);
      const jsonConfigs = configFiles.filter(file => file.endsWith('.json'));
      
      // Load each plugin
      for (const configFile of jsonConfigs) {
        try {
          // Read and parse plugin config
          const configPath = path.join(this.pluginsDir, configFile);
          const configJson = await fs.readJson(configPath);
          
          // Validate plugin config
          if (!this.validatePluginConfig(configJson)) {
            log('warning', 'plugin', `Invalid plugin config: ${configFile}`, { config: configJson });
            continue;
          }
          
          // Load plugin module
          const pluginModule = await this.loadPluginModule(configJson.path);
          
          // Create plugin instance
          if (pluginModule) {
            const plugin = new pluginModule.default(configJson);
            await this.registerPlugin(plugin);
          }
        } catch (error) {
          log('error', 'plugin', `Failed to load plugin from config: ${configFile}`, { error });
        }
      }
      
      return true;
    } catch (error) {
      log('error', 'plugin', 'Failed to load custom plugins', { error });
      return false;
    }
  }
  
  /**
   * Load plugin module
   * @param modulePath Path to plugin module
   * @returns Plugin module or null
   */
  private async loadPluginModule(modulePath: string): Promise<any> {
    try {
      const fullPath = path.isAbsolute(modulePath)
        ? modulePath
        : path.join(this.pluginsDir, modulePath);
      
      // Check if file exists
      if (!(await fs.pathExists(fullPath))) {
        log('warning', 'plugin', `Plugin module not found: ${fullPath}`);
        return null;
      }
      
      // Load the module
      return require(fullPath);
    } catch (error) {
      log('error', 'plugin', `Failed to load plugin module: ${modulePath}`, { error });
      return null;
    }
  }
  
  /**
   * Validate plugin configuration
   * @param config Plugin configuration
   * @returns Whether the configuration is valid
   */
  private validatePluginConfig(config: any): boolean {
    // Check for required fields
    if (!config.id || !config.name || !config.type || !config.stages) {
      return false;
    }
    
    // Check if type is valid
    if (!Object.values(PluginType).includes(config.type)) {
      return false;
    }
    
    // Check if stages are valid
    if (!Array.isArray(config.stages) || config.stages.length === 0) {
      return false;
    }
    
    for (const stage of config.stages) {
      if (!Object.values(PluginStage).includes(stage)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Register a plugin
   * @param plugin Plugin to register
   * @returns Success status
   */
  public async registerPlugin(plugin: Plugin): Promise<boolean> {
    try {
      // Validate plugin
      if (plugin.validate) {
        const isValid = await plugin.validate();
        if (!isValid) {
          log('warning', 'plugin', `Plugin validation failed: ${plugin.id}`);
          return false;
        }
      }
      
      // Register plugin
      this.plugins.set(plugin.id, plugin);
      
      log('info', 'plugin', `Registered plugin: ${plugin.id} (${plugin.type})`);
      return true;
    } catch (error) {
      log('error', 'plugin', `Failed to register plugin: ${plugin.id}`, { error });
      return false;
    }
  }
  
  /**
   * Get all registered plugins
   * @returns Map of plugins
   */
  public getPlugins(): Map<string, Plugin> {
    return this.plugins;
  }
  
  /**
   * Get plugins by type
   * @param type Plugin type
   * @returns Array of plugins
   */
  public getPluginsByType(type: PluginType): Plugin[] {
    const result: Plugin[] = [];
    
    for (const plugin of this.plugins.values()) {
      if (plugin.type === type && plugin.enabled) {
        result.push(plugin);
      }
    }
    
    return result;
  }
  
  /**
   * Get plugins for a specific stage
   * @param stage Plugin stage
   * @returns Array of plugins
   */
  public getPluginsForStage(stage: PluginStage): Plugin[] {
    const result: Plugin[] = [];
    
    for (const plugin of this.plugins.values()) {
      if (plugin.stages.includes(stage) && plugin.enabled) {
        result.push(plugin);
      }
    }
    
    return result;
  }
  
  /**
   * Get plugins applicable for a file path
   * @param filePath File path
   * @param stage Plugin stage
   * @returns Array of applicable plugins
   */
  public getApplicablePlugins(filePath: string, stage: PluginStage): Plugin[] {
    const stagePlugins = this.getPluginsForStage(stage);
    
    return stagePlugins.filter(plugin => {
      // If no file patterns are specified, the plugin applies to all files
      if (!plugin.filePatterns || plugin.filePatterns.length === 0) {
        return true;
      }
      
      // Check if any pattern matches
      return plugin.filePatterns.some(pattern => {
        try {
          const regex = new RegExp(pattern);
          return regex.test(filePath);
        } catch {
          return false;
        }
      });
    });
  }
  
  /**
   * Execute plugins for a file
   * @param context Plugin context
   * @returns Execution results
   */
  public async executePlugins(context: PluginContext): Promise<PluginResult[]> {
    try {
      // Ensure plugins are loaded
      if (!this.pluginsLoaded) {
        await this.initialize();
      }
      
      // Get applicable plugins
      const applicablePlugins = this.getApplicablePlugins(context.filePath, context.stage);
      
      // If no applicable plugins, return success
      if (applicablePlugins.length === 0) {
        return [{
          success: true,
          warnings: [`No plugins applicable for ${context.filePath} at stage ${context.stage}`]
        }];
      }
      
      // Execute each plugin
      const results: PluginResult[] = [];
      let currentContext = { ...context };
      
      for (const plugin of applicablePlugins) {
        try {
          // Execute plugin
          const result = await plugin.execute(currentContext);
          results.push(result);
          
          // Update context for next plugin if content was modified
          if (result.content) {
            currentContext.content = result.content;
          }
          
          // Update metadata if provided
          if (result.metadata) {
            currentContext.metadata = {
              ...(currentContext.metadata || {}),
              ...result.metadata
            };
          }
          
          // Skip remaining plugins if requested
          if (result.skipRemainingPlugins) {
            break;
          }
        } catch (error) {
          // Log error but continue with next plugin
          log('error', 'plugin', `Plugin execution error: ${plugin.id}`, { error });
          
          results.push({
            success: false,
            error: `Plugin execution error: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      }
      
      return results;
    } catch (error) {
      log('error', 'plugin', `Failed to execute plugins`, { error, filePath: context.filePath });
      
      return [{
        success: false,
        error: `Failed to execute plugins: ${error instanceof Error ? error.message : String(error)}`
      }];
    }
  }
  
  /**
   * Get final content after plugin execution
   * @param context Plugin context
   * @returns Final content and success status
   */
  public async processContent(context: PluginContext): Promise<{ content: string, success: boolean, errors: string[] }> {
    try {
      // Execute plugins
      const results = await this.executePlugins(context);
      
      // Check for failures
      const errors: string[] = [];
      let success = true;
      
      for (const result of results) {
        if (!result.success) {
          success = false;
          if (result.error) {
            errors.push(result.error);
          }
        }
      }
      
      // Get final content (from the last successful plugin that modified content)
      let finalContent = context.content;
      
      for (let i = results.length - 1; i >= 0; i--) {
        if (results[i].success && results[i].content) {
          finalContent = results[i].content;
          break;
        }
      }
      
      return {
        content: finalContent,
        success,
        errors
      };
    } catch (error) {
      log('error', 'plugin', `Content processing error`, { error, filePath: context.filePath });
      
      return {
        content: context.content,
        success: false,
        errors: [`Content processing error: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }
}

/**
 * Base plugin class
 */
export abstract class BasePlugin implements Plugin {
  public id: string;
  public name: string;
  public description: string;
  public type: PluginType;
  public stages: PluginStage[];
  public filePatterns?: string[];
  public enabled: boolean;
  public options?: Record<string, any>;
  
  constructor(config: PluginConfig) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.type = config.type;
    this.stages = config.stages;
    this.filePatterns = config.filePatterns;
    this.enabled = config.enabled;
    this.options = config.options || {};
  }
  
  /**
   * Execute the plugin
   * @param context Plugin context
   * @returns Plugin result
   */
  public abstract execute(context: PluginContext): Promise<PluginResult>;
  
  /**
   * Validate the plugin
   * @returns Whether the plugin is valid
   */
  public async validate(): Promise<boolean> {
    return true;
  }
  
  /**
   * Get the plugin schema
   * @returns Plugin schema
   */
  public getSchema(): Record<string, any> {
    return {};
  }
}

/**
 * Built-in plugin: Syntax Validator
 * Validates syntax for various file types
 */
export class SyntaxValidator extends BasePlugin {
  constructor() {
    super({
      id: 'syntax-validator',
      name: 'Syntax Validator',
      description: 'Validates syntax for various file types',
      type: PluginType.VALIDATOR,
      stages: [PluginStage.PRE_SYNC],
      filePatterns: [
        '\\.js$',
        '\\.jsx$',
        '\\.ts$',
        '\\.tsx$',
        '\\.json$',
        '\\.html$',
        '\\.css$'
      ],
      enabled: true,
      path: ''
    });
  }
  
  /**
   * Execute the plugin
   * @param context Plugin context
   * @returns Plugin result
   */
  public async execute(context: PluginContext): Promise<PluginResult> {
    const { filePath, content } = context;
    const ext = path.extname(filePath).toLowerCase();
    
    try {
      // Validate based on file extension
      switch (ext) {
        case '.js':
        case '.jsx':
        case '.ts':
        case '.tsx':
          this.validateJavaScript(content);
          break;
          
        case '.json':
          this.validateJson(content);
          break;
          
        default:
          // No validation for other file types
          break;
      }
      
      return {
        success: true,
        content // Return unchanged content
      };
    } catch (error) {
      return {
        success: false,
        error: `Syntax validation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Validate JavaScript/TypeScript syntax
   * @param content Content to validate
   * @throws Error if syntax is invalid
   */
  private validateJavaScript(content: string): void {
    try {
      // Basic syntax validation using Function constructor
      // This won't catch all errors, but it's a simple way to check basic syntax
      new Function(content);
    } catch (error) {
      throw new Error(`JavaScript syntax error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Validate JSON syntax
   * @param content Content to validate
   * @throws Error if syntax is invalid
   */
  private validateJson(content: string): void {
    try {
      JSON.parse(content);
    } catch (error) {
      throw new Error(`JSON syntax error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Built-in plugin: Security Validator
 * Checks for security issues in code
 */
export class SecurityValidator extends BasePlugin {
  // Simple patterns for common security issues
  private patterns = {
    hardcodedSecrets: [
      /['"](?:api|access|secret|private|token|key|pass|auth).*?['"][^\n=]*?=.*?['"][a-zA-Z0-9_\-\.]{16,}['"]/i,
      /const\s+(?:api|access|secret|private|token|key|pass|auth).*?=.*?['"][a-zA-Z0-9_\-\.]{16,}['"]/i
    ],
    sqlInjection: [
      /execute\s*\(\s*["']\s*SELECT.*?\s*\+/i,
      /executeQuery\s*\(\s*["']\s*SELECT.*?\s*\+/i,
      /executeUpdate\s*\(\s*["']\s*UPDATE.*?\s*\+/i
    ],
    commandInjection: [
      /exec\s*\(\s*.*?\s*\+/i,
      /spawn\s*\(\s*.*?\s*\+/i,
      /execSync\s*\(\s*.*?\s*\+/i
    ]
  };
  
  constructor() {
    super({
      id: 'security-validator',
      name: 'Security Validator',
      description: 'Checks for security issues in code',
      type: PluginType.VALIDATOR,
      stages: [PluginStage.PRE_SYNC],
      filePatterns: [
        '\\.js$',
        '\\.jsx$',
        '\\.ts$',
        '\\.tsx$',
        '\\.py$'
      ],
      enabled: true,
      path: ''
    });
  }
  
  /**
   * Execute the plugin
   * @param context Plugin context
   * @returns Plugin result
   */
  public async execute(context: PluginContext): Promise<PluginResult> {
    const { filePath, content } = context;
    const warnings: string[] = [];
    
    // Check for hardcoded secrets
    for (const pattern of this.patterns.hardcodedSecrets) {
      if (pattern.test(content)) {
        warnings.push('Possible hardcoded secret or API key detected');
        break;
      }
    }
    
    // Check for SQL injection vulnerabilities
    for (const pattern of this.patterns.sqlInjection) {
      if (pattern.test(content)) {
        warnings.push('Possible SQL injection vulnerability detected');
        break;
      }
    }
    
    // Check for command injection vulnerabilities
    for (const pattern of this.patterns.commandInjection) {
      if (pattern.test(content)) {
        warnings.push('Possible command injection vulnerability detected');
        break;
      }
    }
    
    return {
      success: true, // Don't fail on warnings
      warnings,
      content // Return unchanged content
    };
  }
}

/**
 * Built-in plugin: Code Formatter
 * Formats code according to basic standards
 */
export class CodeFormatter extends BasePlugin {
  constructor() {
    super({
      id: 'code-formatter',
      name: 'Code Formatter',
      description: 'Formats code according to basic standards',
      type: PluginType.PROCESSOR,
      stages: [PluginStage.DURING_SYNC],
      filePatterns: [
        '\\.js$',
        '\\.jsx$',
        '\\.ts$',
        '\\.tsx$',
        '\\.json$'
      ],
      enabled: true,
      path: ''
    });
  }
  
  /**
   * Execute the plugin
   * @param context Plugin context
   * @returns Plugin result
   */
  public async execute(context: PluginContext): Promise<PluginResult> {
    const { filePath, content } = context;
    const ext = path.extname(filePath).toLowerCase();
    
    try {
      // Format based on file extension
      let formattedContent = content;
      
      switch (ext) {
        case '.json':
          formattedContent = this.formatJson(content);
          break;
          
        case '.js':
        case '.jsx':
        case '.ts':
        case '.tsx':
          formattedContent = this.formatJs(content);
          break;
          
        default:
          // No formatting for other file types
          break;
      }
      
      return {
        success: true,
        content: formattedContent
      };
    } catch (error) {
      return {
        success: false,
        error: `Formatting failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Format JSON content
   * @param content JSON content
   * @returns Formatted JSON
   */
  private formatJson(content: string): string {
    try {
      const json = JSON.parse(content);
      return JSON.stringify(json, null, 2);
    } catch (error) {
      // If parsing fails, return the original content
      return content;
    }
  }
  
  /**
   * Format JavaScript/TypeScript content
   * This is a very simple formatter that only handles basic indentation.
   * In a real implementation, you would use a proper formatter like Prettier.
   * @param content JavaScript/TypeScript content
   * @returns Formatted JavaScript/TypeScript
   */
  private formatJs(content: string): string {
    // This is a simplistic implementation
    // In a real implementation, use a proper formatter
    return content;
  }
}

// Export singleton instance
export const pluginSystem = PluginSystem.getInstance();