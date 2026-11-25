// jsdom lacks these browser APIs, which stacks-ui components rely on.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub;

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false
    }) as MediaQueryList;
}

// CodeMirror measures text through Range rects, which jsdom doesn't have.
// Without these, a measure scheduled for the next frame can throw after a
// test that mounts an editor has finished.
if (typeof Range !== "undefined") {
  const emptyRect = () =>
    ({
      x: 0,
      y: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
      toJSON: () => ({})
    }) as DOMRect;
  Range.prototype.getBoundingClientRect ??= emptyRect;
  Range.prototype.getClientRects ??= () =>
    Object.assign([], { item: () => null }) as unknown as DOMRectList;
}
