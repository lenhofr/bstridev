import { PanelIcons } from './_components/PanelIcons';

export default function Home() {
  return (
    <>
      <PanelIcons />

      <h1 className="panelTitle">2026 Events</h1>

      <div className="grid2">
        <section className="card">
          <h3>Old Guys: March 28th, 2026</h3>
          <p className="subtle">The 39th Annual</p>
        </section>

        <section className="card">
          <h3>Young Guys: February 28th, 2026</h3>
          <ul>
            <li>Strike and Spare — Erlanger</li>
            <li>Breakers Grill — Florence</li>
            <li>Olde Town Tavern — Covington</li>
          </ul>
        </section>
      </div>

      <div className="rule" />

      <h2 style={{ margin: '0 0 10px' }}>Bar Sports Triathlon Concepts</h2>
      <ul className="bullets">
        <li>
          The Bar Sports Triathlon consists of 3 sporting events hand selected to compliment the alcohol consumption
          naturally associated with each.
        </li>
        <li>The 3 sports are Bowling, Pool, and Darts.</li>
        <li>Each sport consists of 3 games per event.</li>
        <li>Each game is scored separately and the points are totaled from all games to determine an overall winner.</li>
        <li>
          Each game is scored evenly with 1st Place receiving 3 points, 2nd Place receiving 2 points, 3rd Place
          receiving 1 point, 4th Place (1/2 point), and 5th Place (1/4 point).
        </li>
      </ul>
    </>
  );
}
