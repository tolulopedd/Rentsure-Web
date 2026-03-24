import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, CheckCircle2, Mail, Phone, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NigeriaAddressFields } from "@/components/NigeriaAddressFields";
import { PassportPhotoCard } from "@/components/PassportPhotoCard";
import { useRenterWorkspace } from "@/lib/renter-workspace-context";
import { getErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/renter-workspace-presenters";
import { getRenterOnboarding } from "@/lib/onboarding";
import { preparePassportPhotoUpload, uploadPublicAccountDocument } from "@/lib/upload";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

export default function RenterWorkspaceProfile() {
  const { data, saveProfile, verifyIdentityValue, savePassportPhoto } = useRenterWorkspace();
  const [searchParams] = useSearchParams();
  const [profileDraft, setProfileDraft] = useState({
    organizationName: "",
    registrationNumber: "",
    firstName: "",
    lastName: "",
    phone: "",
    state: "",
    city: "",
    address: "",
    notes: ""
  });
  const [nin, setNin] = useState("");
  const [bvn, setBvn] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [identitySaving, setIdentitySaving] = useState<"NIN" | "BVN" | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    if (!data) return;
    setProfileDraft({
      organizationName: data.profile.organizationName || "",
      registrationNumber: data.profile.registrationNumber || "",
      firstName: data.profile.firstName || "",
      lastName: data.profile.lastName || "",
      phone: data.profile.phone || "",
      state: data.profile.state || "",
      city: data.profile.city || "",
      address: data.profile.address || "",
      notes: data.profile.notes || ""
    });
    setNin(data.profile.nin || "");
    setBvn(data.profile.bvn || "");
  }, [data]);

  if (!data) return null;
  const profile = data.profile;
  const organizationName = profile.organizationName;
  const onboarding = useMemo(() => getRenterOnboarding(profile), [profile]);
  const showOnboarding = searchParams.get("onboarding") === "1" || !onboarding.isComplete;

  async function submitProfile() {
    setProfileSaving(true);
    await saveProfile({
      organizationName: profile.entityType === "COMPANY" ? profileDraft.organizationName : null,
      registrationNumber: profile.entityType === "COMPANY" ? profileDraft.registrationNumber : null,
      firstName: profileDraft.firstName,
      lastName: profileDraft.lastName,
      phone: profileDraft.phone,
      state: profileDraft.state,
      city: profileDraft.city,
      address: profileDraft.address,
      notes: profileDraft.notes || null
    });
    setProfileSaving(false);
  }

  async function submitIdentity(verificationType: "NIN" | "BVN") {
    setIdentitySaving(verificationType);
    await verifyIdentityValue({
      verificationType,
      value: verificationType === "NIN" ? nin : bvn
    });
    setIdentitySaving(null);
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
      await savePassportPhoto({
        objectKey: uploaded.objectKey,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType as "image/jpeg" | "image/png" | "image/webp",
        fileSize: uploaded.fileSize
      });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to upload passport photo"));
    } finally {
      setPhotoUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rentsure-blue)]">Renter</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep your personal information and identity validation current so your rent score remains credible.
        </p>
      </div>

      {showOnboarding ? (
        <Card className="border-[var(--rentsure-blue-soft)] bg-[linear-gradient(135deg,#ffffff,#f5f8ff)] shadow-sm">
          <CardHeader className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rentsure-blue)]">
              {onboarding.isComplete ? "Ready to go" : "Renter onboarding"}
            </div>
            <CardTitle className="text-xl">
              {onboarding.isComplete ? "Your renter profile is in good shape" : "Finish setting up your renter profile"}
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
        name={organizationName || `${profileDraft.firstName} ${profileDraft.lastName}`.trim() || profile.email}
        imageUrl={profile.passportPhoto?.viewUrl || null}
        createdAt={profile.passportPhoto?.createdAt || null}
        uploading={photoUploading}
        description="Upload a clear headshot so landlords, agents, and RentSure reviewers can identify this renter profile faster."
        helperText="Accepted formats: JPG, PNG, or WEBP. We will optimize the image for profile use before saving it."
        onSelectFile={handlePassportPhotoUpload}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Profile information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.entityType === "COMPANY" ? (
              <>
                <Field
                  label="Company name"
                  value={profileDraft.organizationName}
                  onChange={(value) => setProfileDraft((current) => ({ ...current, organizationName: value }))}
                />
                <Field
                  label="Registration number"
                  value={profileDraft.registrationNumber}
                  onChange={(value) => setProfileDraft((current) => ({ ...current, registrationNumber: value }))}
                />
              </>
            ) : null}
            {profile.entityType === "COMPANY" ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                This renter profile is set up as a company account, so the company name and registration number should stay current.
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" value={profileDraft.firstName} onChange={(value) => setProfileDraft((current) => ({ ...current, firstName: value }))} />
              <Field label="Last name" value={profileDraft.lastName} onChange={(value) => setProfileDraft((current) => ({ ...current, lastName: value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone" value={profileDraft.phone} onChange={(value) => setProfileDraft((current) => ({ ...current, phone: value }))} />
              <Field label="Email" value={profile.email} onChange={() => {}} readOnly />
            </div>
            <NigeriaAddressFields
              stateValue={profileDraft.state}
              cityValue={profileDraft.city}
              addressValue={profileDraft.address}
              onStateChange={(value) => setProfileDraft((current) => ({ ...current, state: value }))}
              onCityChange={(value) => setProfileDraft((current) => ({ ...current, city: value }))}
              onAddressChange={(value) => setProfileDraft((current) => ({ ...current, address: value }))}
            />
            <div className="space-y-2">
              <Label>Additional information</Label>
              <Textarea
                value={profileDraft.notes}
                onChange={(event) => setProfileDraft((current) => ({ ...current, notes: event.target.value }))}
                className="bg-white"
              />
            </div>
            <Button onClick={() => void submitProfile()} disabled={profileSaving} className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]">
              {profileSaving ? "Saving..." : "Update profile"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Identity validation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <IdentityBlock
                label="NIN"
                value={nin}
                onChange={setNin}
                verifiedAt={profile.ninVerifiedAt}
                loading={identitySaving === "NIN"}
                onVerify={() => void submitIdentity("NIN")}
              />
              <IdentityBlock
                label="BVN"
                value={bvn}
                onChange={setBvn}
                verifiedAt={profile.bvnVerifiedAt}
                loading={identitySaving === "BVN"}
                onVerify={() => void submitIdentity("BVN")}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Profile state</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                Verified public account
              </Badge>
              <InfoTile label="Email" value={profile.email} icon={Mail} />
              <InfoTile label="Phone" value={profile.phone || "-"} icon={Phone} />
              <InfoTile label="Profile created" value={formatDate(profile.createdAt)} icon={ShieldCheck} />
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

function IdentityBlock({
  label,
  value,
  onChange,
  verifiedAt,
  loading,
  onVerify
}: {
  label: "NIN" | "BVN";
  value: string;
  onChange: (value: string) => void;
  verifiedAt?: string | null;
  loading: boolean;
  onVerify: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{label} validation</p>
          <p className="text-sm text-slate-600">
            {verifiedAt ? `Verified on ${formatDate(verifiedAt)}` : `Enter your ${label} and validate it through RentSure.`}
          </p>
        </div>
        {verifiedAt ? (
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Verified</Badge>
        ) : (
          <Badge variant="outline">Pending</Badge>
        )}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={`Enter ${label}`} className="bg-white" />
        <Button variant="outline" onClick={onVerify} disabled={loading || Boolean(verifiedAt)}>
          {verifiedAt ? "Validated" : loading ? "Validating..." : `Validate ${label}`}
        </Button>
      </div>
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
      <div className="mt-3 text-sm font-medium text-slate-950">{value}</div>
    </div>
  );
}
