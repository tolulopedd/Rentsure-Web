import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, CheckCircle2, Mail, Phone, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapboxAddressFields } from "@/components/MapboxAddressFields";
import { PassportPhotoCard } from "@/components/PassportPhotoCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRenterWorkspace } from "@/lib/renter-workspace-context";
import { getErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/renter-workspace-presenters";
import { getRenterOnboarding } from "@/lib/onboarding";
import { isValidNigeriaPhone, nigeriaPhoneMessage } from "@/lib/phone";
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
    residenceMoveCount5y: "",
    employmentType: "",
    employmentYears: "",
    notes: ""
  });
  const [nin, setNin] = useState("");
  const [bvn, setBvn] = useState("");
  const [selectedIdentityType, setSelectedIdentityType] = useState<"NIN" | "BVN">("NIN");
  const [profileSaving, setProfileSaving] = useState(false);
  const [identitySaving, setIdentitySaving] = useState<"NIN" | "BVN" | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);

  useEffect(() => {
    if (!data) return;
    if (profileDirty) {
      setNin(data.profile.identityVerificationType === "NIN" && data.profile.identityReviewStatus !== "APPROVED" ? data.profile.nin || "" : "");
      setBvn(data.profile.identityVerificationType === "BVN" && data.profile.identityReviewStatus !== "APPROVED" ? data.profile.bvn || "" : "");
      return;
    }
    setProfileDraft({
      organizationName: data.profile.organizationName || "",
      registrationNumber: data.profile.registrationNumber || "",
      firstName: data.profile.firstName || "",
      lastName: data.profile.lastName || "",
      phone: data.profile.phone || "",
      state: data.profile.state || "",
      city: data.profile.city || "",
      address: data.profile.address || "",
      residenceMoveCount5y: data.profile.residenceMoveCount5y == null ? "" : String(Math.min(5, data.profile.residenceMoveCount5y)),
      employmentType: data.profile.employmentType || "",
      employmentYears: data.profile.employmentYears == null ? "" : String(Math.min(5, data.profile.employmentYears)),
      notes: data.profile.notes || ""
    });
    setNin(data.profile.identityVerificationType === "NIN" && data.profile.identityReviewStatus !== "APPROVED" ? data.profile.nin || "" : "");
    setBvn(data.profile.identityVerificationType === "BVN" && data.profile.identityReviewStatus !== "APPROVED" ? data.profile.bvn || "" : "");
    setSelectedIdentityType((data.profile.identityVerificationType as "NIN" | "BVN" | null) || "NIN");
  }, [data, profileDirty]);

  if (!data) return null;
  const profile = data.profile;
  const organizationName = profile.organizationName;
  const phoneError = profileDraft.phone.trim() && !isValidNigeriaPhone(profileDraft.phone) ? nigeriaPhoneMessage() : "";
  const approvedIdentityType = profile.identityReviewStatus === "APPROVED" ? profile.identityVerificationType ?? null : null;
  const activeIdentityType = (approvedIdentityType ?? profile.identityVerificationType ?? selectedIdentityType) as "NIN" | "BVN";
  const onboarding = useMemo(() => getRenterOnboarding(profile), [profile]);
  const showOnboarding = searchParams.get("onboarding") === "1" || !onboarding.isComplete;

  async function submitProfile() {
    if (!isValidNigeriaPhone(profileDraft.phone)) {
      toast.error(nigeriaPhoneMessage());
      return;
    }
    setProfileSaving(true);
    const success = await saveProfile({
      organizationName: profile.entityType === "COMPANY" ? profileDraft.organizationName : null,
      registrationNumber: profile.entityType === "COMPANY" ? profileDraft.registrationNumber : null,
      firstName: profileDraft.firstName,
      lastName: profileDraft.lastName,
      phone: profileDraft.phone,
      state: profileDraft.state,
      city: profileDraft.city,
      address: profileDraft.address,
      residenceMoveCount5y: profileDraft.residenceMoveCount5y ? Number(profileDraft.residenceMoveCount5y) : null,
      employmentType: profileDraft.employmentType ? (profileDraft.employmentType as "EMPLOYED" | "SELF_EMPLOYED") : null,
      employmentYears: profileDraft.employmentYears ? Number(profileDraft.employmentYears) : null,
      notes: profileDraft.notes || null
    });
    if (success) {
      setProfileDirty(false);
    }
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
          Manage your profile and identity.
        </p>
      </div>

      {showOnboarding ? (
        <Card className="border-[var(--rentsure-blue-soft)] bg-[linear-gradient(135deg,#ffffff,#f5f8ff)] shadow-sm">
          <CardHeader className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rentsure-blue)]">
              {onboarding.isComplete ? "Ready to go" : "Renter onboarding"}
            </div>
            <CardTitle className="text-xl">
              {onboarding.isComplete ? "Profile complete" : "Complete your profile"}
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
        description="Add a profile photo."
        helperText="JPG, PNG, or WEBP."
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
                  onChange={(value) => {
                    setProfileDirty(true);
                    setProfileDraft((current) => ({ ...current, organizationName: value }));
                  }}
                />
                <Field
                  label="Registration number"
                  value={profileDraft.registrationNumber}
                  onChange={(value) => {
                    setProfileDirty(true);
                    setProfileDraft((current) => ({ ...current, registrationNumber: value }));
                  }}
                />
              </>
            ) : null}
            {profile.entityType === "COMPANY" ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Keep company details current.
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="First name"
                value={profileDraft.firstName}
                onChange={(value) => {
                  setProfileDirty(true);
                  setProfileDraft((current) => ({ ...current, firstName: value }));
                }}
              />
              <Field
                label="Last name"
                value={profileDraft.lastName}
                onChange={(value) => {
                  setProfileDirty(true);
                  setProfileDraft((current) => ({ ...current, lastName: value }));
                }}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Phone"
                value={profileDraft.phone}
                onChange={(value) => {
                  setProfileDirty(true);
                  setProfileDraft((current) => ({ ...current, phone: value }));
                }}
                helperText="Use 11 digits starting with 0, or +234 followed by 10 digits."
                errorMessage={phoneError}
              />
              <Field label="Email" value={profile.email} onChange={() => {}} readOnly />
            </div>
            <MapboxAddressFields
              stateValue={profileDraft.state}
              cityValue={profileDraft.city}
              addressValue={profileDraft.address}
              onStateChange={(value) => {
                setProfileDirty(true);
                setProfileDraft((current) => ({ ...current, state: value }));
              }}
              onCityChange={(value) => {
                setProfileDirty(true);
                setProfileDraft((current) => ({ ...current, city: value }));
              }}
              onAddressChange={(value) => {
                setProfileDirty(true);
                setProfileDraft((current) => ({ ...current, address: value }));
              }}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Moves in last 5 years"
                value={profileDraft.residenceMoveCount5y}
                placeholder="Select movement count"
                options={[
                  { value: "1", label: "1 move" },
                  { value: "2", label: "2 moves" },
                  { value: "3", label: "3 or more moves" }
                ]}
                onChange={(value) => {
                  setProfileDirty(true);
                  setProfileDraft((current) => ({ ...current, residenceMoveCount5y: value }));
                }}
              />
              <SelectField
                label="Employment type"
                value={profileDraft.employmentType}
                placeholder="Select employment type"
                options={[
                  { value: "EMPLOYED", label: "Employed" },
                  { value: "SELF_EMPLOYED", label: "Self employed" }
                ]}
                onChange={(value) => {
                  setProfileDirty(true);
                  setProfileDraft((current) => ({ ...current, employmentType: value, employmentYears: "" }));
                }}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label={profileDraft.employmentType === "SELF_EMPLOYED" ? "Years self employed" : "Years employed"}
                value={profileDraft.employmentYears}
                placeholder="Select number of years"
                options={[
                  { value: "1", label: "1 year" },
                  { value: "2", label: "2 years" },
                  { value: "3", label: "3 years" },
                  { value: "4", label: "4 years" },
                  { value: "5", label: "5+ years" }
                ]}
                onChange={(value) => {
                  setProfileDirty(true);
                  setProfileDraft((current) => ({ ...current, employmentYears: value }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Additional information</Label>
              <Textarea
                value={profileDraft.notes}
                onChange={(event) => {
                  setProfileDirty(true);
                  setProfileDraft((current) => ({ ...current, notes: event.target.value }));
                }}
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
              {!approvedIdentityType ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {(["NIN", "BVN"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSelectedIdentityType(item)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        activeIdentityType === item
                          ? "border-[var(--rentsure-blue)] bg-[var(--rentsure-blue-soft)] text-[var(--rentsure-blue)]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <div className="font-semibold">{item}</div>
                      <div className="mt-1 text-xs text-current/80">Submit your {item} for review.</div>
                    </button>
                  ))}
                </div>
              ) : null}
              <IdentityBlock
                label={activeIdentityType}
                value={activeIdentityType === "NIN" ? nin : bvn}
                onChange={activeIdentityType === "NIN" ? setNin : setBvn}
                reviewStatus={profile.identityReviewStatus || "NOT_SUBMITTED"}
                submittedAt={profile.identitySubmittedAt}
                reviewedAt={profile.identityReviewedAt}
                reviewComment={profile.identityReviewComment}
                loading={identitySaving === activeIdentityType}
                onSubmit={() => void submitIdentity(activeIdentityType)}
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
  readOnly,
  helperText,
  errorMessage
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  helperText?: string;
  errorMessage?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
        className={`bg-white ${errorMessage ? "border-rose-300 focus-visible:ring-rose-200" : ""}`}
      />
      {errorMessage ? <p className="text-xs text-rose-600">{errorMessage}</p> : helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-white">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function IdentityBlock({
  label,
  value,
  onChange,
  reviewStatus,
  submittedAt,
  reviewedAt,
  reviewComment,
  loading,
  onSubmit
}: {
  label: "NIN" | "BVN";
  value: string;
  onChange: (value: string) => void;
  reviewStatus: "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "FAILED";
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewComment?: string | null;
  loading: boolean;
  onSubmit: () => void;
}) {
  const isApproved = reviewStatus === "APPROVED";
  const isPending = reviewStatus === "PENDING";
  const isFailed = reviewStatus === "FAILED";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{label} validation</p>
          <p className="text-sm text-slate-600">
            {isApproved
              ? `Approved on ${formatDate(reviewedAt)}`
              : isPending
                ? `Submitted on ${formatDate(submittedAt)} and awaiting admin review.`
                : isFailed
                  ? "Update the information below and submit it again for review."
                  : `Enter your ${label} and submit it for review.`}
          </p>
        </div>
        {isApproved ? (
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Verified</Badge>
        ) : isPending ? (
          <Badge variant="outline">Pending review</Badge>
        ) : isFailed ? (
          <Badge className="border-rose-200 bg-rose-50 text-rose-700">Update needed</Badge>
        ) : (
          <Badge variant="outline">Not submitted</Badge>
        )}
      </div>
      {isApproved ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Your {label} has been approved and stored securely. It is no longer shown here.
        </div>
      ) : isPending ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Your submission is with RentSure for review. You will receive a notification when it has been approved or if it needs changes.
        </div>
      ) : (
        <>
          {isFailed && reviewComment ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {reviewComment}
            </div>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={`Enter ${label}`} className="bg-white" />
            <Button variant="outline" onClick={onSubmit} disabled={loading}>
              {loading ? "Submitting..." : `Submit ${label}`}
            </Button>
          </div>
        </>
      )}
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

