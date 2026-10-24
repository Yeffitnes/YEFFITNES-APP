export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <div className="sk" style={{ height: 14, width: 90, marginBottom: 12 }} />
      <div className="sk" style={{ height: 30, width: 220, marginBottom: 22 }} />
      <div className="sk" style={{ height: 38, width: "60%", marginBottom: 18 }} />
      {[0, 1, 2, 3].map((i) => <div key={i} className="sk" style={{ height: 68, marginBottom: 10 }} />)}
    </div>
  );
}
