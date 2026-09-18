import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminAccess, hasPermission, type AdminAccess } from "@/lib/admin-access";
import { APPLICATION_DOCUMENT_BUCKET, removeApplicationDocuments, type ApplicationDocument } from "@/lib/media";
import { toast } from "sonner";
import { Archive, Download, FileText, Mail, MessageCircle, Phone, Printer, Save, Search, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/applications")({
  component: AdminApplications,
});

type Application = {
  id: string; parent_name: string; child_name: string; class_applying_for: string; phone: string; email: string; date_of_birth: string | null;
  religion: string | null; tribe: string | null; previous_school: string | null; mother_name: string | null; mother_language: string | null;
  mother_occupation: string | null; mother_phone: string | null; father_name: string | null; father_language: string | null;
  father_occupation: string | null; father_phone: string | null; location: string | null; house_number: string | null; notes: string | null;
  internal_notes: string | null; documents: ApplicationDocument[]; status: string; archived: boolean; created_at: string;
};

const STATUSES = ["new", "reviewing", "contacted", "accepted", "rejected"] as const;
const statusLabel = (status: string) => status[0].toUpperCase() + status.slice(1);

function AdminApplications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Application | null>(null);
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("applications").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setApps((data ?? []).map((application) => ({ ...application, documents: Array.isArray(application.documents) ? application.documents as ApplicationDocument[] : [] })) as Application[]);
    setLoading(false);
  };
  useEffect(() => { getAdminAccess().then(setAccess); load(); }, []);

  const filtered = useMemo(() => apps.filter((application) => {
    const query = search.trim().toLowerCase();
    return (showArchived ? application.archived : !application.archived)
      && (filter === "all" || application.status === filter)
      && (!query || [application.child_name, application.parent_name, application.email, application.phone].some((value) => value.toLowerCase().includes(query)));
  }), [apps, filter, search, showArchived]);

  const updateStatus = async (application: Application, status: string) => {
    const { error } = await supabase.from("applications").update({ status }).eq("id", application.id);
    if (error) { toast.error(error.message); return; }
    setApps((prev) => prev.map((item) => item.id === application.id ? { ...item, status } : item));
    setSelected((current) => current?.id === application.id ? { ...current, status } : current);
  };

  const archive = async (application: Application) => {
    const { error } = await supabase.from("applications").update({ archived: !application.archived, archived_at: application.archived ? null : new Date().toISOString() }).eq("id", application.id);
    if (error) { toast.error(error.message); return; }
    toast.success(application.archived ? "Application restored" : "Application archived");
    load();
    if (selected?.id === application.id) setSelected(null);
  };

  const remove = async (application: Application) => {
    if (!confirm("Permanently delete this application and its documents?")) return;
    const { error } = await supabase.from("applications").delete().eq("id", application.id);
    if (error) { toast.error(error.message); return; }
    await removeApplicationDocuments(application.documents);
    toast.success("Application deleted");
    setSelected(null);
    load();
  };

  if (access && !hasPermission(access, "admissions")) return <PermissionNotice />;
  const counts: Record<string, number> = { all: apps.filter((application) => !application.archived).length, ...Object.fromEntries(STATUSES.map((status) => [status, apps.filter((application) => !application.archived && application.status === status).length])) };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="font-display text-3xl font-bold">Admissions applications</h1><p className="mt-1 text-sm text-muted-foreground">Review complete applications, documents, follow-up status and private notes.</p></div><button onClick={() => setShowArchived((value) => !value)} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary"><Archive className="h-4 w-4" /> {showArchived ? "Active applications" : "Archived applications"}</button></div>
      <div className="mt-6 flex flex-wrap gap-2">{(["all", ...STATUSES] as const).map((status) => <button key={status} onClick={() => setFilter(status)} className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${filter === status ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:border-primary hover:text-primary"}`}>{status} <span className="ml-1 text-xs opacity-70">({counts[status] ?? 0})</span></button>)}</div>
      <label className="mt-4 flex max-w-md items-center gap-2 rounded-xl border border-input bg-card px-3"><Search className="h-4 w-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by child, parent, email or phone" className="w-full bg-transparent py-2.5 text-sm outline-none" /></label>
      <div className="mt-6 space-y-3">{loading && <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Loading applications…</div>}{!loading && filtered.length === 0 && <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No applications in this view.</div>}{filtered.map((application) => <ApplicationCard key={application.id} application={application} onOpen={() => setSelected(application)} onStatus={(status) => updateStatus(application, status)} onArchive={() => archive(application)} onDelete={() => remove(application)} />)}</div>
      {selected && <ApplicationDetail application={selected} onClose={() => setSelected(null)} onStatus={(status) => updateStatus(selected, status)} onArchive={() => archive(selected)} onDelete={() => remove(selected)} />}
    </div>
  );
}

function ApplicationCard({ application, onOpen, onStatus, onArchive, onDelete }: { application: Application; onOpen: () => void; onStatus: (status: string) => void; onArchive: () => void; onDelete: () => void }) {
  const waNumber = application.phone.replace(/[^0-9]/g, "");
  return <article className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><button onClick={onOpen} className="text-left"><h2 className="font-display text-lg font-semibold hover:text-primary">{application.child_name} <span className="text-sm font-normal text-muted-foreground">— {application.class_applying_for}</span></h2><p className="text-sm text-muted-foreground">Parent: {application.parent_name}</p></button><div className="flex items-center gap-2"><select value={application.status} onChange={(event) => onStatus(event.target.value)} className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-semibold"><option value="new">New</option>{STATUSES.slice(1).map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select><button aria-label="Archive application" onClick={onArchive} className="rounded-md p-2 hover:bg-secondary"><Archive className="h-4 w-4" /></button><button aria-label="Delete application" onClick={onDelete} className="rounded-md p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button></div></div><div className="mt-3 flex flex-wrap gap-3 text-xs"><a href={`mailto:${application.email}`} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 hover:border-primary hover:text-primary"><Mail className="h-3.5 w-3.5" /> {application.email}</a><a href={`tel:${application.phone}`} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 hover:border-primary hover:text-primary"><Phone className="h-3.5 w-3.5" /> {application.phone}</a><a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 hover:border-primary hover:text-primary"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a><span className="ml-auto text-muted-foreground">{new Date(application.created_at).toLocaleString()}</span></div>{application.documents.length > 0 && <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary"><FileText className="h-3.5 w-3.5" /> {application.documents.length} supporting document{application.documents.length === 1 ? "" : "s"}</div>}</article>;
}

function ApplicationDetail({ application, onClose, onStatus, onArchive, onDelete }: { application: Application; onClose: () => void; onStatus: (status: string) => void; onArchive: () => void; onDelete: () => void }) {
  const [notes, setNotes] = useState(application.internal_notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const saveNotes = async () => { setSavingNotes(true); const { error } = await supabase.from("applications").update({ internal_notes: notes }).eq("id", application.id); setSavingNotes(false); if (error) toast.error(error.message); else toast.success("Private notes saved"); };
  const print = () => window.print();
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4"><div className="mx-auto my-6 max-w-4xl rounded-2xl bg-card p-6 shadow-2xl md:p-8"><div className="flex items-start justify-between gap-4"><div><h2 className="font-display text-2xl font-bold">{application.child_name}</h2><p className="mt-1 text-sm text-muted-foreground">Application received {new Date(application.created_at).toLocaleString()}</p></div><button onClick={onClose} className="rounded-full p-2 hover:bg-secondary"><X className="h-5 w-5" /></button></div><div className="mt-5 flex flex-wrap gap-2 print:hidden"><select value={application.status} onChange={(event) => onStatus(event.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold"><option value="new">New</option>{STATUSES.slice(1).map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select><button onClick={print} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:border-primary hover:text-primary"><Printer className="h-4 w-4" /> Print / save PDF</button><button onClick={onArchive} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:border-primary hover:text-primary"><Archive className="h-4 w-4" /> Archive</button><button onClick={onDelete} className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /> Delete</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2">{detailFields(application).map(([label, value]) => <div key={label} className="rounded-xl bg-secondary/50 p-3"><div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-1 whitespace-pre-wrap text-sm">{value || "—"}</div></div>)}</div><div className="mt-5"><h3 className="font-display text-lg font-bold">Supporting documents</h3>{application.documents.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No documents attached.</p> : <div className="mt-2 grid gap-2 sm:grid-cols-2">{application.documents.map((document) => <DocumentLink key={document.path} document={document} />)}</div>}</div><div className="mt-5 print:hidden"><h3 className="font-display text-lg font-bold">Private staff notes</h3><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Add follow-up notes for staff only…" className="mt-2 block w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /><button onClick={saveNotes} disabled={savingNotes} className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Save className="h-4 w-4" /> {savingNotes ? "Saving…" : "Save notes"}</button></div></div></div>;
}

function DocumentLink({ document }: { document: ApplicationDocument }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { supabase.storage.from(APPLICATION_DOCUMENT_BUCKET).createSignedUrl(document.path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null)); }, [document.path]);
  return <a href={url ?? "#"} target="_blank" rel="noopener" download={document.name} className={`inline-flex items-center gap-2 rounded-xl border border-border p-3 text-sm hover:border-primary hover:text-primary ${!url ? "pointer-events-none opacity-50" : ""}`}><Download className="h-4 w-4" /> {document.name}</a>;
}

function detailFields(application: Application) {
  return [["Parent / guardian", application.parent_name], ["Class applying for", application.class_applying_for], ["Email", application.email], ["Phone", application.phone], ["Date of birth", application.date_of_birth], ["Religion", application.religion], ["Tribe", application.tribe], ["Previous school", application.previous_school], ["Mother", [application.mother_name, application.mother_language, application.mother_occupation, application.mother_phone].filter(Boolean).join(" · ")], ["Father", [application.father_name, application.father_language, application.father_occupation, application.father_phone].filter(Boolean).join(" · ")], ["Address", [application.location, application.house_number].filter(Boolean).join(" · ")], ["Additional information", application.notes]] as [string, string | null][];
}

function PermissionNotice() { return <div className="rounded-2xl border border-border bg-card p-8"><h1 className="font-display text-2xl font-bold">Admissions access is restricted</h1><p className="mt-2 text-sm text-muted-foreground">Ask the Super Admin to enable Admissions permission for your staff account.</p></div>; }
