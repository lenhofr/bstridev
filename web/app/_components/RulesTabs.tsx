'use client';

import { useMemo, useState } from 'react';

type Tab = 'Bowling' | 'Pool' | 'Darts';

export function RulesTabs() {
  const [tab, setTab] = useState<Tab>('Bowling');

  const content = useMemo(() => {
    if (tab === 'Bowling') {
      return [
        'Bowling consists of 3 separate regulation games.',
        'Each game is scored individually for point purposes.',
        'Lane order is randomly selected (and also used for the 8-ball / 9-ball pool schedule).',
        'Bowling is scored by standard PBA rules.',
        'If any placing results in a tie: one-ball, most pins roll-off determines the victor (repeat as needed).'
      ];
    }
    if (tab === 'Pool') {
      return [
        'Pool is played as 8-ball and 9-ball (format may vary by year).',
        'Rack rules are agreed before the first break (typically standard bar rules).',
        'Win/loss determines placing for points; organizers can break ties with a quick playoff if needed.'
      ];
    }
    return [
      'Darts is typically Cricket + 301/401 (double-in/double-out), format may vary by year.',
      'Standard throwing order applies; scorekeeper calls and records.',
      'Win/loss determines placing for points; organizers can break ties with a short playoff if needed.'
    ];
  }, [tab]);

  return (
    <section>
      <div className="tabs" role="tablist" aria-label="Rules sections">
        {(['Bowling', 'Pool', 'Darts'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className="tab"
            role="tab"
            aria-selected={tab === t}
            data-active={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rule" />

      <h2 style={{ margin: '0 0 10px' }}>{tab}</h2>
      <ul className="bullets">
        {content.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </section>
  );
}
