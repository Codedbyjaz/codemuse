/**
 * Custom Lint Plugin
 * 
 * Provides linting functionality for JavaScript/TypeScript files
 * with customizable rule sets.
 */
import { BasePlugin, PluginType, PluginStage, PluginContext, PluginResult } from '../pluginSystem';
import * as path from 'path';
import { log } from '../../utils/logger';

/**
 * Rule severity levels
 */
export enum RuleSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Lint rule interface
 */
export interface LintRule {
  id: string;
  description: string;
  severity: RuleSeverity;
  pattern: RegExp;
  message: string;
  enabled: boolean;
}

/**
 * Lint result item
 */
export interface LintResult {
  ruleId: string;
  message: string;
  severity: RuleSeverity;
  line?: number;
  column?: number;
}

/**
 * Custom Lint Plugin
 */
export default class LintPlugin extends BasePlugin {
  private rules: LintRule[] = [];
  
  constructor(config: any) {
    super({
      id: config.id || 'custom-lint-plugin',
      name: config.name || 'Custom Lint Plugin',
      description: config.description || 'Lints code for quality issues',
      type: PluginType.VALIDATOR,
      stages: config.stages || [PluginStage.PRE_SYNC],
      filePatterns: config.filePatterns || ['\\.js$', '\\.jsx$', '\\.ts$', '\\.tsx$'],
      enabled: config.enabled !== undefined ? config.enabled : true,
      path: config.path || ''
    });
    
    // Initialize default rules
    this.initializeDefaultRules();
    
    // Apply custom rules from config
    if (config.options && config.options.rules) {
      this.applyCustomRules(config.options.rules);
    }
  }
  
  /**
   * Initialize default lint rules
   */
  private initializeDefaultRules(): void {
    this.rules = [
      {
        id: 'no-unused-vars',
        description: 'Detects variable declarations that are not used',
        severity: RuleSeverity.WARNING,
        pattern: /const\s+([a-zA-Z0-9_]+)\s*=.*?(?!.*\1)/g,
        message: 'Unused variable declaration',
        enabled: true
      },
      {
        id: 'no-console',
        description: 'Disallows console.log statements',
        severity: RuleSeverity.WARNING,
        pattern: /console\.log\(/g,
        message: 'Unexpected console.log statement',
        enabled: true
      },
      {
        id: 'no-alert',
        description: 'Disallows alert, confirm, and prompt',
        severity: RuleSeverity.WARNING,
        pattern: /(alert|confirm|prompt)\(/g,
        message: 'Unexpected browser dialog',
        enabled: true
      },
      {
        id: 'max-line-length',
        description: 'Enforces a maximum line length',
        severity: RuleSeverity.INFO,
        pattern: /^.{120,}$/gm,
        message: 'Line exceeds maximum length of 120 characters',
        enabled: true
      },
      {
        id: 'no-debugger',
        description: 'Disallows debugger statements',
        severity: RuleSeverity.ERROR,
        pattern: /debugger;/g,
        message: 'Unexpected debugger statement',
        enabled: true
      }
    ];
  }
  
  /**
   * Apply custom rules from config
   * @param customRules Custom rules to apply
   */
  private applyCustomRules(customRules: any[]): void {
    for (const rule of customRules) {
      // If rule ID already exists, update it
      const existingRuleIndex = this.rules.findIndex(r => r.id === rule.id);
      
      if (existingRuleIndex !== -1) {
        // Update existing rule
        this.rules[existingRuleIndex] = {
          ...this.rules[existingRuleIndex],
          ...rule,
          // Convert string pattern to RegExp if needed
          pattern: typeof rule.pattern === 'string' 
            ? new RegExp(rule.pattern, rule.flags || 'g')
            : rule.pattern || this.rules[existingRuleIndex].pattern
        };
      } else if (rule.id && rule.pattern) {
        // Add new rule
        this.rules.push({
          id: rule.id,
          description: rule.description || `Custom rule: ${rule.id}`,
          severity: rule.severity || RuleSeverity.WARNING,
          pattern: typeof rule.pattern === 'string'
            ? new RegExp(rule.pattern, rule.flags || 'g')
            : rule.pattern,
          message: rule.message || `Violation of custom rule: ${rule.id}`,
          enabled: rule.enabled !== undefined ? rule.enabled : true
        });
      }
    }
  }
  
  /**
   * Lint content with rules
   * @param content Content to lint
   * @returns Lint results
   */
  private lintContent(content: string): LintResult[] {
    const results: LintResult[] = [];
    
    // Apply each enabled rule
    for (const rule of this.rules.filter(r => r.enabled)) {
      // Reset regex lastIndex to avoid issues with global flag
      rule.pattern.lastIndex = 0;
      
      // Find all matches
      let match;
      while ((match = rule.pattern.exec(content)) !== null) {
        // Calculate line and column numbers
        const lineInfo = this.calculateLineAndColumn(content, match.index);
        
        results.push({
          ruleId: rule.id,
          message: rule.message,
          severity: rule.severity,
          line: lineInfo.line,
          column: lineInfo.column
        });
      }
    }
    
    return results;
  }
  
  /**
   * Calculate line and column numbers from content index
   * @param content Full content
   * @param index Character index
   * @returns Line and column numbers
   */
  private calculateLineAndColumn(content: string, index: number): { line: number, column: number } {
    const lines = content.substring(0, index).split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    };
  }
  
  /**
   * Execute the plugin
   * @param context Plugin context
   * @returns Plugin result
   */
  public async execute(context: PluginContext): Promise<PluginResult> {
    const { filePath, content } = context;
    
    try {
      // Lint the content
      const lintResults = this.lintContent(content);
      
      // If no issues, return success
      if (lintResults.length === 0) {
        return {
          success: true,
          content // Return unchanged content
        };
      }
      
      // Convert lint results to warnings
      const warnings = lintResults.map(result => 
        `${result.ruleId} (${result.severity}): ${result.message} at line ${result.line}, column ${result.column}`
      );
      
      // Check if there are any errors (should block the sync)
      const hasErrors = lintResults.some(result => result.severity === RuleSeverity.ERROR);
      
      return {
        success: !hasErrors,
        warnings,
        content, // Return unchanged content
        error: hasErrors ? 'Lint errors found' : undefined
      };
    } catch (error) {
      log('error', 'plugin', `Lint plugin error for ${filePath}`, { error });
      
      return {
        success: false,
        error: `Lint plugin error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Get the plugin schema
   * @returns Plugin schema
   */
  public getSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        rules: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              description: { type: 'string' },
              severity: { 
                type: 'string',
                enum: ['error', 'warning', 'info']
              },
              pattern: { type: 'string' },
              flags: { type: 'string' },
              message: { type: 'string' },
              enabled: { type: 'boolean' }
            },
            required: ['id', 'pattern']
          }
        },
        filePatterns: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    };
  }
}