"use client";

type QueueItem = {
  id: number;
  position: number;
  song: SongMedia;
};

type SongMedia = {
  id: number;
  title: string;
  artist: string;
  language: string;
  coverPath?: string | null | undefined;
  folderName: string;
  audioPath?: string | null;
  txtPath: string | null;
  videoPath: string | null;
};

export function QueueList({
  queue,
  disabled,
  onSelect,
}: {
  queue: QueueItem[];
  disabled: boolean;
  onSelect: (item: QueueItem) => void;
}) {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5159";

  const buildCover = (item: QueueItem) =>
    item.song.coverPath
      ? `${backendUrl}/files/${item.song.folderName}/${item.song.coverPath}`
      : null;

  return (
    <div>
      <h3>Kolejka</h3>

      {queue.map((q) => (
        <div
          key={q.id}
          onClick={() => !disabled && onSelect(q)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 8,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            borderBottom: "1px solid #eee",
          }}
        >
          <div style={{ width: 50 }}>
            {buildCover(q) ? (
              <img src={buildCover(q)!} style={{ width: 50 }} />
            ) : (
              <div
                style={{
                  width: 50,
                  height: 50,
                  background: "#ccc",
                }}
              />
            )}
          </div>

          <div>
            <div>{q.position}. {q.song.artist}</div>
            <div style={{ fontSize: 12 }}>{q.song.title}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
