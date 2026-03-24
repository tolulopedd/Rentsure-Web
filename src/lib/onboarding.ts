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
      title: "Validate your identity",
      description: "Verify your NIN or BVN so your rent score can move with confidence.",
      done: Boolean(profile.ninVerifiedAt || profile.bvnVerifiedAt),
      href: "/account/renter/profile",
      actionLabel: "Validate identity"
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
      title: "Confirm your landlord or agent setup",
      description: "Choose how this profile operates on RentSure before you start working with renters.",
      done: Boolean(input.representation),
      href: "/account/profile?onboarding=1",
      actionLabel: "Confirm role"
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
    },
    {
      id: "property",
      title: "Add your first property",
      description: "Link at least one property before creating proposed renter records.",
      done: Boolean((input.propertyCount || 0) > 0),
      href: "/account/properties",
      actionLabel: "Add property"
    }
  ];

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
