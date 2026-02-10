'use client';

import { useMemo, useState } from 'react';

type Tab = 'Bowling' | 'Pool' | 'Darts';

export function RulesTabs() {
  const [tab, setTab] = useState<Tab>('Bowling');

  const content = useMemo(() => {
    if (tab === 'Bowling') {
      return (
        <ul className="bullets">
          <li>Bowling consists of 3 separate regulation games.</li>
          <li>Each game is scored individually for point purposes.</li>
          <li>
            Players will randomly select to determine on which set of 2 lanes they will bowl (This order selection will
            also be used for the 8-ball / 9-ball Pool schedule).
          </li>
          <li>Bowling is scored by standard PBA rules.</li>
          <li>Winning order is determined by end score of each game.</li>
          <li>
            If any placing results in a tie ... there will be a one ball, most pins, roll-off to decide the victor.
            <ul className="bullets">
              <li>If the roll-off results in a tie by strike ... Repeat roll-off.</li>
              <li>If the roll-off results in a tie by less than a strike ... throw 2nd ball at remaining pins.</li>
              <li>Repeat roll-off until victor is determined.</li>
            </ul>
          </li>
        </ul>
      );
    }

    if (tab === 'Pool') {
      return (
        <>
          <h3 style={{ margin: '0 0 10px' }}>8 Ball</h3>
          <ul className="bullets">
            <li>Each participant will play every other participant once (Flip for break).</li>
            <li>Call all shots after break.</li>
            <li>If you scratch on break, all balls made remain in pocket.</li>
            <li>If you pocket 8-ball on break ... you win.</li>
            <li>If you pocket 8-ball on break and scratch ... you lose.</li>
            <li>If you only make solids on break and do not scratch you are solids.</li>
            <li>If you only make stripes on break and do not scratch you are stripes.</li>
            <li>If you make any combination of solids/stripes on break ... table is open.</li>
            <li>8-ball is not neutral. Cannot be used in any combination of balls.</li>
            <li>If on the 8-ball, cannot contact any other ball.</li>
            <li>If you scratch, you pull one ball plus any of your balls made on that shot.</li>
            <li>Can use opponents ball(s) in combination as long as your ball is hit first.</li>
            <li>
              Do not have to call long rails on bank shots (rail parallel to direction of the ball as it approaches object
              pocket).
            </li>
            <li>
              All other disputes will be settled by scorekeepers (feel free to have a neutral player observe any
              complicated shots before they are attempted).
            </li>
          </ul>

          <div className="rule" style={{ margin: '14px 0' }} />

          <h3 style={{ margin: '0 0 10px' }}>9 Ball</h3>
          <ul className="bullets">
            <li>Each participant will play every other participant once (Flip for break).</li>
            <li>If you scratch on break, all balls made remain in pocket (except 9-ball).</li>
            <li>If you pocket 9-ball on break ... you win.</li>
            <li>If you pocket 9-ball on break and scratch ... spot 9-ball.</li>
            <li>
              If you scratch on break, opponent does not get ball-in-hand. Opponent shoots from behind scratch line (spot
              low-number ball if behind line).
            </li>
            <li>The first ball struck on each shot must be the low-number ball on the table.</li>
            <li>Shots are not called (slop counts).</li>
            <li>No balls are pulled on a scratch or illegal shot except the 9-ball.</li>
            <li>
              Opponent gets ball-in-hand if previous shooter scratches, does not strike low-number ball first, or shoots
              cue ball off the table.
            </li>
            <li>All other disputes will be settled by scorekeeper.</li>
          </ul>

          <div className="rule" style={{ margin: '14px 0' }} />

          <h3 style={{ margin: '0 0 10px' }}>Run</h3>
          <ul className="bullets">
            <li>Get neutral person to watch your run.</li>
            <li>Rack your own balls (no re-rack on bad break ... except very bad miscue).</li>
            <li>If you scratch on break, all balls made remain in pocket and turn continues.</li>
            <li>Shots are not called (slop counts).</li>
            <li>Continue shooting until a scratch occurs or no ball is pocketed.</li>
            <li>If all 15 balls are made ... re-rack and apply above rules.</li>
            <li>If run ends in a scratch, ball(s) made on that shot do not count towards total.</li>
            <li>After 1st Run attempt is over ... RACK 2ND TIME AND APPLY ABOVE RULES.</li>
            <li>Use greater total of balls made from both attempts as your Run Total.</li>
          </ul>
        </>
      );
    }

    return (
      <>
        <h3 style={{ margin: '0 0 10px' }}>Cricket</h3>
        <ul className="bullets">
          <li>Close out 20, 19, 18, 17, 16, 15, and Bulls Eye.</li>
          <li>To close out a number you must have 3 legal scores for that number.</li>
          <li>Possible legal scores consist of single, double, or triple.</li>
          <li>Numbers can be closed in any order.</li>
          <li>Each round is complete after every player has thrown 3 darts.</li>
          <li>Winning order is determined by whom ever closes all numbers at the end of any round.</li>
          <li>
            If more than one player closes out in any round they will have a shootout (3 darts thrown at the Bulls Eye;
            player with most Bulls Eyes wins).
          </li>
          <li>Repeat Shootout until a winner is determined.</li>
          <li>Continue rounds until all places are filled (2nd, 3rd, etc.).</li>
        </ul>

        <div className="rule" style={{ margin: '14px 0' }} />

        <h3 style={{ margin: '0 0 10px' }}>401 Double-Out</h3>
        <ul className="bullets">
          <li>Start scoring with every player having 401 points.</li>
          <li>Deduct from 401 with total of every set of 3 darts thrown by players.</li>
          <li>
            Totals are determined by tallying the number-area the 3 darts hit (taking into account the double and triple).
          </li>
          <li>
            To close out the game your total must equal ZERO exactly after any dart of your last set of 3 darts is totaled.
          </li>
          <li>Also, when ZERO total is reached, it must be by your last dart landing in a DOUBLE area.</li>
          <li>
            If after any of your 3 darts are thrown your total equals 1 or less than zero ... that turn is over and no
            points are deducted for that round.
          </li>
          <li>Winning order is determined by whom ever reaches ZERO at the end of any round.</li>
          <li>
            If more than one player zeros out in any round they will have a shootout (3 darts thrown at the Bulls Eye;
            player with most Bulls Eyes wins).
          </li>
          <li>Repeat Shootout until a winner is determined.</li>
          <li>Continue rounds until all places are filled (2nd, 3rd, etc.).</li>
        </ul>

        <div className="rule" style={{ margin: '14px 0' }} />

        <h3 style={{ margin: '0 0 10px' }}>301 Double-In and Double-Out</h3>
        <ul className="bullets">
          <li>Start scoring with every player having 301 points.</li>
          <li>Deduct from 301 with total of every set of 3 darts thrown by players.</li>
          <li>Deduction does not start until a dart is thrown in a DOUBLE area.</li>
          <li>If the DOUBLE is hit after the 1st dart is thrown ... the 1st dart does not count in that round’s total.</li>
          <li>
            If the DOUBLE is hit after the 2nd dart is thrown ... the 1st & 2nd darts do not count in that round’s total.
          </li>
          <li>
            Totals are determined by tallying the number-area the 3 darts hit (taking into account the double and triple).
          </li>
          <li>
            To close out the game your total must equal ZERO exactly after any dart of your last set of 3 darts is totaled.
          </li>
          <li>Also, when ZERO total is reached, it must be by your last dart landing in a DOUBLE area.</li>
          <li>
            If after any of your 3 darts are thrown your total equals 1 or less than zero ... that turn is over and no
            points are deducted for that round.
          </li>
          <li>Winning order is determined by whom ever reaches ZERO at the end of any round.</li>
          <li>
            If more than one player zeros out in any round they will have a shootout (3 darts thrown at the Bulls Eye;
            player with most Bulls Eyes wins).
          </li>
          <li>Repeat Shootout until a winner is determined.</li>
          <li>Continue rounds until all places are filled (2nd, 3rd, etc.).</li>
        </ul>
      </>
    );
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
      {content}
    </section>
  );
}
