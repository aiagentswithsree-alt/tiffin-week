import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeekStore } from '../store/useWeekStore';
import { buildShoppingList, type ShoppingItem, type ShopSection, type ShopSplit } from '../lib/shopping';
import { Button } from '../components/ui';

export default function ShoppingList() {
  const { state } = useWeekStore();
  const nav = useNavigate();

  // Tab: Buy Sunday vs Fresh midweek
  const [activeTab, setActiveTab] = useState<ShopSplit>('sunday');

  // Interactive checked items while shopping
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

  // Staples marked running low (moves to active shopping list)
  const [lowStaples, setLowStaples] = useState<Set<string>>(new Set());

  // Show pantry drawer
  const [showPantry, setShowPantry] = useState(false);
  const [pantrySearch, setPantrySearch] = useState('');

  // Share notification
  const [copiedToast, setCopiedToast] = useState(false);

  // Compute shopping list
  const list = useMemo(
    () => buildShoppingList(state, 0, lowStaples),
    [state, lowStaples],
  );

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleLowStaple = (id: string, name: string) => {
    setLowStaples((prev) => {
      const next = new Set(prev);
      const isCurrentlyLow = next.has(id) || next.has(name) || next.has(name.toLowerCase());
      if (isCurrentlyLow) {
        next.delete(id);
        next.delete(name);
        next.delete(name.toLowerCase());
      } else {
        next.add(id);
        next.add(name);
        next.add(name.toLowerCase());
      }
      return next;
    });
  };

  const currentItems = activeTab === 'sunday' ? list.sundayItems : list.midweekItems;

  // Group items by shop section
  const groupedSections = useMemo(() => {
    const map = new Map<ShopSection, ShoppingItem[]>();
    for (const item of currentItems) {
      if (!map.has(item.section)) {
        map.set(item.section, []);
      }
      map.get(item.section)!.push(item);
    }
    return Array.from(map.entries());
  }, [currentItems]);

  const handleShare = () => {
    const lines = [
      `🛒 Tiffin Week Shopping List (${list.dateRangeLabel})`,
      `--- ${activeTab === 'sunday' ? 'Buy Sunday' : 'Fresh midweek'} ---`,
    ];

    for (const [section, items] of groupedSections) {
      lines.push(`\n[${section}]`);
      for (const item of items) {
        lines.push(`• ${item.name}: ${item.quantity} (from ${item.dishes.join(', ')})`);
      }
    }

    const text = lines.join('\n');
    navigator.clipboard?.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  return (
    <div className="flex h-full flex-col bg-bg text-ink overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-line px-3 py-3">
        <button
          type="button"
          onClick={() => nav('/week')}
          aria-label="Back to the week"
          className="grid h-9 w-9 place-items-center rounded-lg text-ink hover:bg-surface-2"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M11 3.5 5.5 9l5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[20px] font-bold text-ink leading-tight">
            Shopping list
          </h1>
          <div className="text-[12px] text-ink-2 truncate">
            {list.dateRangeLabel} · from {list.totalDishesCount} picked dishes · {list.totalServings} servings
          </div>
        </div>
      </div>

      {/* Main Tab Controls & Estimate Banner */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2 space-y-2.5">
        {/* Buy Sunday vs Fresh midweek toggle */}
        <div className="grid grid-cols-2 rounded-xl bg-line p-1 text-[13.5px]">
          <button
            type="button"
            onClick={() => setActiveTab('sunday')}
            className={`min-h-[36px] rounded-lg font-semibold transition-all ${
              activeTab === 'sunday'
                ? 'bg-white text-ink shadow-xs'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            Buy Sunday · {list.sundayItems.length}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('midweek')}
            className={`min-h-[36px] rounded-lg font-semibold transition-all ${
              activeTab === 'midweek'
                ? 'bg-white text-ink shadow-xs'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            Fresh midweek · {list.midweekItems.length}
          </button>
        </div>

        {/* Estimate Banner */}
        <div className="rounded-xl border border-amber/30 bg-amber-soft px-3 py-2 text-[12px] text-amber-900 leading-snug">
          Amounts are <b className="font-semibold">estimates</b> scaled from effective serves per slot. Edit a dish once and the list follows.
        </div>
      </div>

      {/* Shopping Items List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {currentItems.length === 0 ? (
          list.totalDishesCount === 0 ? (
            <div className="py-12 text-center text-ink-2">
              <div className="font-display text-[16px] font-bold text-ink">No dishes picked for this week yet</div>
              <div className="mt-1 text-xs text-ink-2 max-w-[260px] mx-auto">
                Pick your meals on This Week to generate your weekly shopping list.
              </div>
              <button
                type="button"
                onClick={() => nav('/week')}
                className="mt-4 rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-white hover:bg-ink/90"
              >
                Go to This Week →
              </button>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-ink-2">
              No items for {activeTab === 'sunday' ? 'Sunday shopping' : 'Midweek shopping'}.
            </div>
          )
        ) : (
          groupedSections.map(([section, items]) => (
            <div
              key={section}
              className="overflow-hidden rounded-xl border border-line bg-white shadow-xs"
            >
              {/* Section Header */}
              <div className="border-b border-line bg-[#F8F7F3] px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-2">
                {section}
              </div>

              {/* Items in Section */}
              <div className="divide-y divide-line/60">
                {items.map((item) => {
                  const isChecked = Boolean(checkedIds[item.id]);
                  const dishAttribution =
                    item.dishes.length <= 2
                      ? item.dishes.join(' · ')
                      : `${item.dishes.slice(0, 2).join(' · ')} · ${item.dishes.length - 2} more`;

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleCheck(item.id)}
                      className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-2/40 ${
                        isChecked ? 'bg-surface-2/30 opacity-60' : ''
                      }`}
                    >
                      {/* Checkbox button */}
                      <button
                        type="button"
                        aria-label={isChecked ? `Uncheck ${item.name}` : `Check ${item.name}`}
                        className={`grid h-5 w-5 flex-shrink-0 place-items-center rounded-md transition-all ${
                          isChecked
                            ? 'bg-green text-white'
                            : 'border-[1.5px] border-line-2 bg-white'
                        }`}
                      >
                        {isChecked && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                            <path d="M2 6.2 4.6 9 10 3.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>

                      {/* Name and dish attribution */}
                      <div className="min-w-0 flex-1">
                        <div className={`text-[14px] font-medium leading-snug text-ink ${isChecked ? 'line-through text-ink-3' : ''}`}>
                          {item.name}
                        </div>
                        <div className="text-[11.5px] text-ink-2 truncate">
                          {dishAttribution}
                        </div>
                      </div>

                      {/* Quantity & est flag */}
                      <div className="flex items-baseline gap-1 text-right flex-shrink-0">
                        <span className="font-mono text-[13.5px] font-semibold tabular-nums text-ink">
                          {item.quantity}
                        </span>
                        {item.isEstimate && (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-soft px-1 rounded">
                            est.
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer: Pantry drawer toggle & Share buttons */}
      <div className="flex-shrink-0 border-t border-line bg-bg p-3 space-y-2">
        {/* Pantry Staples Banner */}
        <button
          type="button"
          onClick={() => setShowPantry(true)}
          className="flex w-full items-center justify-between text-left text-[12.5px] text-ink-2 hover:text-ink cursor-pointer px-1"
        >
          <span>
            <b className="font-semibold text-ink">{list.pantryStaples.length} staples hidden</b> — you keep them in the Pantry
          </span>
          <span className="font-semibold text-green">View ›</span>
        </button>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={handleShare}
            className="w-full text-center"
          >
            {copiedToast ? 'Copied to clipboard!' : 'Share list'}
          </Button>
          <Button
            variant="primary"
            onClick={() => window.print()}
            className="w-full text-center"
          >
            Print list
          </Button>
        </div>
      </div>

      {/* Wireframe 23: Pantry Staples Drawer */}
      {showPantry && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pantry staples"
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-[1px]"
          onClick={() => setShowPantry(false)}
        >
          <div
            className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl bg-bg shadow-2xl border-t border-line transition-transform duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 pt-2 pb-1">
              <div className="h-1 w-9 rounded-full bg-line-2 mx-auto" />
            </div>

            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h2 className="font-display text-[18px] font-bold text-ink">
                  Pantry
                </h2>
                <div className="text-[12px] text-ink-2">
                  Always in stock — switch OFF to move onto this week's list
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPantry(false)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white text-ink-2 hover:bg-surface-2"
              >
                ✕
              </button>
            </div>

            {/* Search pantry */}
            <div className="p-3 border-b border-line bg-white">
              <input
                type="search"
                value={pantrySearch}
                onChange={(e) => setPantrySearch(e.target.value)}
                placeholder="Search staples..."
                className="h-9 w-full rounded-lg border border-line px-3 text-xs text-ink placeholder:text-ink-3"
              />
            </div>

            {/* Staples list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {list.pantryStaples
                .filter((item) =>
                  !pantrySearch || item.name.toLowerCase().includes(pantrySearch.toLowerCase()),
                )
                .map((item) => {
                  const isLow = lowStaples.has(item.id) || lowStaples.has(item.name) || lowStaples.has(item.name.toLowerCase());
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-line bg-white p-3 shadow-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-medium text-ink">
                          {item.name}
                        </div>
                        {isLow ? (
                          <div className="text-[11px] font-semibold text-amber">
                            Running low — on this week's list
                          </div>
                        ) : (
                          <div className="text-[11px] text-ink-2 truncate">
                            Used in {item.dishes.join(', ')}
                          </div>
                        )}
                      </div>

                      {/* In stock toggle switch (Wireframe 23) */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!isLow}
                        onClick={() => toggleLowStaple(item.id, item.name)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          !isLow ? 'bg-green' : 'bg-line-2'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            !isLow ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
            </div>

            <div className="p-3 border-t border-line bg-white">
              <Button
                variant="primary"
                onClick={() => setShowPantry(false)}
                className="w-full text-center"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
