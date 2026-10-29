import { FileText, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { uploadPublicAccountDocument } from "@/lib/upload";
import { getErrorMessage } from "@/lib/errors";
import type { InformationResponse } from "@/lib/additional-information";

export function InformationResponseDetail({ response }: { response: InformationResponse | null }) {
  if (!response) return null;
  return <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
    <p className="font-medium">Renter information submitted · {new Date(response.submittedAt).toLocaleString()}</p>
    {response.workHistory && <div><p className="font-medium">Work History</p><p className="whitespace-pre-wrap break-words text-sm">{response.workHistory}</p></div>}
    {response.referenceLetter && <div><p className="font-medium">Work Reference Letter</p>{response.referenceLetter.url
      ? <a className="break-all text-blue-700 underline" target="_blank" rel="noreferrer" href={response.referenceLetter.url}>{response.referenceLetter.fileName}</a>
      : <p className="text-sm">Document unavailable. Contact support.</p>}</div>}
  </div>;
}
export function RenterInformationForm({ item, refresh }: {
  item: { id: string; requestedInformation: string[]; informationRequestedAt: string | null; additionalInformationResponse: InformationResponse | null };
  refresh: () => Promise<unknown>;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadId = useId();
  const [workHistory, setWorkHistory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<Awaited<ReturnType<typeof uploadPublicAccountDocument>> | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      let letter = uploaded;
      if (item.requestedInformation.includes("Work Reference Letter") && !letter) {
        if (!file) throw new Error("Attach your work reference letter");
        if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("Choose a PDF, JPG or PNG up to 5 MB");
        letter = await uploadPublicAccountDocument({ documentType: "EMPLOYMENT_DOCUMENT", file, fileName: file.name, contentType: file.type });
        setUploaded(letter);
      }
      await apiFetch(`/api/renter/linked-cases/${item.id}/additional-information`, { method: "POST", body: JSON.stringify({
        requestedAt: item.informationRequestedAt,
        workHistory: item.requestedInformation.includes("Work History") ? workHistory.trim() : undefined,
        referenceLetter: letter || undefined
      }) });
      toast.success("Information sent to your landlord");
      await refresh();
    } catch (error) { toast.error(getErrorMessage(error, "Could not submit information")); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
    <h3 className="font-semibold">Additional information requested</h3>
    <p className="text-sm">Your landlord requested: {item.requestedInformation.join(", ")}.</p>
    {item.additionalInformationResponse ? <InformationResponseDetail response={item.additionalInformationResponse} /> :
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); void submit(); }}>
        {item.requestedInformation.includes("Work History") && <label className="block space-y-2 text-sm"><span>Work History</span>
          <Textarea required maxLength={10000} rows={5} value={workHistory} disabled={busy} onChange={event => setWorkHistory(event.target.value)} placeholder="List employers, job titles, employment dates and relevant work details." />
        </label>}
        {item.requestedInformation.includes("Work Reference Letter") && <div className="space-y-2 text-sm">
          <p id={uploadId + "-label"} className="font-medium">Work Reference Letter</p>
          <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-white p-4">
            <input ref={fileInput} className="hidden" type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={busy}
              aria-label="Choose work reference letter"
              onChange={event => {
                const selected = event.target.files?.[0];
                if (selected) { setFile(selected); setUploaded(null); }
              }} />
            <Button type="button" variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}
              aria-describedby={uploadId + "-help"} className="w-full sm:w-auto">
              <Upload aria-hidden="true" className="mr-2 h-4 w-4" />
              {file || uploaded ? "Change reference letter" : "Upload reference letter"}
            </Button>
            <p id={uploadId + "-help"} className="text-xs text-slate-500">PDF, JPG or PNG · Maximum 5 MB. Your file is uploaded when you submit the information.</p>
            <div aria-live="polite">
              {file || uploaded ? <p className="flex items-start gap-2 text-sm text-slate-700">
                <FileText aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                <span className="min-w-0 break-all">{file?.name || uploaded?.fileName}</span>
              </p> : <p className="text-xs text-slate-500">No file selected.</p>}
            </div>
          </div>
        </div>}
        <Button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit information to landlord"}</Button>
      </form>}
  </section>;
}
