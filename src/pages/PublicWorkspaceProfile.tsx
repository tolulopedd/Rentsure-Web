import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Building2, CheckCircle2, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NigeriaAddressFields } from "@/components/NigeriaAddressFields";
import { PassportPhotoCard } from "@/components/PassportPhotoCard";
import { getErrorMessage } from "@/lib/errors";
import { getWorkspaceOnboarding } from "@/lib/onboarding";
import {
  getWorkspaceProfile,
  saveWorkspacePassportPhoto,
  updateWorkspaceProfile,
  type WorkspaceProfileResponse
} from "@/lib/public-workspace-api";
import { updateStoredUserIdentity } from "@/lib/api";
import { preparePassportPhotoUpload, uploadPublicAccountDocument } from "@/lib/upload";

function displayName(profile: WorkspaceProfileResponse["profile"]) {
  return profile.organizationName?.trim() || [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.email;
}

export default function PublicWorkspaceProfile() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<WorkspaceProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [draft, setDraft] = useState({
    accountType: "LANDLORD" as "LANDLORD" | "AGENT",
    representation: "",
    organizationName: "",
    registrationNumber: "",
    firstName: "",
    lastName: "",
    phone: "",
    state: "",
    city: "",
    address: "",
    propertyCount: "",
    portfolioType: "",
    notes: ""
  });

  async function refresh() {
    try {
      setLoading(true);
      const response = await getWorkspaceProfile();
      setData(response);
      setDraft({
        accountType: response.profile.accountType,
        representation: response.profile.representation || "",
        organizationName: response.profile.organizationName || "",
        registrationNumber: response.profile.registrationNumber || "",
        firstName: response.profile.firstName || "",
        lastName: response.profile.lastName || "",
        phone: response.profile.phone || "",
        state: response.profile.state || "",
        city: response.profile.city || "",
        address: response.profile.address || "",
        propertyCount: response.profile.propertyCount || "",
        portfolioType: response.profile.portfolioType || "",
        notes: response.profile.notes || ""
      });
      updateStoredUserIdentity({
        fullName: displayName(response.profile),
        email: response.profile.email
      });
      localStorage.setItem("userRole", response.profile.accountType);
      localStorage.setItem("userPhone", response.profile.phone || "");
      localStorage.setItem("userPhotoUrl", response.profile.passportPhoto?.viewUrl || "");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load landlord / agent profile"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const profile = data?.profile ?? null;
  const accountName = useMemo(() => (profile ? displayName(profile) : "RentSure profile"), [profile]);
  const onboarding = useMemo(
    () =>
      profile
        ? getWorkspaceOnboarding({
            accountType: profile.accountType,
            entityType: profile.entityType,
            representation: profile.representation,
            organizationName: profile.organizationName,
            registrationNumber: profile.registrationNumber,
            phone: profile.phone,
            state: profile.state,
            city: profile.city,
            address: profile.address,
            passportPhoto: profile.passportPhoto ? { id: profile.passportPhoto.id } : null,
            propertyCount: profile.propertyCount ? Number(profile.propertyCount) || 0 : 0
          })
        : null,
    [profile]
  );
  const showOnboarding = searchParams.get("onboarding") === "1" || !onboarding?.isComplete;

  async function submitProfile() {
    try {
      setSaving(true);
      const response = await updateWorkspaceProfile({
        accountType: draft.accountType,
        representation: draft.representation || null,
        organizationName: profile?.entityType === "COMPANY" ? draft.organizationName : null,
        registrationNumber: profile?.entityType === "COMPANY" ? draft.registrationNumber : null,
        firstName: draft.firstName,
        lastName: draft.lastName,
        phone: draft.phone,
        state: draft.state,
        city: draft.city,
        address: draft.address,
        propertyCount: draft.propertyCount || null,
        portfolioType: draft.portfolioType || null,
        notes: draft.notes || null
      });
      setData(response);
      updateStoredUserIdentity({
        fullName: displayName(response.profile),
        email: response.profile.email
      });
      localStorage.setItem("userRole", response.profile.accountType);
      localStorage.setItem("userPhone", response.profile.phone || "");
      localStorage.setItem("userPhotoUrl", response.profile.passportPhoto?.viewUrl || "");
      toast.success("Profile updated");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  }

  async function handlePassportPhotoUpload(file: File) {
    try {
      setPhotoUploading(true);
      const prepared = await preparePassportPhotoUpload(file);
      const uploaded = await uploadPublicAccountDocument({
        documentType: "PASSPORT_PHOTO",
        file: prepared.file,
        fileName: prepared.fileName,
        contentType: prepared.mimeType
      });
      const response = await saveWorkspacePassportPhoto({
        objectKey: uploaded.objectKey,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType as "image/jpeg" | "image/png" | "image/webp",
        fileSize: uploaded.fileSize
      });
      setData(response);
      localStorage.setItem("userPhotoUrl", response.profile.passportPhoto?.viewUrl || "");
      toast.success("Passport photo updated");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to upload passport photo"));
    } finally {
      setPhotoUploading(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading landlord / agent profile...</div>;
  }

  if (!profile) {
    return <div className="text-sm text-destructive">We could not load this landlord / agent profile.</div>;
  }

  const roleOptions =
    profile.entityType === "COMPANY"
      ? [
          { accountType: "LANDLORD" as const, representation: "We are Landlord", label: "We are Landlord" },
          { accountType: "AGENT" as const, representation: "We are Agent for Landlord", label: "We are Agent for Landlord" },
          { accountType: "AGENT" as const, representation: "We are Management Company", label: "We are Management Company" }
        ]
      : [
          { accountType: "LANDLORD" as const, representation: "I am Landlord", label: "I am Landlord" },
          { accountType: "AGENT" as const, representation: "I am Agent for Landlord", label: "I am Agent for Landlord" }
        ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rentsure-blue)]">
          Landlord / agent
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Profile</h1>
      </div>

      {showOnboarding && onboarding ? (
        <Card className="border-[var(--rentsure-blue-soft)] bg-[linear-gradient(135deg,#ffffff,#f5f8ff)] shadow-sm">
          <CardHeader className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rentsure-blue)]">
              {onboarding.isComplete ? "Ready to go" : "Landlord / agent onboarding"}
            </div>
            <CardTitle className="text-xl">
              {onboarding.isComplete ? "Your workspace profile is in good shape" : "Finish setting up this workspace profile"}
            </CardTitle>
            <p className="text-sm text-slate-600">
              {onboarding.completedCount} of {onboarding.totalCount} key setup steps completed.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {onboarding.steps.map((step) => (
              <div key={step.id} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-950">{step.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{step.description}</p>
                </div>
                {step.done ? (
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Done
                  </Badge>
                ) : (
                  <Badge variant="outline">{step.actionLabel}</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <PassportPhotoCard
        name={accountName}
        imageUrl={profile.passportPhoto?.viewUrl || null}
        createdAt={profile.passportPhoto?.createdAt || null}
        uploading={photoUploading}
        description="Upload a clear headshot so renters, other property stakeholders, and RentSure reviewers can identify this landlord or agent profile faster."
        helperText="Accepted formats: JPG, PNG, or WEBP. We will optimize the image for profile use before saving it."
        onSelectFile={handlePassportPhotoUpload}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Profile information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Workspace role</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  { value: "LANDLORD", label: "Landlord" },
                  { value: "AGENT", label: "Agent" }
                ] as const).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setDraft((current) => {
                        const nextRepresentation =
                          roleOptions.find((option) => option.accountType === item.value)?.representation || "";
                        return {
                          ...current,
                          accountType: item.value,
                          representation: roleOptions.some(
                            (option) => option.accountType === item.value && option.representation === current.representation
                          )
                            ? current.representation
                            : nextRepresentation
                        };
                      })
                    }
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      draft.accountType === item.value
                        ? "border-[var(--rentsure-blue)] bg-[var(--rentsure-blue-soft)] text-[var(--rentsure-blue)]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <div className="font-semibold">{item.label}</div>
                    <div className="mt-1 text-xs text-current/80">Use this workspace as {item.label.toLowerCase()}.</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Representation</Label>
              <div className="grid gap-2">
                {roleOptions
                  .filter((item) => item.accountType === draft.accountType)
                  .map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, representation: item.representation, accountType: item.accountType }))}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        draft.representation === item.representation
                          ? "border-[var(--rentsure-blue)] bg-[var(--rentsure-blue-soft)] text-[var(--rentsure-blue)]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
              </div>
            </div>

            {profile.entityType === "COMPANY" ? (
              <>
                <Field
                  label="Company name"
                  value={draft.organizationName}
                  onChange={(value) => setDraft((current) => ({ ...current, organizationName: value }))}
                />
                <Field
                  label="Registration number"
                  value={draft.registrationNumber}
                  onChange={(value) => setDraft((current) => ({ ...current, registrationNumber: value }))}
                />
              </>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" value={draft.firstName} onChange={(value) => setDraft((current) => ({ ...current, firstName: value }))} />
              <Field label="Last name" value={draft.lastName} onChange={(value) => setDraft((current) => ({ ...current, lastName: value }))} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone" value={draft.phone} onChange={(value) => setDraft((current) => ({ ...current, phone: value }))} />
              <Field label="Email" value={profile.email} onChange={() => {}} readOnly />
            </div>

            <NigeriaAddressFields
              stateValue={draft.state}
              cityValue={draft.city}
              addressValue={draft.address}
              onStateChange={(value) => setDraft((current) => ({ ...current, state: value }))}
              onCityChange={(value) => setDraft((current) => ({ ...current, city: value }))}
              onAddressChange={(value) => setDraft((current) => ({ ...current, address: value }))}
            />

            <div className="space-y-2">
              <Label>Portfolio size</Label>
              <Input
                value={draft.propertyCount}
                onChange={(event) => setDraft((current) => ({ ...current, propertyCount: event.target.value }))}
                className="bg-white"
                placeholder="How many properties or units do you manage?"
              />
            </div>

            <div className="space-y-2">
              <Label>Portfolio type</Label>
              <Input
                value={draft.portfolioType}
                onChange={(event) => setDraft((current) => ({ ...current, portfolioType: event.target.value }))}
                className="bg-white"
                placeholder="Residential, estate management, mixed portfolio..."
              />
            </div>

            <div className="space-y-2">
              <Label>Additional information</Label>
              <Textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} className="bg-white" />
            </div>

            <Button onClick={() => void submitProfile()} disabled={saving} className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]">
              {saving ? "Saving..." : "Update profile"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                <BadgeCheck className="h-4 w-4" />
                Verified public account
              </div>
              <CardTitle className="text-3xl tracking-[-0.03em] text-slate-950">{accountName}</CardTitle>
              <p className="text-sm leading-6 text-slate-500">
                This profile powers the shared landlord and agent workspace for renter review, rent score requests, and payment coordination.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4">
              <InfoTile label="Email" value={profile.email} icon={Mail} />
              <InfoTile label="Account type" value={profile.accountType.toLowerCase()} icon={ShieldCheck} />
              <InfoTile label="Phone" value={profile.phone || "-"} icon={Phone} />
              <InfoTile label="Coverage" value="Nigeria RentSure Operations" icon={MapPin} />
              {profile.organizationName ? <InfoTile label="Entity" value={profile.organizationName} icon={Building2} /> : null}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Profile state</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                Verified and active
              </Badge>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p><span className="font-semibold text-slate-950">Representation:</span> {profile.representation || "-"}</p>
                <p className="mt-1"><span className="font-semibold text-slate-950">Entity type:</span> {profile.entityType.toLowerCase()}</p>
                <p className="mt-1"><span className="font-semibold text-slate-950">Created:</span> {new Date(profile.createdAt).toLocaleDateString()}</p>
                <p className="mt-1"><span className="font-semibold text-slate-950">Last updated:</span> {new Date(profile.updatedAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} readOnly={readOnly} className="bg-white" />
    </div>
  );
}

function InfoTile({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string;
  icon: typeof Mail;
}) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        <Icon className="h-4 w-4 text-[var(--rentsure-blue)]" />
        {label}
      </div>
      <div className="mt-3 text-sm font-medium capitalize text-slate-950">{value}</div>
    </div>
  );
}
