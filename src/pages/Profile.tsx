import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, ShieldCheck, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";
import {
  changeStaffPassword,
  getStaffProfile,
  updateStaffProfile,
  updateStoredUserIdentity,
  type StaffProfileResponse
} from "@/lib/api";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function passwordChecks(value: string) {
  return [
    { label: "10+ chars", met: value.length >= 10 },
    { label: "Uppercase", met: /[A-Z]/.test(value) },
    { label: "Lowercase", met: /[a-z]/.test(value) },
    { label: "Number", met: /\d/.test(value) },
    { label: "Special", met: /[^A-Za-z0-9]/.test(value) }
  ];
}

function strongPasswordError(value: string) {
  if (value.length < 10) return "New password must be at least 10 characters.";
  if (!/[A-Z]/.test(value)) return "New password must include at least one uppercase letter.";
  if (!/[a-z]/.test(value)) return "New password must include at least one lowercase letter.";
  if (!/\d/.test(value)) return "New password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(value)) return "New password must include at least one special character.";
  return null;
}

export default function Profile() {
  const [profile, setProfile] = useState<StaffProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    fullName: "",
    email: "",
    locationLabel: ""
  });
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const passwordRequirementState = useMemo(() => passwordChecks(passwordDraft.newPassword), [passwordDraft.newPassword]);

  async function loadProfile() {
    try {
      setLoading(true);
      setError(null);
      const response = await getStaffProfile();
      setProfile(response);
      setProfileDraft({
        fullName: response.fullName,
        email: response.email,
        locationLabel: response.locationLabel || ""
      });
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, "Failed to load admin profile"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function saveProfile() {
    if (!profileDraft.fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!profileDraft.email.trim()) {
      toast.error("Email is required");
      return;
    }

    try {
      setSavingProfile(true);
      const response = await updateStaffProfile({
        fullName: profileDraft.fullName.trim(),
        email: profileDraft.email.trim(),
        locationLabel: profileDraft.locationLabel.trim() || null
      });
      setProfile(response);
      setProfileDraft({
        fullName: response.fullName,
        email: response.email,
        locationLabel: response.locationLabel || ""
      });
      updateStoredUserIdentity({
        fullName: response.fullName,
        email: response.email
      });
      toast.success("Profile updated");
    } catch (saveError: unknown) {
      toast.error(getErrorMessage(saveError, "Failed to update profile"));
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    if (!passwordDraft.currentPassword) {
      toast.error("Current password is required");
      return;
    }
    const passwordError = strongPasswordError(passwordDraft.newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    try {
      setChangingPassword(true);
      await changeStaffPassword({
        currentPassword: passwordDraft.currentPassword,
        newPassword: passwordDraft.newPassword
      });
      setPasswordDraft({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      toast.success("Password changed");
    } catch (changeError: unknown) {
      toast.error(getErrorMessage(changeError, "Failed to change password"));
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading profile...</div>;
  }

  if (error) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 text-center">
          <p className="font-semibold text-slate-950">Profile unavailable</p>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-4 bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]" onClick={() => void loadProfile()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">My Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Update your admin identity details and keep your account secure.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCircle2 className="h-5 w-5 text-[var(--rentsure-blue)]" />
              Basic information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={profileDraft.fullName}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, fullName: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileDraft.email}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationLabel">Location label</Label>
              <Input
                id="locationLabel"
                placeholder="Nigeria RentSure Operations"
                value={profileDraft.locationLabel}
                onChange={(event) => setProfileDraft((current) => ({ ...current, locationLabel: event.target.value }))}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-950">Role:</span> {profile?.role || "-"}</p>
              <p className="mt-1"><span className="font-semibold text-slate-950">Status:</span> {profile?.status || "-"}</p>
              <p className="mt-1"><span className="font-semibold text-slate-950">Created:</span> {formatDate(profile?.createdAt)}</p>
              <p className="mt-1"><span className="font-semibold text-slate-950">Last updated:</span> {formatDate(profile?.updatedAt)}</p>
            </div>

            <Button className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]" disabled={savingProfile} onClick={() => void saveProfile()}>
              {savingProfile ? "Saving..." : "Save profile"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-[var(--rentsure-blue)]" />
              Change password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordDraft.currentPassword}
                  onChange={(event) => setPasswordDraft((current) => ({ ...current, currentPassword: event.target.value }))}
                  className="pr-11"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-3 inline-flex items-center text-slate-400 hover:text-slate-600"
                  onClick={() => setShowCurrentPassword((current) => !current)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordDraft.newPassword}
                  onChange={(event) => setPasswordDraft((current) => ({ ...current, newPassword: event.target.value }))}
                  className="pr-11"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-3 inline-flex items-center text-slate-400 hover:text-slate-600"
                  onClick={() => setShowNewPassword((current) => !current)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {passwordRequirementState.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    item.met ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  {item.label}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type={showNewPassword ? "text" : "password"}
                value={passwordDraft.confirmPassword}
                onChange={(event) => setPasswordDraft((current) => ({ ...current, confirmPassword: event.target.value }))}
              />
            </div>

            <Button className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]" disabled={changingPassword} onClick={() => void savePassword()}>
              {changingPassword ? "Updating..." : "Change password"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
