import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGhostClone } from './clone.js';
import { getFlashColors } from './tracker.js';

function createMockStyle(): any {
  const store: Record<string, string> = {};
  const styleObj = {
    setProperty(name: string, value: string) {
      store[name] = value;
      const camel = name.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
      store[camel] = value;
      (styleObj as any)[camel] = value;
    },
  };
  return new Proxy(styleObj, {
    get(target, prop: string) {
      if (prop in target) return (target as any)[prop];
      return store[prop];
    },
    set(_target, prop: string, value: string) {
      store[prop] = value;
      const kebab = prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      store[kebab] = value;
      return true;
    },
  });
}

class MockNode {
  public nodeType: number;
  public textContent: string;
  public parentNode: MockNode | null = null;
  public parentElement: MockElement | null = null;
  public childNodes: MockNode[] = [];

  constructor(nodeType: number, textContent = '') {
    this.nodeType = nodeType;
    this.textContent = textContent;
  }

  public appendChild(child: MockNode) {
    child.parentNode = this;
    if (this instanceof MockElement) {
      child.parentElement = this;
    }
    this.childNodes.push(child);
  }

  public replaceChild(newChild: MockNode, oldChild: MockNode) {
    const index = this.childNodes.indexOf(oldChild);
    if (index !== -1) {
      newChild.parentNode = this;
      if (this instanceof MockElement) {
        newChild.parentElement = this;
      }
      this.childNodes[index] = newChild;
    }
  }

  public contains(target: MockNode): boolean {
    if (target === this) return true;
    for (const child of this.childNodes) {
      if (child.contains(target)) return true;
    }
    return false;
  }
}

class MockElement extends MockNode {
  public tagName: string;
  public style = createMockStyle();
  public attributes: Record<string, string> = {};
  public isConnected = true;

  constructor(tagName: string) {
    super(1, '');
    this.tagName = tagName.toUpperCase();
  }

  public setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }

  public getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  public removeAttribute(name: string) {
    delete this.attributes[name];
  }

  public getBoundingClientRect() {
    return {
      left: 10,
      top: 20,
      width: 100,
      height: 30,
      bottom: 50,
      right: 110,
      x: 10,
      y: 20,
      toJSON: () => {},
    };
  }

  public cloneNode(deep = true): MockElement {
    const clone = new (this.constructor as any)(this.tagName);
    clone.attributes = { ...this.attributes };
    Object.assign(clone.style, this.style);
    if (deep) {
      for (const child of this.childNodes) {
        const childClone = (child as any).cloneNode ? (child as any).cloneNode(true) : child;
        clone.appendChild(childClone);
      }
    }
    return clone;
  }

  public querySelectorAll(selector: string): MockElement[] {
    const results: MockElement[] = [];
    const walk = (node: MockNode) => {
      for (const child of node.childNodes) {
        if (child instanceof MockElement) {
          if (selector === '*' || (selector === '[id]' && child.getAttribute('id'))) {
            results.push(child);
          } else if (selector.toLowerCase() === child.tagName.toLowerCase()) {
            results.push(child);
          }
          walk(child);
        }
      }
    };
    walk(this);
    return results;
  }

  public querySelector(selector: string): MockElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  public closest(selector: string): MockElement | null {
    if (selector.toLowerCase() === this.tagName.toLowerCase()) return this;
    return this.parentElement ? this.parentElement.closest(selector) : null;
  }
}

class MockSVGElement extends MockElement {
  public ownerSVGElement: MockSVGElement | null = null;
}

class MockTextNode extends MockNode {
  constructor(text: string) {
    super(3, text);
  }

  public cloneNode(): MockTextNode {
    return new MockTextNode(this.textContent);
  }
}

describe('createGhostClone', () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalSVGElement = (globalThis as any).SVGElement;
  const originalHTMLElement = (globalThis as any).HTMLElement;

  beforeEach(() => {
    (globalThis as any).HTMLElement = MockElement;
    (globalThis as any).SVGElement = MockSVGElement;
    (globalThis as any).NodeFilter = { SHOW_ALL: 1 };

    const mockDoc: any = {
      createElement: (tag: string) => new MockElement(tag),
      createTreeWalker: (root: MockNode) => {
        const all: MockNode[] = [];
        const collect = (n: MockNode) => {
          all.push(n);
          for (const c of n.childNodes) collect(c);
        };
        collect(root);
        let idx = 0;
        return {
          currentNode: all[0],
          nextNode: () => {
            idx++;
            return all[idx] ?? null;
          },
        };
      },
    };

    const mockWin: any = {
      getComputedStyle: (_el: any) => ({
        fontFamily: 'ui-monospace, monospace',
        fontSize: '14px',
        fontWeight: '500',
        fontStyle: 'normal',
        lineHeight: '20px',
        letterSpacing: '0px',
        textTransform: 'none',
        textAlign: 'left',
        textIndent: '0px',
        whiteSpace: 'nowrap',
        wordBreak: 'normal',
        tabSize: '2',
        boxSizing: 'border-box',
        paddingTop: '4px',
        paddingRight: '8px',
        paddingBottom: '4px',
        paddingLeft: '8px',
        borderRadius: '6px',
        display: 'block',
        stroke: 'none',
        fill: 'none',
        strokeWidth: '0px',
      }),
    };

    globalThis.document = mockDoc;
    globalThis.window = mockWin;
  });

  afterEach(() => {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    (globalThis as any).SVGElement = originalSVGElement;
    (globalThis as any).HTMLElement = originalHTMLElement;
  });

  it('returns null when element has 0 width or height', () => {
    const el = new MockElement('div');
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    expect(createGhostClone(el as unknown as Node, 1)).toBeNull();
  });

  it('gives SVGs text-like ghost treatment with stroke/fill/color flashing', () => {
    const svg = new MockSVGElement('svg');
    svg.setAttribute('stroke', 'currentColor');
    const path = new MockSVGElement('path');
    path.ownerSVGElement = svg;
    svg.appendChild(path);

    const colors = getFlashColors(1);
    const clone = createGhostClone(svg as unknown as Node, 1);
    expect(clone).not.toBeNull();
    expect(clone).toBeInstanceOf(MockSVGElement);

    const svgClone = clone as unknown as MockSVGElement;
    expect(svgClone.style.background).toBe('transparent');
    expect(svgClone.style.outline).toBe('none');
    expect(svgClone.style.color).toBe(colors.color);
    expect(svgClone.style.stroke).toBe(colors.color);
  });

  it('finds SVG root and flashes icon when an inner path updates', () => {
    const svg = new MockSVGElement('svg');
    const path = new MockSVGElement('path');
    path.setAttribute('fill', 'currentColor');
    path.ownerSVGElement = svg;
    svg.appendChild(path);

    const colors = getFlashColors(2);
    const clone = createGhostClone(path as unknown as Node, 2);
    expect(clone).not.toBeNull();
    expect(clone).toBeInstanceOf(MockSVGElement);
    expect((clone as any).tagName.toLowerCase()).toBe('svg');

    const svgClone = clone as unknown as MockSVGElement;
    expect(svgClone.style.color).toBe(colors.color);
    const pathClone = svgClone.querySelector('path');
    expect(pathClone?.style.fill).toBe(colors.color);
  });

  it('colors text inside div clones with the same update color and keeps box outline/tint', () => {
    const div = new MockElement('div');
    const span = new MockElement('span');
    span.textContent = '// entry-server.tsx';
    div.appendChild(span);

    const colors = getFlashColors(1);
    const clone = createGhostClone(div as unknown as Node, 1);
    expect(clone).not.toBeNull();
    expect(clone).toBeInstanceOf(MockElement);

    const htmlClone = clone as unknown as MockElement;
    expect(htmlClone.style.backgroundColor).toBe(colors.background);
    expect(htmlClone.style.outline).toBe(`1.5px solid ${colors.color}`);
    expect(htmlClone.style.color).toBe(colors.color);
    expect(htmlClone.style.fontFamily).toBe('ui-monospace, monospace');

    const spanClone = htmlClone.querySelector('span');
    expect(spanClone).not.toBeNull();
    expect(spanClone?.style.color).toBe(colors.color);
  });

  it('preserves text layout while highlighting only target text for text nodes', () => {
    const p = new MockElement('p');
    p.appendChild(new MockTextNode('Prefix '));
    const target = new MockTextNode('Counter 42');
    p.appendChild(target);
    p.appendChild(new MockTextNode(' Suffix'));

    const colors = getFlashColors(1);
    const clone = createGhostClone(target as unknown as Node, 1);
    expect(clone).not.toBeNull();

    const htmlClone = clone as unknown as MockElement;
    expect(htmlClone.style.background).toBe('transparent');
    expect(htmlClone.style.outline).toBe('none');
    expect(htmlClone.style.fontFamily).toBe('ui-monospace, monospace');

    const spans = htmlClone.querySelectorAll('span');
    const highlighted = spans.find((s) => s.style.color === colors.color);
    expect(highlighted).toBeDefined();
    expect(highlighted?.textContent).toBe('Counter 42');
    expect(highlighted?.style.color).toBe(colors.color);
  });
});
