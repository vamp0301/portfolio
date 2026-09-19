/** A vertical chain of glass nodes joined by arrows. */
export default function Chain({ items }: { items: { label: string; note?: string }[] }) {
  return (
    <div className="chain">
      {items.map((it, i) => (
        <div key={it.label}>
          <div className="chain__node" data-reveal style={{ ["--i" as string]: i } as React.CSSProperties}><b>{String(i + 1).padStart(2, "0")}</b> {it.label} {it.note && <i>— {it.note}</i>}</div>
          {i < items.length - 1 && <div className="chain__link" data-reveal style={{ ["--i" as string]: i } as React.CSSProperties} />}
        </div>
      ))}
    </div>
  );
}
