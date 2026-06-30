"use client";

import { useState } from "react";

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createProject() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: "Team retreat gift stickers",
        customer_email: "hello@example.com",
        occasion: "Company event",
        target_recipient_count: 5,
        shared_style: "Cute bold vector",
        sticker_format: "Portrait sticker",
        background_preference: "Transparent background",
        print_size: "2 inch stickers",
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not create project");
      setLoading(false);
      return;
    }
    window.location.href = `/project/${data.private_token}`;
  }

  return (
    <main className="home">
      <section className="hero">
        <p className="eyebrow">Sticker Studio</p>
        <h1>Create personalized sticker batches</h1>
        <p>Collect recipient descriptions, generate one sticker per person, approve the final set, and send it to print.</p>
        <button className="primary" onClick={createProject} disabled={loading}>
          {loading ? "Creating..." : "Start a project"}
        </button>
        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}
