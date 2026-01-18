"use client";

type Player = {
  id: number;
  nick: string;
};

export function SelectPlayerModal({
  players,
  onSelect,
  onCancel,
}: {
  players: Player[];
  onSelect: (p: Player) => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ background: "#fff", padding: 20 }}>
        <h3>Wybierz gracza</h3>

        {players.map((p) => (
          <button
            key={p.id}
            style={{ display: "block", margin: 5 }}
            onClick={() => onSelect(p)}
          >
            {p.nick}
          </button>
        ))}

        <button onClick={onCancel}>Anuluj</button>
      </div>
    </div>
  );
}
