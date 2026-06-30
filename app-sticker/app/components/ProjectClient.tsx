"use client";

import { useMemo, useState } from "react";
import { GeneratedImage, ProjectPayload, Recipient } from "@/lib/types";

type View = "project" | "recipients" | "generate" | "review" | "submit";

export default function ProjectClient({ initialPayload, token }: { initialPayload: ProjectPayload; token: string }) {
  const [payload, setPayload] = useState(initialPayload);
  const [view, setView] = useState<View>("project");
  const [selectedId, setSelectedId] = useState(initialPayload.recipients[0]?.id || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = payload.recipients.find((recipient) => recipient.id === selectedId) || payload.recipients[0];
  const imagesByRecipient = useMemo(() => latestImages(payload.images), [payload.images]);
  const ready = payload.recipients.filter((recipient) => recipient.name && recipient.description && recipient.status !== "approved").length;
  const approved = payload.recipients.filter((recipient) => recipient.status === "approved").length;
  const incomplete = payload.recipients.filter((recipient) => !recipient.name || !recipient.description).length;

  async function refresh() {
    const next = await api<ProjectPayload>(`/api/projects/${token}`);
    setPayload(next);
    return next;
  }

  async function saveProject(formData: FormData) {
    setBusy(true);
    await api(`/api/projects/${token}`, {
      method: "PATCH",
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    await refresh();
    setMessage("Project saved");
    setBusy(false);
  }

  async function saveRecipient(formData: FormData) {
    if (!selected) return;
    setBusy(true);
    await api(`/api/projects/${token}/recipients/${selected.id}`, {
      method: "PATCH",
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    await refresh();
    setMessage("Recipient saved");
    setBusy(false);
  }

  async function addRecipient() {
    setBusy(true);
    const recipient = await api<Recipient>(`/api/projects/${token}/recipients`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    const next = await refresh();
    setSelectedId(recipient.id || next.recipients.at(-1)?.id || "");
    setBusy(false);
  }

  async function deleteRecipient() {
    if (!selected || payload.recipients.length <= 1) return;
    setBusy(true);
    await api(`/api/projects/${token}/recipients/${selected.id}`, { method: "DELETE" });
    const next = await refresh();
    setSelectedId(next.recipients[0]?.id || "");
    setBusy(false);
  }

  async function generateAll() {
    setBusy(true);
    setMessage("Generating mock stickers...");
    await api(`/api/projects/${token}/generate`, { method: "POST", body: JSON.stringify({}) });
    await refresh();
    setMessage("Generated ready stickers");
    setBusy(false);
  }

  async function regenerate(recipientId: string) {
    setBusy(true);
    await api(`/api/projects/${token}/recipients/${recipientId}/regenerate`, { method: "POST" });
    await refresh();
    setMessage("Image regenerated");
    setBusy(false);
  }

  async function approve(imageId: string) {
    setBusy(true);
    await api(`/api/projects/${token}/images/${imageId}/approve`, { method: "POST" });
    await refresh();
    setMessage("Image approved");
    setBusy(false);
  }

  async function submit(formData: FormData) {
    setBusy(true);
    await api(`/api/projects/${token}/submit`, {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    await refresh();
    setMessage("Project submitted for printing");
    setBusy(false);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">S</span>
          <div>
            <strong>Sticker Studio</strong>
            <small>Private project link</small>
          </div>
        </div>
        <nav>
          {(["project", "recipients", "generate", "review", "submit"] as View[]).map((item) => (
            <button key={item} className={`nav ${view === item ? "active" : ""}`} onClick={() => setView(item)}>
              {title(item)}
            </button>
          ))}
        </nav>
        <button className="secondary" onClick={() => navigator.clipboard.writeText(window.location.href)}>
          Copy return link
        </button>
        {message ? <p className="success">{message}</p> : null}
      </aside>

      <main className="content">
        {view === "project" ? (
          <section>
            <header className="page-head">
              <div>
                <p className="eyebrow">Project Setup</p>
                <h1>Create a sticker batch</h1>
              </div>
              <button className="primary" onClick={() => setView("recipients")}>Continue</button>
            </header>
            <form action={saveProject} className="grid two">
              <div className="panel form">
                <label>Project name<input name="project_name" defaultValue={payload.project.project_name} /></label>
                <label>Email<input name="customer_email" defaultValue={payload.project.customer_email} /></label>
                <label>Occasion<input name="occasion" defaultValue={payload.project.occasion || ""} /></label>
                <label>Target recipients<input name="target_recipient_count" type="number" min="5" max="200" defaultValue={payload.project.target_recipient_count} /></label>
              </div>
              <div className="panel form">
                <label>Shared style<input name="shared_style" defaultValue={payload.project.shared_style} /></label>
                <label>Sticker format<input name="sticker_format" defaultValue={payload.project.sticker_format} /></label>
                <label>Background<input name="background_preference" defaultValue={payload.project.background_preference} /></label>
                <label>Print size<input name="print_size" defaultValue={payload.project.print_size} /></label>
                <button className="primary" disabled={busy}>Save project</button>
              </div>
            </form>
          </section>
        ) : null}

        {view === "recipients" ? (
          <section>
            <header className="page-head">
              <div>
                <p className="eyebrow">Recipient Editor</p>
                <h1>Describe each person</h1>
              </div>
              <div className="head-actions">
                <button className="secondary" onClick={addRecipient} disabled={busy}>Add recipient</button>
                <button className="primary" onClick={() => setView("generate")}>Generate ready</button>
              </div>
            </header>
            <Metrics ready={ready} incomplete={incomplete} approved={approved} />
            <div className="grid editor">
              <aside className="panel list">
                {payload.recipients.map((recipient) => (
                  <button key={recipient.id} className={`row-card ${selected?.id === recipient.id ? "active" : ""}`} onClick={() => setSelectedId(recipient.id)}>
                    <span>{recipient.name || "Unnamed recipient"}</span>
                    <span className="status">{recipient.status}</span>
                  </button>
                ))}
              </aside>
              {selected ? (
                <form action={saveRecipient} className="panel form">
                  <label>Name<input name="name" defaultValue={selected.name} /></label>
                  <label>Description<textarea name="description" defaultValue={selected.description} /></label>
                  <label>Personality<textarea name="personality" defaultValue={selected.personality} /></label>
                  <label>Interests<textarea name="interests" defaultValue={selected.interests} /></label>
                  <label>Style notes<input name="style_notes" defaultValue={selected.style_notes} /></label>
                  <label>Avoid notes<input name="avoid_notes" defaultValue={selected.avoid_notes} /></label>
                  <div className="head-actions">
                    <button className="primary" disabled={busy}>Save recipient</button>
                    <button className="danger" type="button" onClick={deleteRecipient} disabled={busy}>Delete</button>
                  </div>
                </form>
              ) : null}
            </div>
          </section>
        ) : null}

        {view === "generate" ? (
          <section>
            <header className="page-head">
              <div>
                <p className="eyebrow">Batch Generation</p>
                <h1>Generate stickers</h1>
              </div>
              <div className="head-actions">
                <button className="primary" onClick={generateAll} disabled={busy}>Generate ready recipients</button>
                <button className="secondary" onClick={() => setView("review")}>Review images</button>
              </div>
            </header>
            <div className="panel stack">
              {payload.recipients.map((recipient) => (
                <div className="row-card" key={recipient.id}>
                  <span>{recipient.name || "Unnamed recipient"}</span>
                  <div className="head-actions">
                    <span className="status">{recipient.status}</span>
                    <button className="secondary" disabled={busy || !recipient.description} onClick={() => regenerate(recipient.id)}>Regenerate</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {view === "review" ? (
          <section>
            <header className="page-head">
              <div>
                <p className="eyebrow">Review</p>
                <h1>Approve the final set</h1>
              </div>
              <button className="primary" onClick={() => setView("submit")}>Continue to print details</button>
            </header>
            <div className="sticker-grid">
              {payload.recipients.map((recipient) => {
                const image = imagesByRecipient.get(recipient.id);
                return (
                  <article className="sticker-card" key={recipient.id}>
                    {image?.signed_url ? <img className="sticker-art" src={image.signed_url} alt="" /> : <div className="sticker-art" />}
                    <h3>{recipient.name || "Unnamed recipient"}</h3>
                    <p>{image ? `Version ${image.version_number}` : "Not generated yet"}</p>
                    <div className="card-actions">
                      <button className="secondary" disabled={!image || busy} onClick={() => image && approve(image.id)}>
                        {image?.is_approved ? "Approved" : "Approve"}
                      </button>
                      <button className="secondary" disabled={busy || !recipient.description} onClick={() => regenerate(recipient.id)}>Regenerate</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {view === "submit" ? (
          <section>
            <header className="page-head">
              <div>
                <p className="eyebrow">Print Submission</p>
                <h1>Submit for printing</h1>
              </div>
            </header>
            <form action={submit} className="grid two">
              <div className="panel form">
                <label>Customer name<input name="customer_name" /></label>
                <label>Customer email<input name="customer_email" defaultValue={payload.project.customer_email} /></label>
                <label>Phone<input name="customer_phone" /></label>
                <label>Quantity per sticker<input name="quantity_per_sticker" type="number" min="1" defaultValue="1" /></label>
                <label>Print notes<textarea name="print_notes" /></label>
                <button className="primary" disabled={busy}>Submit project</button>
              </div>
              <aside className="panel">
                <h2>Summary</h2>
                <p>{approved} approved stickers out of {payload.recipients.length} recipients.</p>
                <p>Status: {payload.project.status}</p>
              </aside>
            </form>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function Metrics({ ready, incomplete, approved }: { ready: number; incomplete: number; approved: number }) {
  return (
    <div className="metrics">
      <article className="metric"><strong>{ready}</strong><span>Ready</span></article>
      <article className="metric"><strong>{incomplete}</strong><span>Missing info</span></article>
      <article className="metric"><strong>{approved}</strong><span>Approved</span></article>
    </div>
  );
}

function latestImages(images: GeneratedImage[]) {
  const map = new Map<string, GeneratedImage>();
  images.forEach((image) => {
    const current = map.get(image.recipient_id);
    if (!current || image.version_number > current.version_number || image.is_approved) {
      map.set(image.recipient_id, image);
    }
  });
  return map;
}

function title(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

async function api<T>(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data as T;
}
