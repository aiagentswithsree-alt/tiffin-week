import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PrintSheet from '../components/PrintSheet';
import type { PrintDefaults } from '../types';
import { findSheet, type SheetId } from '../lib/print';

interface Props { id: SheetId }

/** Temporary placeholder until each sheet is implemented. */
export default function PrintStub({ id }: Props) {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const sheet = findSheet(id);
  const paper = (params.get('paper') as PrintDefaults['paperSize']) ?? sheet.defaultPaper;
  const inkSaver = params.get('ink') === '1';

  return (
    <PrintSheet
      paper={paper}
      orientation={sheet.orientation}
      inkSaver={inkSaver}
      title={sheet.label}
      toolbar={
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => nav('/print')} className="rounded-md px-2 py-1 text-[13px] text-ink-2 hover:bg-surface-2">← Print centre</button>
          <button type="button" onClick={() => window.print()} className="rounded-md bg-ink px-3 py-1.5 text-[13px] font-semibold text-bg">Save as PDF</button>
        </div>
      }
    >
      <h1 className="font-display text-[22px] font-bold">{sheet.label}</h1>
      <p className="mt-1 text-[12px] text-ink-2">{sheet.blurb}</p>
      <p className="mt-6 text-[13px]">Sheet implementation lands in a later step.</p>
    </PrintSheet>
  );
}
