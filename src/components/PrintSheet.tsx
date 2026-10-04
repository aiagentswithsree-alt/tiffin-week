import React from 'react';
import type { PrintDefaults } from '../types';

interface Props {
  paper: PrintDefaults['paperSize'];
  orientation: 'portrait' | 'landscape';
  inkSaver: boolean;
  /** Page title for the browser tab and screen header. */
  title: string;
  /** Shown above the sheets on screen only — hidden in print. */
  toolbar?: React.ReactNode;
  /** One child per printable page; each becomes its own `.sheet` block. Pass a
   *  single node for a one-page sheet or multiple siblings/an array for spill. */
  children: React.ReactNode;
}

const sizeFor = (paper: PrintDefaults['paperSize'], orientation: 'portrait' | 'landscape') =>
  `${paper} ${orientation}`;

/** Visible sheet dimensions on screen — mirror real paper so authors see the
 *  real page bounds. Print output uses @page and ignores these. */
const screenDims: Record<`${PrintDefaults['paperSize']}-${'portrait' | 'landscape'}`, { w: string; h: string }> = {
  'A3-portrait':  { w: '297mm', h: '420mm' },
  'A3-landscape': { w: '420mm', h: '297mm' },
  'A4-portrait':  { w: '210mm', h: '297mm' },
  'A4-landscape': { w: '297mm', h: '210mm' },
  'A5-portrait':  { w: '148mm', h: '210mm' },
  'A5-landscape': { w: '210mm', h: '148mm' },
};

/**
 * Wraps print pages with their @page CSS. Each immediate child is rendered as
 * its own `.sheet` block, sized to the real paper dimensions on screen, with a
 * `page-break-before: always` between pages at print time. The browser toolbar
 * is hidden in print via the `.no-print` class.
 */
export default function PrintSheet({ paper, orientation, inkSaver, title, toolbar, children }: Props) {
  const dims = screenDims[`${paper}-${orientation}`];

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
      .sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; min-height: 0 !important; height: auto !important; page-break-after: auto; break-after: auto; }
      .sheet + .sheet { page-break-before: always; break-before: page; }
    }
    /* Ink-saver: every background inside the sheet is cleared to white, so the
       sheet prints flat black-and-white. Borders stay for structure. */
    .sheet-inksaver .sheet,
    .sheet-inksaver .sheet * {
      background-color: #ffffff !important;
      background-image: none !important;
      box-shadow: none !important;
    }
    .sheet-inksaver .sheet,
    .sheet-inksaver .sheet * {
      color: #000000 !important;
    }
  `;

  const pages = React.Children.toArray(children);

  return (
    <div className="min-h-full bg-stage py-6 print:bg-white print:py-0">
      <style>{css}</style>
      {toolbar ? <div className="no-print mx-auto mb-4 max-w-[840px] px-4">{toolbar}</div> : null}
      <div className={inkSaver ? 'sheet-inksaver' : ''}>
        {pages.map((child, i) => (
          <div
            key={i}
            data-sheet-paper={paper}
            data-sheet-orientation={orientation}
            data-ink-saver={inkSaver ? 'on' : 'off'}
            data-page-index={i + 1}
            className={`sheet mx-auto bg-white text-ink shadow-xl print:shadow-none ${i === 0 ? '' : 'mt-6'}`}
            style={{ width: dims.w, minHeight: dims.h, padding: '12mm', boxSizing: 'border-box' }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
