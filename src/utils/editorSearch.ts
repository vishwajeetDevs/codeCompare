import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface FindControllerContribution {
  getState: () => { isRevealed: boolean };
  closeFindWidget: () => void;
}

function getFindController(
  codeEditor: editor.IStandaloneCodeEditor,
): FindControllerContribution | null {
  return codeEditor.getContribution(
    'editor.contrib.findController',
  ) as FindControllerContribution | null;
}

/** Whether the Monaco find/replace bar is currently open for an editor. */
export function isFindWidgetVisible(
  codeEditor: editor.IStandaloneCodeEditor,
): boolean {
  return getFindController(codeEditor)?.getState()?.isRevealed ?? false;
}

/** Close the Monaco find/replace bar for an editor instance. */
export function closeFindWidget(codeEditor: editor.IStandaloneCodeEditor): void {
  const controller = getFindController(codeEditor);
  if (!controller?.getState()?.isRevealed) return;
  controller.closeFindWidget();
}

export interface EditorSearchOptions {
  getSiblingEditor?: () => editor.IStandaloneCodeEditor | null;
}

function suppressManagedHover(element: HTMLElement): () => void {
  const hideHover = () => {
    document.querySelectorAll('.monaco-hover').forEach((hover) => {
      hover.classList.add('hidden');
    });
  };

  element.addEventListener('mouseenter', hideHover, true);
  element.addEventListener('mousemove', hideHover, true);

  return () => {
    element.removeEventListener('mouseenter', hideHover, true);
    element.removeEventListener('mousemove', hideHover, true);
  };
}

function disableCloseButtonTooltip(findWidget: HTMLElement): () => void {
  const closeButton = findWidget.querySelector('.button.codicon-widget-close');
  if (!(closeButton instanceof HTMLElement)) return () => undefined;
  if (closeButton.dataset.codecompareNoTooltip === 'true') return () => undefined;

  closeButton.dataset.codecompareNoTooltip = 'true';
  closeButton.removeAttribute('title');
  return suppressManagedHover(closeButton);
}

function bindFindWidgetEvents(container: HTMLElement): () => void {
  const cleanups: Array<() => void> = [];

  const bindWidget = (findWidget: Element) => {
    if (!(findWidget instanceof HTMLElement)) return;
    if (findWidget.dataset.codecompareBound === 'true') return;

    findWidget.dataset.codecompareBound = 'true';

    const stopBubble = (event: Event) => {
      event.stopPropagation();
    };

    findWidget.addEventListener('mousedown', stopBubble, true);
    findWidget.addEventListener('pointerdown', stopBubble, true);
    cleanups.push(disableCloseButtonTooltip(findWidget));

    cleanups.push(() => {
      findWidget.removeEventListener('mousedown', stopBubble, true);
      findWidget.removeEventListener('pointerdown', stopBubble, true);
      delete findWidget.dataset.codecompareBound;
    });
  };

  container.querySelectorAll('.find-widget').forEach(bindWidget);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.classList.contains('find-widget')) {
          bindWidget(node);
          return;
        }
        node.querySelectorAll('.find-widget').forEach(bindWidget);
      });
    }
  });

  observer.observe(container, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    cleanups.forEach((cleanup) => cleanup());
  };
}

/** Wire VS Code-style find (Ctrl+F) scoped to a single editor pane. */
export function setupEditorSearch(
  codeEditor: editor.IStandaloneCodeEditor,
  monaco: Monaco,
  options: EditorSearchOptions = {},
): { dispose: () => void } {
  const editorId = codeEditor.getId();
  const whenFocused = `editorFocus && editorId == '${editorId}'`;

  const openFind = () => {
    const sibling = options.getSiblingEditor?.();
    if (sibling) closeFindWidget(sibling);

    codeEditor.focus();
    void codeEditor.trigger('codecompare', 'actions.find', null);
  };

  const openReplace = () => {
    const sibling = options.getSiblingEditor?.();
    if (sibling) closeFindWidget(sibling);

    codeEditor.focus();
    void codeEditor.trigger('codecompare', 'actions.findWithReplace', null);
  };

  const closeFind = () => {
    closeFindWidget(codeEditor);
  };

  codeEditor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF,
    openFind,
    whenFocused,
  );

  codeEditor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH,
    openReplace,
    whenFocused,
  );

  codeEditor.addCommand(
    monaco.KeyMod.Alt | monaco.KeyCode.KeyZ,
    closeFind,
    whenFocused,
  );

  const domNode = codeEditor.getContainerDomNode();
  const unbindFindWidgetEvents = bindFindWidgetEvents(domNode);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'z') {
      if (!domNode.contains(event.target as Node) && !codeEditor.hasTextFocus()) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      closeFind();
      return;
    }

    if (!(event.ctrlKey || event.metaKey)) return;

    const key = event.key.toLowerCase();
    if (key !== 'f' && key !== 'h') return;

    if (!domNode.contains(event.target as Node) && !codeEditor.hasTextFocus()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (key === 'f') openFind();
    else openReplace();
  };

  domNode.addEventListener('keydown', onKeyDown, true);

  return {
    dispose: () => {
      domNode.removeEventListener('keydown', onKeyDown, true);
      unbindFindWidgetEvents();
    },
  };
}
