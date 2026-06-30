"use client";

import { useState } from "react";
import { Project, ProjectPayload } from "@/lib/types";

export default function AdminClient() {
  const [password, setPassword] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<ProjectPayload | null>(null);
  const [error, setError] = useState("");

  async function loadProjects() {
    setError("");
    const response = await fetch("/api/admin/projects", { headers: { "x-admin-password": password } });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not load projects");
      return;
    }
    setProjects(data);
  }

  async function openProject(projectId: string) {
    const response = await fetch(`/api/admin/projects/${projectId}`, { headers: { "x-admin-password": password } });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not load project");
      return;
    }
    setSelected(data);
  }

  function downloadCsv() {
    if (!selected) return;
    const approved = selected.images.filter((image) => image.is_approved);
    const rows = [["recipient_name", "filename", "prompt_used"]];
    approved.forEach((image, index) => {
      const recipient = selected.recipients.find((item) => item.id === image.recipient_id);
      rows.push([
        recipient?.name || "recipient",
        `${slug(selected.project.project_name)}_${String(index + 1).padStart(3, "0")}_${slug(recipient?.name || "recipient")}.svg`,
        image.prompt_used,
      ]);
    });
    download(`${slug(selected.project.project_name)}-mapping.csv`, rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n"));
  }

  function downloadImages() {
    selected?.images.filter((image) => image.is_approved && image.signed_url).forEach((image, index) => {
      const recipient = selected.recipients.find((item) => item.id === image.recipient_id);
      const link = document.createElement("a");
      link.href = image.signed_url || "";
      link.download = `${slug(selected.project.project_name)}_${String(index + 1).padStart(3, "0")}_${slug(recipient?.name || "recipient")}.svg`;
      link.click();
    });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">S</span>
          <div>
            <strong>Sticker Studio</strong>
            <small>Admin print queue</small>
          </div>
        </div>
        <label>Admin password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button className="primary" onClick={loadProjects}>Load projects</button>
        {error ? <p className="error">{error}</p> : null}
      </aside>
      <main className="content">
        <header className="page-head">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>Print queue</h1>
          </div>
          {selected ? (
            <div className="head-actions">
              <button className="primary" onClick={downloadImages}>Download approved images</button>
              <button className="secondary" onClick={downloadCsv}>Download mapping CSV</button>
            </div>
          ) : null}
        </header>
        <div className="grid two">
          <section className="panel stack">
            {projects.map((project) => (
              <button className="row-card" key={project.id} onClick={() => openProject(project.id)}>
                <span>{project.project_name}</span>
                <span className="status">{project.status}</span>
              </button>
            ))}
          </section>
          <section className="panel">
            {selected ? <ProjectDetail payload={selected} /> : <p className="muted">Select a project to preview approved stickers.</p>}
          </section>
        </div>
      </main>
    </div>
  );
}

function ProjectDetail({ payload }: { payload: ProjectPayload }) {
  const approved = payload.images.filter((image) => image.is_approved);
  return (
    <div className="stack">
      <h2>{payload.project.project_name}</h2>
      <p>{approved.length} approved stickers out of {payload.recipients.length} recipients.</p>
      <div className="sticker-grid">
        {approved.map((image) => {
          const recipient = payload.recipients.find((item) => item.id === image.recipient_id);
          return (
            <article className="sticker-card" key={image.id}>
              {image.signed_url ? <img className="sticker-art" src={image.signed_url} alt="" /> : null}
              <h3>{recipient?.name || "Recipient"}</h3>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
