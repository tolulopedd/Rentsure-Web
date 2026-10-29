import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function RentScoreReportViewer({ report, onClose }: {
  report: { html: string; fileName: string } | null; onClose: () => void;
}) {
  function download() {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([report.html], { type: "text/html;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = report.fileName;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <Dialog open={Boolean(report)} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="flex h-[92dvh] w-[95vw] max-w-6xl flex-col gap-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div><DialogTitle>RentScore report</DialogTitle><DialogDescription>Review the report here, then download a copy if needed.</DialogDescription></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={download}><Download className="mr-2 h-4 w-4" />Download report</Button>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close report"><X className="h-5 w-5" /></Button>
        </div>
      </div>
      {report && <iframe title="RentSure RentScore report preview" sandbox="" srcDoc={report.html} className="min-h-0 w-full flex-1 border-0 bg-slate-100" />}
    </DialogContent>
  </Dialog>;
}
