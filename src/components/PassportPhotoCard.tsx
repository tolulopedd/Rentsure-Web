import { Camera, ImagePlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "RS";
}

export function PassportPhotoCard(props: {
  name: string;
  imageUrl?: string | null;
  createdAt?: string | null;
  uploading?: boolean;
  description: string;
  helperText: string;
  onSelectFile: (file: File) => void | Promise<void>;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar className="h-24 w-24 rounded-[1.5rem] border border-slate-200 bg-slate-50">
          {props.imageUrl ? <AvatarImage src={props.imageUrl} alt={props.name} className="object-cover" /> : null}
          <AvatarFallback className="rounded-[1.5rem] bg-gradient-to-br from-[var(--rentsure-blue)] to-[var(--rentsure-blue-deep)] text-lg font-semibold text-white">
            {initials(props.name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rentsure-blue)]">
            <Camera className="h-4 w-4" />
            Passport picture
          </div>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">{props.name}</h3>
          <p className="mt-1 text-sm text-slate-600">{props.description}</p>
          <p className="mt-2 text-xs text-slate-500">{props.helperText}</p>
          {props.createdAt ? <p className="mt-2 text-xs text-slate-500">Current photo updated on {new Date(props.createdAt).toLocaleDateString()}</p> : null}
        </div>

        <label className="block">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void props.onSelectFile(file);
              event.currentTarget.value = "";
            }}
          />
          <Button asChild className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]" disabled={props.uploading}>
            <span>
              <ImagePlus className="mr-2 h-4 w-4" />
              {props.uploading ? "Uploading..." : props.imageUrl ? "Change picture" : "Upload picture"}
            </span>
          </Button>
        </label>
      </div>
    </div>
  );
}
