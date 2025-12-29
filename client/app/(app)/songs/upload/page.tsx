"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function SongsUploadPage() {
  const [folderName, setFolderName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function upload() {
    setError(null);
    setResult(null);

    if (!file) {
      setError("Nie wybrano pliku");
      return;
    }

    if (!folderName) {
      setError("Brak nazwy folderu");
      return;
    }

    const form = new FormData();
    form.append("FolderName", folderName);
    form.append("Zip", file);

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/song/upload-folder`, {
        method: "POST",
        body: form,
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      const json = await res.json();
      setResult(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Upload piosenki (ZIP)</h1>

      <div>
        <div>
          <label>Nazwa folderu</label>
          <br />
          <input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="np. queen_bohemian"
          />
        </div>

        <div>
          <label>Plik ZIP</label>
          <br />
          <input
            type="file"
            accept=".zip"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div>
          <button onClick={upload} disabled={loading}>
            {loading ? "Wysyłanie..." : "Wyślij"}
          </button>
        </div>
      </div>

      {error && (
        <pre style={{ color: "red" }}>
          ERROR:
          {"\n"}
          {error}
        </pre>
      )}

      {result && (
        <pre>
          RESULT:
          {"\n"}
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}