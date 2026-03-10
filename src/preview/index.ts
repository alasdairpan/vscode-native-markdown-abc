import abcjs from 'abcjs';

/** CSS selector for placeholder blocks emitted by the markdown-it plugin. */
const ABC_BLOCK_SELECTOR = '.markdown-abc[data-abc]';

/**
 * Strips abcjs warning markup and collapses spacing so warnings can be rendered
 * safely as plain text inside the Markdown preview.
 */
function normalizeWarning(warning: string): string {
  return warning
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes parser warnings and guarantees at least one human-readable line.
 */
function getWarningsList(warnings: string[]): string[] {
  const normalizedWarnings = warnings.map(normalizeWarning).filter((warning) => warning.length > 0);

  if (normalizedWarnings.length > 0) {
    return normalizedWarnings;
  }

  return ['ABC parser warnings were reported.'];
}

/**
 * Limits the error panel to a few lines so invalid ABC does not overwhelm the
 * surrounding Markdown content.
 */
function getVisibleWarnings(warnings: string[]): string[] {
  const maxVisibleWarnings = 3;

  if (warnings.length <= maxVisibleWarnings) {
    return warnings;
  }

  const remainingWarnings = warnings.length - maxVisibleWarnings;
  return [
    ...warnings.slice(0, maxVisibleWarnings),
    `... +${remainingWarnings} more`
  ];
}

/**
 * Decodes the base64-encoded ABC payload stored by the markdown-it plugin.
 */
function decodeBase64Utf8(value: string): string {
  const binaryString = atob(value);
  const bytes = Uint8Array.from(binaryString, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Builds the small subset of abcjs render options currently exposed through the
 * extension configuration.
 */
function createRenderOptions(container: HTMLElement): Record<string, unknown> {
  const options: Record<string, unknown> = {
    add_classes: container.dataset.renderClassNames === 'true',
    paddingbottom: 10,
    paddingtop: 10
  };

  if (container.dataset.responsive !== 'none') {
    options.responsive = 'resize';
  }

  return options;
}

/**
 * Updates the placeholder status line.
 *
 * Successful renders hide the fallback entirely. Error states keep the source
 * visible but clear the transient “Rendering...” message.
 */
function setStatus(container: HTMLElement, message: string, isError = false): void {
  const statusElement = container.querySelector<HTMLElement>('.markdown-abc__status');

  if (!statusElement) {
    return;
  }

  statusElement.textContent = message;
  statusElement.classList.toggle('is-error', isError);
  statusElement.classList.toggle('is-hidden', message.length === 0);
}

/**
 * Renders a plain-text warning panel below the raw ABC source.
 */
function setError(container: HTMLElement, messages: string[]): void {
  let errorElement = container.querySelector<HTMLElement>('.markdown-abc__error');

  if (!errorElement) {
    errorElement = document.createElement('div');
    errorElement.className = 'markdown-abc__error';
    container.append(errorElement);
  }

  errorElement.replaceChildren();

  const titleElement = document.createElement('div');
  titleElement.className = 'markdown-abc__error-title';
  titleElement.textContent = 'Unable to render ABC notation';
  errorElement.append(titleElement);

  const listElement = document.createElement('div');
  listElement.className = 'markdown-abc__error-list';

  getVisibleWarnings(messages).forEach((message) => {
    const itemElement = document.createElement('div');
    itemElement.className = 'markdown-abc__error-line';
    itemElement.textContent = message;
    listElement.append(itemElement);
  });

  errorElement.append(listElement);
}

/**
 * Parses and renders a single ABC placeholder block.
 *
 * abcjs is permissive and can render partial notation even when parser warnings
 * are present. This extension intentionally treats warnings as invalid input so
 * malformed ABC falls back to source plus a readable error summary.
 */
function renderBlock(container: HTMLElement): void {
  if (container.dataset.rendered) {
    return;
  }

  const encodedAbc = container.dataset.abc;

  if (!encodedAbc) {
    setStatus(container, '', true);
    setError(container, ['Missing ABC source.']);
    container.dataset.rendered = 'error';
    return;
  }

  try {
    const abcSource = decodeBase64Utf8(encodedAbc);

    // Parse first so warning-only failures can be surfaced before any SVG is
    // inserted into the preview.
    const parsedTunes = abcjs.parseOnly(abcSource, { stop_on_warning: true });
    const warnings = parsedTunes.flatMap((tune) => tune.warnings ?? []);

    if (warnings.length > 0) {
      throw new Error(JSON.stringify(getWarningsList(warnings)));
    }

    const renderOptions = createRenderOptions(container);
    const paperElement = document.createElement('div');
    paperElement.className = 'markdown-abc__paper';
    container.prepend(paperElement);

    const renderedTunes = abcjs.renderAbc(paperElement, abcSource, renderOptions);

    if (!renderedTunes.length || !paperElement.querySelector('svg')) {
      throw new Error('abcjs did not produce any SVG output.');
    }

    container.querySelector<HTMLElement>('.markdown-abc__fallback')?.classList.add('is-hidden');
    container.dataset.rendered = 'true';
  } catch (error) {
    // Clear any partially inserted SVG before showing the fallback error state.
    container.querySelector<HTMLElement>('.markdown-abc__paper')?.remove();
    let messages = ['Unknown ABC rendering error.'];

    if (error instanceof Error) {
      // Warning arrays are serialized into the thrown error so the catch block
      // can keep a single error handling path for both validation and runtime
      // rendering failures.
      try {
        const parsedMessages = JSON.parse(error.message);
        if (Array.isArray(parsedMessages) && parsedMessages.every((message) => typeof message === 'string')) {
          messages = parsedMessages;
        } else {
          messages = [error.message];
        }
      } catch {
        messages = [error.message];
      }
    }

    setStatus(container, '', true);
    setError(container, messages);
    container.dataset.rendered = 'error';
  }
}

/**
 * Scans the preview DOM and renders each ABC placeholder once.
 */
function renderAllAbcBlocks(): void {
  document.querySelectorAll<HTMLElement>(ABC_BLOCK_SELECTOR).forEach((container) => {
    renderBlock(container);
  });
}

// VS Code reloads preview scripts on content changes, so a simple one-time DOM
// ready hook is sufficient here.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderAllAbcBlocks, { once: true });
} else {
  renderAllAbcBlocks();
}