export default function Badge({ text }) {
  return <span className={`badge ${String(text).toLowerCase().replace(/\s+/g, '-')}`}>{text}</span>;
}
