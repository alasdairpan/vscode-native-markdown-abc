import MarkdownIt from 'markdown-it';

/**
 * Configuration shared between the extension host and the preview-side runtime.
 * Values here are serialized into `data-*` attributes on placeholder markup.
 */
export interface AbcPluginConfiguration {
  enabled: boolean;
  responsive: 'resize' | 'none';
  renderClassNames: boolean;
}

/**
 * Escapes values destined for HTML attributes.
 *
 * The raw ABC payload is stored as base64 in `data-abc`, so this helper only
 * needs to protect the attribute container itself from breaking markup.
 */
function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Creates a markdown-it plugin that intercepts fenced `abc` blocks and replaces
 * them with preview placeholders.
 *
 * The actual SVG rendering is deferred to the browser-side preview script so we
 * can keep abcjs out of the extension host and use the native Markdown preview.
 */
export function createAbcPlugin(configuration: AbcPluginConfiguration) {
  return (markdownIt: MarkdownIt) => {
    /**
     * Preserve the existing fence rule so non-ABC blocks continue to render
     * exactly as the built-in Markdown preview expects.
     */
    const fallbackFence = markdownIt.renderer.rules.fence ?? ((tokens: any[], index: number, options: any, _environment: any, self: any) => {
      return self.renderToken(tokens, index, options);
    });

    markdownIt.renderer.rules.fence = (tokens: any[], index: number, options: any, environment: any, self: any) => {
      const token = tokens[index];
      const fenceName = token.info.trim().split(/\s+/, 1)[0];

      if (!configuration.enabled || fenceName !== 'abc') {
        return fallbackFence(tokens, index, options, environment, self);
      }

      // Keep the source payload intact for the preview script while still
      // showing the raw ABC as a readable fallback if rendering fails.
      const encodedAbc = Buffer.from(token.content, 'utf8').toString('base64');
      const escapedSource = markdownIt.utils.escapeHtml(token.content);

      return [
        '<div',
        ' class="markdown-abc"',
        ` data-abc="${escapeAttribute(encodedAbc)}"`,
        ` data-responsive="${configuration.responsive}"`,
        ` data-render-class-names="${configuration.renderClassNames}"`,
        '>',
        '<div class="markdown-abc__fallback">',
        '<div class="markdown-abc__status">Rendering ABC notation...</div>',
        `<pre class="markdown-abc__source"><code>${escapedSource}</code></pre>`,
        '</div>',
        '</div>'
      ].join('');
    };

    return markdownIt;
  };
}