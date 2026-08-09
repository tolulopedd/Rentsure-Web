type StepStatus = {
  id: string;
  title: string;
  description: string;
  done: boolean;
  href: string;
  actionLabel: string;
};

export function getRenterOnboarding(profile: {
  entityType: "INDIVIDUAL" | "COMPANY";
  organizationName?: string | null;
  registrationNumber?: string | null;
  phone?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  identityReviewStatus?: "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "FAILED";
  ninVerifiedAt?: string | null;
  bvnVerifiedAt?: string | null;
  passportPhoto?: { id: string } | null;
}) {
  const steps: StepStatus[] = [
    {
      id: "profile",
      title: "Complete your contact details",
      description: "Add your phone number, state, city or town, and full address.",
      done: Boolean(profile.phone && profile.state && profile.city && profile.address),
      href: "/account/renter/profile",
      actionLabel: "Update profile"
    },
    {
      id: "identity",
      title: "Submit identity for review",
      description: "Submit your NIN or BVN so RentSure can review and approve it.",
      done: profile.identityReviewStatus === "APPROVED",
      href: "/account/renter/profile",
      actionLabel: "Submit identity"
    },
    {
      id: "photo",
      title: "Upload passport picture",
      description: "Make it easier for landlords and agents to identify your profile.",
      done: Boolean(profile.passportPhoto?.id),
      href: "/account/renter/profile",
      actionLabel: "Upload picture"
    }
  ];

  if (profile.entityType === "COMPANY") {
    steps.splice(1, 0, {
      id: "company",
      title: "Add company details",
      description: "Provide the company name and registration number for this renter profile.",
      done: Boolean(profile.organizationName && profile.registrationNumber),
      href: "/account/renter/profile",
      actionLabel: "Add company details"
    });
  }

  const completedCount = steps.filter((item) => item.done).length;

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    isComplete: completedCount === steps.length,
    nextStep: steps.find((item) => !item.done) || null
  };
}

export function getWorkspaceOnboarding(input: {
  accountType: "LANDLORD" | "AGENT";
  entityType: "INDIVIDUAL" | "COMPANY";
  representation?: string | null;
  organizationName?: string | null;
  registrationNumber?: string | null;
  phone?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  passportPhoto?: { id: string } | null;
  propertyCount?: number;
}) {
  const steps: StepStatus[] = [
    {
      id: "role",
      title: input.accountType === "LANDLORD" ? "Confirm your landlord setup" : "Confirm your agent setup",
      description:
        input.accountType === "LANDLORD"
          ? "Set how this landlord profile operates on RentSure."
          : "Set how this agent profile operates on RentSure.",
      done: Boolean(input.representation),
      href: "/account/profile?onboarding=1",
      actionLabel: "Confirm setup"
    },
    {
      id: "contact",
      title: "Complete your contact details",
      description: "Add your phone number, state, city or town, and full address.",
      done: Boolean(input.phone && input.state && input.city && input.address),
      href: "/account/profile?onboarding=1",
      actionLabel: "Update profile"
    },
    {
      id: "photo",
      title: "Upload passport picture",
      description: "Make this landlord or agent profile easier for renters and reviewers to identify.",
      done: Boolean(input.passportPhoto?.id),
      href: "/account/profile?onboarding=1",
      actionLabel: "Upload picture"
    }
  ];

  if (input.accountType === "LANDLORD") {
    steps.push({
      id: "property",
      title: "Add your first property",
      description: "Link at least one property before creating renter records.",
      done: Boolean((input.propertyCount || 0) > 0),
      href: "/account/properties",
      actionLabel: "Add property"
    });
  }

  if (input.entityType === "COMPANY") {
    steps.splice(2, 0, {
      id: "company",
      title: "Add company details",
      description: "Provide the company name and registration number for this workspace.",
      done: Boolean(input.organizationName && input.registrationNumber),
      href: "/account/profile?onboarding=1",
      actionLabel: "Add company details"
    });
  }

  const completedCount = steps.filter((item) => item.done).length;

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    isComplete: completedCount === steps.length,
    nextStep: steps.find((item) => !item.done) || null
  };
}
