import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className={inter.className}>
        <div className="app-layout">
          <aside className="sidebar">
            <div className="sidebar-title">🎤 Karaoke</div>
            <nav>
              <ul>
                <li><a href="/home">Home</a></li>
                <li><a href="/active">Aktywna sesja</a></li>
                <li><a href="/sessions">Sesje</a></li>
                <li><a href="/songs">Piosenki</a></li>
              </ul>
            </nav>
          </aside>

          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
