import { useCallback, useEffect, useRef, useState } from 'react';
import { Tldraw, toRichText, type Editor } from 'tldraw';
import 'tldraw/tldraw.css';

type Screen = {
  id: string;
  title?: string | null;
  order: number;
  screenshotUrl?: string | null;
  htmlUrl?: string | null;
  prompt?: string | null;
};

type FlowGraph = {
  nodes: number[];
  edges: { from: number; to: number; label: string }[];
};

type Props = {
  screens: Screen[];
  deviceType?: string;
  flowGraph?: FlowGraph | null;
};

const DEVICE_SIZES: Record<string, { w: number; h: number }> = {
  MOBILE:  { w: 220, h: 440 },
  TABLET:  { w: 360, h: 480 },
  DESKTOP: { w: 440, h: 300 },
};

type ScreenMeta = { elements: string[]; flow: string | null };

function parseScreenMeta(htmlUrl: string | null | undefined): ScreenMeta {
  if (!htmlUrl) return { elements: [], flow: null };
  try {
    const parsed = JSON.parse(htmlUrl);
    return {
      elements: Array.isArray(parsed.elements) ? parsed.elements : [],
      flow: parsed.flow || null,
    };
  } catch {
    return { elements: [], flow: null };
  }
}

function computeGraphLayout(screenCount: number, flowGraph: FlowGraph | null) {
  const forwardEdges = (flowGraph?.edges || []).filter(e =>
    e.from >= 0 && e.from < screenCount &&
    e.to >= 0 && e.to < screenCount &&
    e.to > e.from
  );
  if (forwardEdges.length === 0) {
    return Array.from({ length: screenCount }, (_, i) => ({ col: i, row: 0 }));
  }

  const adj = new Map<number, number[]>();
  const inDeg = new Map<number, number>();
  for (let i = 0; i < screenCount; i++) {
    adj.set(i, []);
    inDeg.set(i, 0);
  }
  for (const e of forwardEdges) {
    adj.get(e.from)?.push(e.to);
    inDeg.set(e.to, (inDeg.get(e.to) || 0) + 1);
  }

  const layers: number[][] = [];
  const assigned = new Set<number>();
  let queue = [...inDeg.entries()].filter(([, d]) => d === 0).map(([n]) => n);
  if (queue.length === 0) queue = [0];

  while (queue.length > 0) {
    const layer: number[] = [];
    const next: number[] = [];
    for (const n of queue) {
      if (assigned.has(n)) continue;
      assigned.add(n);
      layer.push(n);
      for (const child of adj.get(n) || []) {
        if (!assigned.has(child)) next.push(child);
      }
    }
    if (layer.length > 0) layers.push(layer);
    queue = [...new Set(next)];
  }

  for (let i = 0; i < screenCount; i++) {
    if (!assigned.has(i)) {
      layers.push([i]);
      assigned.add(i);
    }
  }

  const positions: { col: number; row: number }[] = new Array(screenCount);
  for (let col = 0; col < layers.length; col++) {
    const layer = layers[col];
    const startRow = -(layer.length - 1) / 2;
    for (let r = 0; r < layer.length; r++) {
      positions[layer[r]] = { col, row: startRow + r };
    }
  }

  return positions;
}

function renderScreens(editor: Editor, screens: Screen[], deviceType: string, flowGraph: FlowGraph | null) {
  const existing = editor.getCurrentPageShapeIds();
  if (existing.size > 0) {
    editor.deleteShapes([...existing]);
  }
  if (screens.length === 0) return;

  const dim = DEVICE_SIZES[deviceType] || DEVICE_SIZES.DESKTOP;
  const isMobile = deviceType === 'MOBILE';
  const positions = computeGraphLayout(screens.length, flowGraph);

  const COL_GAP = dim.w + 120;
  const ROW_GAP = dim.h + 80;
  const minRow = Math.min(...positions.map(p => p.row));

  const screenPositions: { x: number; y: number }[] = [];

  for (let i = 0; i < screens.length; i++) {
    const s = screens[i];
    const pos = positions[i];
    const x = pos.col * COL_GAP;
    const y = (pos.row - minRow) * ROW_GAP;
    screenPositions.push({ x, y });

    const title = s.title || `Screen ${s.order + 1}`;
    const meta = parseScreenMeta(s.htmlUrl);
    const hasScreenshot = !!s.screenshotUrl;

    editor.createShape({
      type: 'frame',
      x,
      y,
      props: { w: dim.w, h: dim.h, name: `${i + 1}. ${title}` },
    });

    const innerPad = 10;
    let elY = y + 8;

    if (isMobile) {
      editor.createShape({
        type: 'geo',
        x: x + innerPad,
        y: elY,
        props: {
          w: dim.w - innerPad * 2,
          h: 16,
          geo: 'rectangle',
          richText: toRichText('9:41          \u26A1\uD83D\uDCF6'),
          size: 's',
          font: 'sans',
          fill: 'solid',
          color: 'grey',
        },
      });
      elY += 20;
    }

    editor.createShape({
      type: 'geo',
      x: x + innerPad,
      y: elY,
      props: {
        w: dim.w - innerPad * 2,
        h: 30,
        geo: 'rectangle',
        richText: toRichText(title),
        size: 's',
        font: 'sans',
        fill: 'solid',
        color: 'blue',
        labelColor: 'white',
      },
    });
    elY += 36;

    if (hasScreenshot) {
      editor.createShape({
        type: 'geo',
        x: x + innerPad,
        y: elY,
        props: {
          w: dim.w - innerPad * 2,
          h: dim.h - elY + y - (isMobile ? 24 : 10),
          geo: 'rectangle',
          richText: toRichText('\uD83D\uDCF7 Stitch Visual\n(View in Screens tab)'),
          size: 's',
          font: 'sans',
          fill: 'semi',
          color: 'green',
        },
      });
    } else if (meta.elements.length > 0) {
      const remainingH = dim.h - (elY - y) - (isMobile ? 24 : 10);
      const slotH = Math.min(34, Math.max(22, remainingH / meta.elements.length - 3));

      for (const el of meta.elements) {
        if (elY + slotH > y + dim.h - (isMobile ? 24 : 10)) break;
        editor.createShape({
          type: 'geo',
          x: x + innerPad,
          y: elY,
          props: {
            w: dim.w - innerPad * 2,
            h: slotH,
            geo: 'rectangle',
            richText: toRichText(el),
            size: 's',
            font: 'sans',
            fill: 'semi',
            color: 'light-blue',
          },
        });
        elY += slotH + 3;
      }
    } else if (s.prompt) {
      const label = s.prompt.length > 80 ? s.prompt.slice(0, 80) + '\u2026' : s.prompt;
      editor.createShape({
        type: 'geo',
        x: x + innerPad,
        y: elY,
        props: {
          w: dim.w - innerPad * 2,
          h: 60,
          geo: 'rectangle',
          richText: toRichText(label),
          size: 's',
          font: 'sans',
          fill: 'semi',
          color: 'light-violet',
        },
      });
    }

    if (isMobile) {
      editor.createShape({
        type: 'geo',
        x: x + dim.w / 2 - 30,
        y: y + dim.h - 14,
        props: {
          w: 60,
          h: 5,
          geo: 'rectangle',
          fill: 'solid',
          color: 'grey',
          size: 's',
          font: 'sans',
          richText: toRichText(''),
        },
      });
    }
  }

  const edges = flowGraph?.edges?.filter(e =>
    e.from >= 0 && e.from < screens.length &&
    e.to >= 0 && e.to < screens.length &&
    e.to > e.from
  ) || [];

  const drawnEdges = edges.length > 0 ? edges : Array.from(
    { length: Math.max(0, screens.length - 1) },
    (_, i) => ({ from: i, to: i + 1, label: '' })
  );

  for (const e of drawnEdges) {
    const fromPos = screenPositions[e.from];
    const toPos = screenPositions[e.to];

    const startX = fromPos.x + dim.w + 10;
    const startY = fromPos.y + dim.h / 2;
    const endX = toPos.x - 10;
    const endY = toPos.y + dim.h / 2;

    editor.createShape({
      type: 'arrow',
      x: startX,
      y: startY,
      props: {
        start: { x: 0, y: 0 },
        end: { x: endX - startX, y: endY - startY },
        arrowheadEnd: 'arrow',
        color: 'blue',
        size: 'm',
      },
    });

    if (e.label) {
      const labelX = (startX + endX) / 2;
      const labelY = Math.min(startY, endY) - 18;
      editor.createShape({
        type: 'text',
        x: labelX - 30,
        y: labelY,
        props: {
          richText: toRichText(e.label.length > 20 ? e.label.slice(0, 20) + '\u2026' : e.label),
          size: 's',
          font: 'sans',
          color: 'violet',
          autoSize: true,
        },
      });
    }
  }

  setTimeout(() => {
    editor.zoomToFit({ animation: { duration: 300 } });
  }, 150);
}

export function TLDrawViewer({ screens, deviceType = 'DESKTOP', flowGraph }: Props) {
  const editorRef = useRef<Editor | null>(null);
  const [ready, setReady] = useState(false);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !editorRef.current) return;
    if (screens.length === 0) return;
    const timer = setTimeout(() => {
      if (editorRef.current) {
        renderScreens(editorRef.current, screens, deviceType, flowGraph ?? null);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [ready, screens, deviceType, flowGraph]);

  if (screens.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl border text-[var(--text-muted)]" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
        No screens to display. Generate wireframes first.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)', height: 600 }}>
      <Tldraw onMount={handleMount} />
    </div>
  );
}
