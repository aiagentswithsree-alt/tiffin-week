import React from 'react';
import type { PrintDefaults } from '../types';

interface Props {
  paper: PrintDefaults['paperSize'];
  orientation: 'portrait' | 'landscape';
  inkSaver: boolean;
  /** Page title for the browser tab and screen header. */
  title: string;
  /** Shown above the sheet on screen only — hidden in print. */
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}

/** CSS size tokens for @page. */
const sizeFor = (paper: PrintDefaults['paperSize'], orientation: 'portrait' | 'landscape') =>
  `${paper} ${orientation}`;

/** Visible sheet dimensions on screen — mirror A4/A3/A5 at ~96dpi so authors see
 *  the real page bounds, not a scaled phone frame. These are reduced slightly to
 *  stay comfortable at 1× zoom; print output uses @page and ignores them. */
const screenDims: Record<`${PrintDefaults['paperSize']}-${'portrait' | 'landscape'}`, { w: string; h: string }> = {
  'A3-portrait':  { w: '297mm', h: '420mm' },
  'A3-landscape': { w: '420mm', h: '297mm' },
  'A4-portrait':  { w: '210mm', h: '297mm' },
  'A4-landscape': { w: '297mm', h: '210mm' },
  'A5-portrait':  { w: '148mm', h: '210mm' },
  'A5-landscape': { w: '210mm', h: '148mm' },
};

/**
 * Wraps a print sheet with its @page CSS and sheet-sized frame. Hides the app
 * toolbar at print time and ensures the sheet renders at real page dimensions.
 */
export default function PrintSheet({ paper, orientation, inkSaver, title, toolbar, children }: Props) {
  const dims = screenDims[`${paper}-${orientation}`];
  // Suppress tests that reach the DOM via jsdom
  React.useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => { document.title = prev; };
  }, [title]);

  const css = `
    @page { size: ${sizeFor(paper, orientation)}; margin: 12mm; }
    @media print {
      html, body { background: #fff !important; }
      .no-print { display: none !important; }
      .sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; height: auto !important; min-height: 0 !important; page-break-after: auto; }
      .sheet + .sheet { page-break-before: always; }
    }
  `;

  const sheetClass = `sheet mx-auto bg-white text-ink shadow-xl print:shadow-none ${inkSaver ? 'sheet-inksaver' : ''}`;

  return (
    <div className="min-h-full bg-stage py-6 print:bg-white print:py-0">
      <style>{css}</style>
      {toolbar ? <div className="no-print mx-auto mb-4 max-w-[840px] px-4">{toolbar}</div> : null}
      <div
        data-sheet-paper={paper}
        data-sheet-orientation={orientation}
        data-ink-saver={inkSaver ? 'on' : 'off'}
        className={sheetClass}
        style={{ width: dims.w, minHeight: dims.h, padding: '12mm', boxSizing: 'border-box' }}
      >
        {children}
      </div>
    </div>
  );
}
