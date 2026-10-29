import type { QueueDetail } from "@/lib/public-workspace-api";
import { applicationDecisionLabel } from "@/lib/additional-information";
import { propertyDisplayName, propertyUnitDisplayName, occupancyLabel } from "@/lib/property-display";
import { rentScoreBandLabel } from "@/lib/rent-score-band";
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const formatDate = (value: string) => new Date(value).toLocaleDateString();
const formatNgn = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
const renterName = (item: QueueDetail) => item.organizationName?.trim() || [item.firstName, item.lastName].filter(Boolean).join(" ");
const decisionLabel = applicationDecisionLabel;
export function createRentScoreReport(detail: QueueDetail) {
  if (!detail.linkedRentScoreReport) return null;
    const renter = renterName(detail);
    const currentDecisionLabel = applicationDecisionLabel(detail.decision?.decision, detail.additionalInformationResponse, detail.requestedInformation);
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>RentSure Report - ${escapeHtml(renter)}</title>
          <style>
            * { box-sizing: border-box; } body { font-family: Arial, sans-serif; margin: 0; background: #f1f5fb; color: #14213b; line-height: 1.55; }
            .report { max-width: 1050px; margin: 24px auto; background: #fff; padding: 36px; border: 1px solid #e2e8f0; border-radius: 20px; }
            .brand { display:flex; justify-content:space-between; align-items:center; gap:20px; padding-bottom:24px; border-bottom:2px solid #1200ff; }
            .logo { display:flex; align-items:center; gap:12px; } .wordmark { font-size:32px; font-weight:900; letter-spacing:-2px; line-height:1; } .wordmark span { color:#1200ff; }
            .tagline { color:#64748b; font-size:10px; letter-spacing:0; margin-top:5px; } .eyebrow { text-transform:uppercase; color:#64748b; font-size:11px; letter-spacing:2px; }
            h1 { font-size:30px; margin:8px 0; letter-spacing:-1px; } h2,h3 { margin:0 0 12px; font-size:18px; } p { margin:8px 0; overflow-wrap:anywhere; }
            .hero { padding:24px; margin-top:24px; border:1px solid #dce3ff; border-radius:16px; background:linear-gradient(135deg,#f9faff,#edf3ff); }
            .hero p { font-size:14px; } .score-banner { display:flex; flex-wrap:wrap; gap:24px; align-items:center; background:#1200ff; color:#fff; border-radius:16px; padding:24px; margin-top:24px; }
            .score-number { font-size:52px; font-weight:800; line-height:1.1; } .score-number small { font-size:18px; font-weight:400; color:#d8ddff; } .score-band { border:1px solid #9289ff; border-radius:100px; padding:6px 14px; font-weight:700; }
            .meta { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; margin-top:20px; } .card { border:1px solid #e2e8f0; border-radius:14px; padding:20px; font-size:14px; }
            .section { margin-top:28px; } .table-wrap { overflow-x:auto; } table { width:100%; border-collapse:collapse; margin-top:8px; }
            th,td { border-bottom:1px solid #e2e8f0; padding:12px; text-align:left; font-size:13px; } th { background:#f5f7ff; color:#475569; } tbody tr:nth-child(even) { background:#fafbfe; }
            td:not(:first-child),th:not(:first-child) { text-align:right; } ul { padding-left:18px; } li { padding:6px 0; }
            footer { border-top:1px solid #e2e8f0; margin-top:32px; padding-top:16px; font-size:11px; color:#64748b; }
            @media(max-width:600px) { .report { margin:0; padding:18px; border:0; border-radius:0; } .brand { flex-wrap:wrap; } .meta { grid-template-columns:1fr; } .hero { padding:18px; } th,td { padding:8px; } h1 { font-size:25px; } }
            @media print { body { background:#fff; } .report { margin:0; border:0; padding:0; } .card,.score-banner { break-inside:avoid; } thead { display:table-header-group; } tr { break-inside:avoid; } }
          </style>
        </head>
        <body><main class="report">
          <header class="brand">
            <div class="logo" aria-label="RentSure">
              <svg width="44" height="44" viewBox="0 0 44 44" role="img" aria-label="RentSure logo"><rect width="18" height="44" rx="9" fill="#1200ff"/><rect x="24" width="20" height="20" rx="10" fill="#020617"/><rect x="24" y="26" width="20" height="18" rx="9" fill="#cbd5e1"/></svg>
              <div><div class="wordmark"><span>Rent</span>Sure</div><div class="tagline">landlord and tenant relationship</div></div>
            </div>
            <div class="eyebrow">RentScore · Renter assessment</div>
          </header>
          <div class="hero">
            <div class="eyebrow">Rental application report</div><h1>RentScore Report</h1>
            <p><strong>Proposed renter:</strong> ${escapeHtml(renter)}</p>
            <p><strong>Property:</strong> ${escapeHtml(propertyDisplayName(detail.property))}</p>
            <p><strong>Unit:</strong> ${escapeHtml(
              detail.propertyUnit
                ? `${propertyUnitDisplayName(detail.propertyUnit)} · ${occupancyLabel(detail.propertyUnit.isOccupied)}`
                : propertyUnitDisplayName(detail.propertyUnit)
            )}</p>
            <p><strong>Property address:</strong> ${escapeHtml(detail.property.address)}, ${escapeHtml(detail.property.city)}, ${escapeHtml(detail.property.state)}</p>
            <p><strong>Landlord decision:</strong> ${escapeHtml(currentDecisionLabel)}</p>
          </div>
          <section class="score-banner" aria-label="RentScore overview">
            <div><div>RentScore</div><div class="score-number">${detail.linkedRentScoreReport.summary.score} <small>/ ${detail.linkedRentScoreReport.summary.maxScore}</small></div></div>
            <div class="score-band">${escapeHtml(rentScoreBandLabel(detail.linkedRentScoreReport.summary.scoreBand))}</div>
            <div>Positive points: <strong>${detail.linkedRentScoreReport.summary.positivePoints}</strong><br/>Negative points: <strong>${detail.linkedRentScoreReport.summary.negativePoints}</strong></div>
          </section>
          <div class="meta">
            <div class="card">
              <h3>Renter details</h3>
              <p><strong>Email:</strong> ${escapeHtml(detail.email)}</p>
              <p><strong>Phone:</strong> ${escapeHtml(detail.phone)}</p>
              <p><strong>Address:</strong> ${escapeHtml(detail.address || "Profile information pending")}</p>
            </div>
            <div class="card">
              <h3>Decision details</h3>
            <p><strong>Status:</strong> ${escapeHtml(decisionLabel(detail.status))}</p>
              <p><strong>Decision note:</strong> ${escapeHtml(detail.decision?.note || "No note added")}</p>
              <p><strong>Generated:</strong> ${escapeHtml(new Date().toLocaleString())}</p>
            </div>
          </div>
          <div class="section"><p><strong>Scoring policy:</strong> ${escapeHtml(detail.linkedRentScoreReport.policy.name)}</p></div>
          <div class="section">
            <h3>Rule Breakdown</h3>
            <div class="table-wrap"><table>
              <thead>
                <tr><th>Rule</th><th>Points</th><th>Applied</th><th>Contribution</th></tr>
              </thead>
              <tbody>
                ${detail.linkedRentScoreReport.breakdown
                  .map(
                    (item) => `
                      <tr>
                        <td>${escapeHtml(item.name)}</td>
                        <td>${item.points}</td>
                        <td>${item.appliedOccurrences}</td>
                        <td>${item.contribution}</td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table></div>
          </div>
          <div class="section">
            <h3>Payment schedules</h3>
            ${
              detail.paymentSchedules.length
                ? `<ul>${detail.paymentSchedules
                    .map(
                      (schedule) =>
                        `<li>${escapeHtml(schedule.paymentType.replaceAll("_", " "))}: ${escapeHtml(formatNgn(schedule.amountNgn))} due ${escapeHtml(
                          formatDate(schedule.dueDate)
                        )} (${escapeHtml(schedule.status)})</li>`
                    )
                    .join("")}</ul>`
                : "<p>No payment schedules have been logged yet.</p>"
            }
          </div>
        <footer aria-label="Report disclaimer"><strong>Disclaimer</strong><br/>RentSure · RentScore report<br/>Generated for this rental application using the information available at the time of viewing.</footer></main></body>
      </html>
    `;


  return { html, fileName: renter.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-rentsure-report.html" };
}
