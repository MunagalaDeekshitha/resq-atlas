import type { Brief, DisasterEvent } from '@/lib/types';
import { HAZARDS } from '@/lib/hazards';
import { EMERGENCY_NUMBERS, GO_BAG } from '@/lib/emergency';
import { SEVERITY_LABEL } from '@/lib/format';

/** Hidden on screen; shown only when printing or saving as PDF. */
export default function PrintCard({ event, brief }: { event: DisasterEvent; brief: Brief }) {
  return (
    <section className="print-card" aria-hidden="true">
      <h1>Safety card</h1>
      <p className="pc-sub">
        {HAZARDS[event.type].label}, {SEVERITY_LABEL[event.severity].toLowerCase()} severity. Prepared{' '}
        {new Date().toLocaleString()} from public data (source: {event.sources.join(', ')}).
      </p>
      <h2>{event.title}</h2>
      <p>{brief.summary}</p>

      <h3>What to do</h3>
      <ul>
        {brief.checklist.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>

      <h3>Emergency numbers</h3>
      <table>
        <tbody>
          {EMERGENCY_NUMBERS.map((n) => (
            <tr key={n.region}>
              <td>{n.region}</td>
              <td>{n.number}</td>
            </tr>
          ))}
          <tr>
            <td>My local emergency number</td>
            <td className="blank" />
          </tr>
        </tbody>
      </table>

      <h3>Go-bag checklist</h3>
      <ul className="two-col">
        {GO_BAG.map((g) => (
          <li key={g}>{g}</li>
        ))}
      </ul>

      <h3>My family plan</h3>
      <p className="blank-line">Meeting place if we cannot go home:</p>
      <p className="blank-line">Contact person outside the area:</p>
      <p className="blank-line">Important medical needs:</p>

      <p className="pc-foot">
        Informational only, not an official warning. Numbers can change: confirm them with your local authority. In an
        emergency, follow the instructions of local authorities.
      </p>
    </section>
  );
}
