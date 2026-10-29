import { getFlashColors, FADE_OUT_DURATION_MS } from './tracker.js';

function getNodePath(root: Node, target: Node): number[] {
  const path: number[] = [];
  let current: Node | null = target;
  while (current && current !== root) {
    const parent: Node | null = current.parentNode;
    if (!parent) break;
    const index = Array.prototype.indexOf.call(parent.childNodes, current);
    path.unshift(index);
    current = parent;
  }
  return path;
}

function getNodeByPath(root: Node, path: number[]): Node | null {
  let current: Node = root;
  for (const index of path) {
    if (!current.childNodes || !current.childNodes[index]) return null;
    current = current.childNodes[index];
  }
  return current;
}

function findSvgRoot(element: Element): SVGElement | null {
  if (typeof SVGElement !== 'undefined' && element instanceof SVGElement) {
    if (element.tagName.toLowerCase() === 'svg') {
      return element;
    }
    return element.ownerSVGElement ?? (element.closest ? element.closest('svg') : null);
  }
  if (element.tagName.toLowerCase() === 'svg') {
    return element as unknown as SVGElement;
  }
  return element.closest ? (element.closest('svg') as SVGElement | null) : null;
}

function applySvgColors(cloneSvg: SVGElement, sourceSvg: SVGElement, color: string): void {
  const win =
    sourceSvg.ownerDocument?.defaultView ?? (typeof window !== 'undefined' ? window : null);

  const cloneElements: SVGElement[] = [
    cloneSvg,
    ...Array.from(cloneSvg.querySelectorAll<SVGElement>('*')),
  ];
  const sourceElements: SVGElement[] = [
    sourceSvg,
    ...Array.from(sourceSvg.querySelectorAll<SVGElement>('*')),
  ];

  for (let i = 0; i < cloneElements.length; i++) {
    const cloneEl = cloneElements[i];
    const sourceEl = sourceElements[i];
    if (!cloneEl || !sourceEl) continue;

    cloneEl.style.color = color;

    if (win) {
      const computed = win.getComputedStyle(sourceEl);
      const stroke = computed.stroke;
      const fill = computed.fill;
      const strokeWidth = computed.strokeWidth;

      const attrStroke = sourceEl.getAttribute('stroke');
      const attrFill = sourceEl.getAttribute('fill');

      const hasVisibleStroke =
        (stroke && stroke !== 'none' && stroke !== 'transparent' && strokeWidth !== '0px') ||
        (attrStroke && attrStroke !== 'none');

      if (hasVisibleStroke) {
        cloneEl.style.setProperty('stroke', color, 'important');
      }

      const hasVisibleFill =
        (fill && fill !== 'none' && fill !== 'transparent') || (attrFill && attrFill !== 'none');

      if (hasVisibleFill) {
        cloneEl.style.setProperty('fill', color, 'important');
      }
    } else {
      cloneEl.style.setProperty('stroke', color, 'important');
      cloneEl.style.setProperty('fill', color, 'important');
    }
  }
}

/**
 * Strips what would make the clone act like the original once it is in the
 * document: duplicate ids, radio groups that would take the checked state from
 * the original, and frames and media that would load or play a second time.
 */
function detachClone(clone: Element): void {
  for (const element of [clone, ...Array.from(clone.querySelectorAll('*'))]) {
    element.removeAttribute('id');
    element.removeAttribute('name');
    const tag = element.tagName.toLowerCase();
    if (tag === 'iframe') {
      element.removeAttribute('srcdoc');
      element.setAttribute('src', 'about:blank');
    } else if (tag === 'video' || tag === 'audio') {
      element.removeAttribute('autoplay');
    }
  }
}

/**
 * Creates an exact deep clone of the element that contains the updating node,
 * preserving all typography, line-height, text-transform, and layout metrics.
 *
 * - Text updates: Non-target elements/text are hidden with visibility: hidden
 *   so wrapping and layout match 100%, while only the updating text flashes.
 * - SVG updates: Cloned with transparent background, flashing stroke/fill in update color.
 * - Div / container updates: Flashes background tint and outline, while inner text
 *   and icons align pixel-perfectly and flash in the exact same update color.
 */
export function createGhostClone(node: Node, count: number): HTMLElement | SVGElement | null {
  if (typeof document === 'undefined') return null;

  const isText = node.nodeType === 3; /* Node.TEXT_NODE */
  const hostElement = isText ? node.parentElement : (node as Element);
  if (!hostElement || !(hostElement instanceof HTMLElement || hostElement instanceof SVGElement)) {
    return null;
  }

  const svgRoot = findSvgRoot(hostElement);
  const colors = getFlashColors(count);

  if (svgRoot) {
    const rect = svgRoot.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;

    const clone = svgRoot.cloneNode(true) as SVGElement;

    detachClone(clone);

    clone.setAttribute('data-solid-flash-clone', '');
    clone.style.position = 'fixed';
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.margin = '0';
    clone.style.pointerEvents = 'none';
    clone.style.userSelect = 'none';
    clone.style.zIndex = '999998';
    clone.style.transform = 'none';
    clone.style.animation = `solid-flash-fade ${FADE_OUT_DURATION_MS}ms cubic-bezier(0, 0, 0.2, 1) forwards`;

    clone.style.background = 'transparent';
    clone.style.backgroundColor = 'transparent';
    clone.style.outline = 'none';
    clone.style.border = 'none';
    clone.style.boxShadow = 'none';

    applySvgColors(clone, svgRoot, colors.color);

    return clone;
  }

  const rect = hostElement.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;

  const clone = hostElement.cloneNode(true) as HTMLElement;

  detachClone(clone);

  clone.setAttribute('data-solid-flash-clone', '');
  clone.style.position = 'fixed';
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.margin = '0';
  clone.style.pointerEvents = 'none';
  clone.style.userSelect = 'none';
  clone.style.zIndex = '999998';
  clone.style.animation = `solid-flash-fade ${FADE_OUT_DURATION_MS}ms cubic-bezier(0, 0, 0.2, 1) forwards`;

  const win =
    hostElement.ownerDocument?.defaultView ?? (typeof window !== 'undefined' ? window : null);

  if (win) {
    const computed = win.getComputedStyle(hostElement);

    clone.style.setProperty('font-family', computed.fontFamily, 'important');
    clone.style.setProperty('font-size', computed.fontSize, 'important');
    clone.style.setProperty('font-weight', computed.fontWeight, 'important');
    clone.style.setProperty('font-style', computed.fontStyle, 'important');
    clone.style.setProperty('line-height', computed.lineHeight, 'important');
    clone.style.setProperty('letter-spacing', computed.letterSpacing, 'important');
    clone.style.setProperty('text-transform', computed.textTransform, 'important');
    clone.style.setProperty('text-align', computed.textAlign, 'important');
    clone.style.setProperty('text-indent', computed.textIndent, 'important');
    clone.style.setProperty('white-space', computed.whiteSpace, 'important');
    clone.style.setProperty('word-break', computed.wordBreak, 'important');
    clone.style.setProperty('tab-size', computed.tabSize, 'important');

    clone.style.setProperty('box-sizing', 'border-box', 'important');
    clone.style.setProperty('padding-top', computed.paddingTop, 'important');
    clone.style.setProperty('padding-right', computed.paddingRight, 'important');
    clone.style.setProperty('padding-bottom', computed.paddingBottom, 'important');
    clone.style.setProperty('padding-left', computed.paddingLeft, 'important');
    clone.style.setProperty('border-radius', computed.borderRadius, 'important');
    clone.style.setProperty('transform', 'none', 'important');

    if (computed.display === 'flex' || computed.display === 'inline-flex') {
      clone.style.display = computed.display;
      clone.style.flexDirection = computed.flexDirection;
      clone.style.alignItems = computed.alignItems;
      clone.style.justifyContent = computed.justifyContent;
      clone.style.gap = computed.gap;
    } else if (computed.display === 'grid' || computed.display === 'inline-grid') {
      clone.style.display = computed.display;
      clone.style.gridTemplateColumns = computed.gridTemplateColumns;
      clone.style.gridTemplateRows = computed.gridTemplateRows;
      clone.style.gap = computed.gap;
    }
  }

  if (isText) {
    clone.style.background = 'transparent';
    clone.style.backgroundColor = 'transparent';
    clone.style.backgroundImage = 'none';
    clone.style.borderColor = 'transparent';
    clone.style.boxShadow = 'none';
    clone.style.outline = 'none';

    const path = getNodePath(hostElement, node);
    const targetInClone = getNodeByPath(clone, path);

    if (targetInClone) {
      const walker = document.createTreeWalker(clone, NodeFilter.SHOW_ALL);
      const toHide: (HTMLElement | SVGElement)[] = [];
      const toWrap: Node[] = [];

      let current: Node | null = walker.currentNode;
      while (current) {
        if (current === targetInClone) {
          // Keep target visible
        } else if (
          current !== clone &&
          !current.contains(targetInClone) &&
          !targetInClone.contains(current)
        ) {
          if (current instanceof HTMLElement || current instanceof SVGElement) {
            toHide.push(current);
          } else if (current.nodeType === 3) {
            toWrap.push(current);
          }
        }
        current = walker.nextNode();
      }

      for (const el of toHide) {
        el.style.visibility = 'hidden';
      }

      for (const textNode of toWrap) {
        const hiddenSpan = document.createElement('span');
        hiddenSpan.textContent = textNode.textContent;
        hiddenSpan.style.visibility = 'hidden';
        textNode.parentNode?.replaceChild(hiddenSpan, textNode);
      }

      const highlightSpan = document.createElement('span');
      highlightSpan.textContent = targetInClone.textContent;
      highlightSpan.style.setProperty('color', colors.color, 'important');
      highlightSpan.style.visibility = 'visible';
      targetInClone.parentNode?.replaceChild(highlightSpan, targetInClone);
    } else {
      clone.style.setProperty('color', colors.color, 'important');
    }
  } else {
    clone.style.backgroundColor = colors.background;
    clone.style.borderColor = colors.color;
    clone.style.outline = `1.5px solid ${colors.color}`;
    clone.style.setProperty('color', colors.color, 'important');

    const cloneChildren = clone.querySelectorAll('*');
    const sourceChildren = hostElement.querySelectorAll('*');

    for (let i = 0; i < cloneChildren.length; i++) {
      const childClone = cloneChildren[i];
      const childSource = sourceChildren[i];

      if (childClone instanceof HTMLElement) {
        childClone.style.setProperty('color', colors.color, 'important');

        if (win && childSource instanceof HTMLElement) {
          const childComputed = win.getComputedStyle(childSource);
          childClone.style.setProperty('font-family', childComputed.fontFamily, 'important');
          childClone.style.setProperty('font-size', childComputed.fontSize, 'important');
          childClone.style.setProperty('font-weight', childComputed.fontWeight, 'important');
          childClone.style.setProperty('line-height', childComputed.lineHeight, 'important');
          childClone.style.setProperty('letter-spacing', childComputed.letterSpacing, 'important');
          childClone.style.setProperty('text-transform', childComputed.textTransform, 'important');
          childClone.style.setProperty('white-space', childComputed.whiteSpace, 'important');
        }
      } else if (childClone instanceof SVGElement && childSource instanceof SVGElement) {
        applySvgColors(childClone, childSource, colors.color);
      }
    }
  }

  return clone;
}
