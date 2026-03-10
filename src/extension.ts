import * as vscode from 'vscode';
import MarkdownIt from 'markdown-it';
import { createAbcPlugin, type AbcPluginConfiguration } from './markdown/abcPlugin';

/**
 * Reads workspace-scoped extension settings and converts them into the shape
 * consumed by the markdown-it plugin and preview renderer.
 */
function getConfiguration(): AbcPluginConfiguration {
  const configuration = vscode.workspace.getConfiguration('markdownAbc');

  return {
    enabled: configuration.get<boolean>('enabled', true),
    renderClassNames: configuration.get<boolean>('renderClassNames', false),
    responsive: configuration.get<'resize' | 'none'>('responsive', 'resize')
  };
}

/**
 * Activates lazily when VS Code creates a Markdown preview for the first time.
 *
 * Returning `extendMarkdownIt` is the standard Markdown extension entrypoint.
 * VS Code passes the current markdown-it instance to this hook so the extension
 * can augment fence rendering without replacing the native preview pipeline.
 */
export function activate() {
  return {
    /**
     * Registers the ABC fence renderer on the existing markdown-it instance.
     */
    extendMarkdownIt(markdownIt: MarkdownIt) {
      return markdownIt.use(createAbcPlugin(getConfiguration()));
    }
  };
}