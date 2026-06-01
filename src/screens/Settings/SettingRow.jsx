export default function SettingRow({ title, note, children }) {
  return (
    <div className="il-setrow">
      <div className="tg">
        <div className="t">{title}</div>
        {note && <div className="s">{note}</div>}
      </div>
      {children}
    </div>
  );
}
