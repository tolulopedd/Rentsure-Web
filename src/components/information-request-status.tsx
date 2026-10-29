import { Link } from "react-router-dom";
import type { InformationResponse } from "@/lib/additional-information";

export function InformationRequestStatus({ caseId, requestedInformation = [], response, renter = false }: {
  caseId: string; requestedInformation?: string[]; response?: InformationResponse | null; renter?: boolean;
}) {
  const submitted = Boolean(response?.submittedAt);
  return <div className="col-span-full w-full space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-slate-700">
    {!!requestedInformation.length && <p><strong>Requested:</strong> {requestedInformation.join(", ")}.</p>}
    <p>{submitted
      ? renter ? "Your information has been submitted. Your landlord needs to review it and make a decision."
        : "The renter has submitted the requested information. Review the submission before approving or declining."
      : requestedInformation.length
        ? renter ? "Provide the requested information from your Landlord Decision page."
          : "The renter needs to submit the requested information. Their submission will appear on Landlord Decision."
        : renter ? "This is an earlier request. Review the landlord’s note or contact the landlord to clarify what is needed."
          : "This earlier request has no selected information items. Open Landlord Decision to specify what the renter must provide."}</p>
    <Link className="inline-block font-medium text-blue-700 underline" to={`${renter ? "/account/renter/queue" : "/account/decisions"}?caseId=${caseId}`}>
      {submitted ? "Review information" : "View information request"}
    </Link>
  </div>;
}
