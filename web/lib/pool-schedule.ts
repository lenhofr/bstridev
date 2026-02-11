import type { PoolSchedule, PoolScheduleRound, PoolScheduledMatch } from './scoring-model';

const BYE = '__BYE__';

export function generateRoundRobinSchedule(params: { competitorOrder: string[]; poolTables: number[] }): PoolSchedule {
  const tables = params.poolTables.length > 0 ? params.poolTables : [1];

  const order = [...params.competitorOrder];
  const list = order.length % 2 === 1 ? [...order, BYE] : order;
  if (list.length < 2) return { rounds: [] };

  const n = list.length;
  const rounds: PoolScheduleRound[] = [];

  let arr = [...list];
  for (let round = 1; round <= n - 1; round++) {
    const matches: PoolScheduledMatch[] = [];
    let bye: string | null = null;

    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];

      if (a === BYE || b === BYE) {
        bye = (a === BYE ? b : a) === BYE ? null : (a === BYE ? b : a);
        continue;
      }

      const table = tables[matches.length % tables.length];
      matches.push({ a, b, table });
    }

    rounds.push({ round, bye, matches });

    // circle method rotation: keep first fixed, rotate the rest.
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop() as string);
    arr = [fixed, ...rest];
  }

  return { rounds };
}
