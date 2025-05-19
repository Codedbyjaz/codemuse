/**
 * Accessibility Validator Plugin
 * 
 * Checks HTML and JSX files for common accessibility issues
 */
import { BasePlugin, PluginType, PluginStage, PluginContext, PluginResult } from '../pluginSystem';
import * as path from 'path';
import { log } from '../../utils/logger';

/**
 * Accessibility check interface
 */
export interface AccessibilityCheck {
  id: string;
  description: string;
  pattern: RegExp;
  message: string;
  enabled: boolean;
}

/**
 * Check result
 */
export interface CheckResult {
  checkId: string;
  message: string;
  line?: number;
  column?: number;
}

/**
 * Accessibility Validator Plugin
 */
export default class AccessibilityPlugin extends BasePlugin {
  private checks: AccessibilityCheck[] = [];
  
  constructor(config: any) {
    super({
      id: config.id || 'accessibility-validator',
      name: config.name || 'Accessibility Validator',
      description: config.description || 'Checks for common accessibility issues',
      type: PluginType.VALIDATOR,
      stages: config.stages || [PluginStage.PRE_SYNC],
      filePatterns: config.filePatterns || ['\\.html$', '\\.jsx$', '\\.tsx$'],
      enabled: config.enabled !== undefined ? config.enabled : true,
      path: config.path || ''
    });
    
    // Initialize default checks
    this.initializeDefaultChecks();
    
    // Apply custom checks from config
    if (config.options && config.options.checks) {
      this.applyCustomChecks(config.options.checks);
    }
  }
  
  /**
   * Initialize default accessibility checks
   */
  private initializeDefaultChecks(): void {
    this.checks = [
      {
        id: 'img-alt',
        description: 'Images must have alt attributes',
        pattern: /<img[^>]*(?!alt=)[^>]*>/gi,
        message: 'Image missing alt attribute',
        enabled: true
      },
      {
        id: 'button-role',
        description: 'Elements with role="button" must be keyboard focusable',
        pattern: /<[^>]*role=["']button["'][^>]*(?!tabindex)[^>]*>/gi,
        message: 'Interactive element with role="button" should have tabindex',
        enabled: true
      },
      {
        id: 'a-target-rel',
        description: 'Links opening in a new window should have rel="noopener"',
        pattern: /<a[^>]*target=["']_blank["'][^>]*(?!rel=["'][^"']*noopener)[^>]*>/gi,
        message: 'Link with target="_blank" should have rel="noopener"',
        enabled: true
      },
      {
        id: 'heading-order',
        description: 'Headings should be in order (h1, then h2, etc.)',
        pattern: /<h([1-6])>[^<]*<\/h\1>/g,
        message: 'Check heading order',
        enabled: true
      },
      {
        id: 'form-label',
        description: 'Form inputs should have associated labels',
        pattern: /<input[^>]*(?!id|aria-labelledby|aria-label)[^>]*>/gi,
        message: 'Form input missing label association',
        enabled: true
      },
      {
        id: 'color-contrast',
        description: 'Warns about color definitions that might have contrast issues',
        pattern: /color:.*?(#[0-9a-f]{3,6}|rgba?\(.*?\))/gi,
        message: 'Potential color contrast issue, please verify',
        enabled: true
      }
    ];
  }
  
  /**
   * Apply custom checks from config
   * @param customChecks Custom checks to apply
   */
  private applyCustomChecks(customChecks: any[]): void {
    for (const check of customChecks) {
      // If check ID already exists, update it
      const existingCheckIndex = this.checks.findIndex(c => c.id === check.id);
      
      if (existingCheckIndex !== -1) {
        // Update existing check
        this.checks[existingCheckIndex] = {
          ...this.checks[existingCheckIndex],
          ...check,
          // Convert string pattern to RegExp if needed
          pattern: typeof check.pattern === 'string' 
            ? new RegExp(check.pattern, check.flags || 'gi')
            : check.pattern || this.checks[existingCheckIndex].pattern
        };
      } else if (check.id && check.pattern) {
        // Add new check
        this.checks.push({
          id: check.id,
          description: check.description || `Custom check: ${check.id}`,
          pattern: typeof check.pattern === 'string'
            ? new RegExp(check.pattern, check.flags || 'gi')
            : check.pattern,
          message: check.message || `Violation of custom check: ${check.id}`,
          enabled: check.enabled !== undefined ? check.enabled : true
        });
      }
    }
  }
  
  /**
   * Run accessibility checks on content
   * @param content Content to check
   * @returns Check results
   */
  private runChecks(content: string): CheckResult[] {
    const results: CheckResult[] = [];
    
    // Apply each enabled check
    for (const check of this.checks.filter(c => c.enabled)) {
      // Reset regex lastIndex to avoid issues with global flag
      check.pattern.lastIndex = 0;
      
      // Find all matches
      let match;
      while ((match = check.pattern.exec(content)) !== null) {
        // Calculate line and column numbers
        const lineInfo = this.calculateLineAndColumn(content, match.index);
        
        results.push({
          checkId: check.id,
          message: check.message,
          line: lineInfo.line,
          column: lineInfo.column
        });
      }
    }
    
    return results;
  }
  
  /**
   * Perform special checks that require more complex logic
   * @param content Content to check
   * @returns Additional check results
   */
  private runSpecialChecks(content: string): CheckResult[] {
    const results: CheckResult[] = [];
    
    // Check for heading order
    if (this.checks.some(c => c.id === 'heading-order' && c.enabled)) {
      const headingMatches = Array.from(content.matchAll(/<h([1-6])>[^<]*<\/h\1>/g));
      let lastHeadingLevel = 0;
      
      for (const match of headingMatches) {
        const level = parseInt(match[1]);
        
        // If heading level jumps by more than one, flag it
        if (level > lastHeadingLevel + 1 && lastHeadingLevel !== 0) {
          const lineInfo = this.calculateLineAndColumn(content, match.index || 0);
          
          results.push({
            checkId: 'heading-order',
            message: `Heading level jumps from h${lastHeadingLevel} to h${level}`,
            line: lineInfo.line,
            column: lineInfo.column
          });
        }
        
        lastHeadingLevel = level;
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
    const ext = path.extname(filePath).toLowerCase();
    
    // Only check certain file types
    if (!['.html', '.jsx', '.tsx'].includes(ext)) {
      return {
        success: true,
        content // Return unchanged content
      };
    }
    
    try {
      // Run accessibility checks
      const checkResults = [
        ...this.runChecks(content),
        ...this.runSpecialChecks(content)
      ];
      
      // If no issues, return success
      if (checkResults.length === 0) {
        return {
          success: true,
          content // Return unchanged content
        };
      }
      
      // Convert check results to warnings
      const warnings = checkResults.map(result => 
        `${result.checkId}: ${result.message} at line ${result.line}, column ${result.column}`
      );
      
      // We only warn about accessibility issues, don't block the sync
      return {
        success: true,
        warnings,
        content, // Return unchanged content
        metadata: {
          accessibilityIssues: checkResults.length
        }
      };
    } catch (error) {
      log('error', 'plugin', `Accessibility plugin error for ${filePath}`, { error });
      
      return {
        success: false,
        error: `Accessibility plugin error: ${error instanceof Error ? error.message : String(error)}`
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
        checks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              description: { type: 'string' },
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