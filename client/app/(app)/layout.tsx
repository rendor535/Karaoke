export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          
          {/* SIDEBAR */}
          <aside
            style={{
              width: "240px",
              borderRight: "1px solid #ccc",
              padding: "16px",
            }}
          >
            <div style={{ marginBottom: "24px", fontWeight: "bold" }}>
              🎤 Karaoke
            </div>

            <nav>
              <ul style={{ listStyle: "none", padding: 0 }}>
                <li><a href="/home">Home</a></li>
                <li><a href="/active">Aktywna sesja?</a></li>
                <li><a href="/sessions">Sesje</a></li>
                <li><a href="/songs">Piosenki</a></li>
                <li><a href="/settings">Ustawienia</a></li>
              </ul>
            </nav>
          </aside>

          {/* CONTENT */}
          <main
            style={{
              flex: 1,
              padding: "24px",
            }}
          >
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}
