import type { Clause, ClauseVersion } from "@/lib/types";

const actor = "user_super_admin";
const createdAt = "2026-01-15T09:00:00.000Z";

type ClauseSeed = {
  clause: Clause;
  version: ClauseVersion;
};

function cv(
  id: string,
  title: string,
  category: string,
  legalText: string,
  extra?: Partial<Clause>,
): ClauseSeed {
  const versionId = `cv_${id}_v1`;
  return {
    clause: {
      id,
      title,
      category,
      description: extra?.description ?? title,
      currentVersionId: versionId,
      currentVersion: 1,
      status: extra?.status ?? "approved",
      tags: extra?.tags ?? [category.toLowerCase()],
      applicableDocumentTypes: extra?.applicableDocumentTypes ?? [
        "employment_standard",
        "employment_appointment_setter",
        "employment_executive",
        "promotion_amended_employment",
      ],
      applicableRoles: extra?.applicableRoles ?? [],
      applicableJurisdictions: extra?.applicableJurisdictions ?? ["Pakistan", "United States"],
      createdBy: actor,
      approvedBy: actor,
      createdAt,
      updatedAt: createdAt,
      effectiveDate: "2026-01-15",
    },
    version: {
      id: versionId,
      clauseId: id,
      version: 1,
      status: "approved",
      legalText,
      createdBy: actor,
      approvedBy: actor,
      createdAt,
      effectiveDate: "2026-01-15",
      changeNotes: "Initial approved wording.",
    },
  };
}

export const CLAUSE_SEEDS: ClauseSeed[] = [
  cv(
    "cl_parties",
    "Parties",
    "Parties",
    `<p>This Agreement is made between <strong>{{company.legalName}}</strong> (the "<strong>Company</strong>"), with its principal place of business at {{company.address}}, and <strong>{{person.fullLegalName}}</strong> (the "<strong>Employee</strong>"), residing at {{address.full}}.</p>
<p>The Company and the Employee are each a "Party" and together the "Parties".</p>`,
  ),
  cv(
    "cl_employee_info",
    "Employee Information",
    "Parties",
    `<p>The Employee represents that the following particulars are true and complete as of the effective date:</p>
<ul>
<li>Legal name: {{person.fullLegalName}}</li>
<li>Email: {{person.email}}</li>
<li>Phone: {{person.phone}}</li>
<li>Employee ID: {{person.employeeId}}</li>
<li>Residential address: {{address.full}}</li>
</ul>
<p>The Employee shall promptly notify the Company of any change to the information listed above.</p>`,
  ),
  cv(
    "cl_position",
    "Position",
    "Role",
    `<p>The Company employs the Employee in the position of <strong>{{jobTitle}}</strong> in the {{department}} department, reporting to {{reportingManager}}.</p>
<p>The Employee's employment shall commence on <strong>{{startDate}}</strong> and shall continue until terminated in accordance with this Agreement.</p>
<p>The Company may reasonably adjust the Employee's duties, title, reporting line, or work location in line with operational needs, provided that such adjustments are consistent with the Employee's skills and seniority.</p>`,
  ),
  cv(
    "cl_responsibilities",
    "Responsibilities",
    "Role",
    `<p>The Employee shall diligently and faithfully perform the duties of {{jobTitle}}, including the following:</p>
{{responsibilities.list}}
<p>The Employee shall comply with all lawful and reasonable directions of the Company and with all applicable policies, as amended from time to time.</p>`,
  ),
  cv(
    "cl_exec_responsibilities",
    "Executive Responsibilities",
    "Role",
    `<p>In addition to ordinary duties, the Employee holds an executive role and shall:</p>
<ul>
<li>Provide strategic leadership consistent with the Company's direction and values;</li>
<li>Safeguard confidential information, client relationships, and operational continuity;</li>
<li>Ensure an orderly handover of responsibilities, access credentials, and outstanding matters upon request or termination;</li>
<li>Act in the best interests of the Company and avoid conflicts of interest.</li>
</ul>`,
    { status: "optional", tags: ["executive"], applicableRoles: ["executive"] },
  ),
  cv(
    "cl_compensation_monthly",
    "Compensation — Standard Monthly Salary",
    "Compensation",
    `<p>The Company shall pay the Employee a gross salary of <strong>{{compensation.display}}</strong>, subject to applicable tax and statutory deductions.</p>
<p>Salary shall be paid {{compensation.salary.paymentTiming}} by electronic transfer to an account nominated by the Employee.</p>
<p>The Company may review compensation from time to time. Any change to compensation shall be recorded in writing and, where it amends this Agreement, documented as an approved amendment.</p>`,
  ),
  cv(
    "cl_bonus_performance",
    "Performance Bonus",
    "Compensation",
    `<p>The Employee may be eligible for a discretionary performance bonus. Any bonus, if awarded, is not guaranteed, does not form part of ordinary salary, and does not create an entitlement in future periods.</p>
<p>Bonus criteria, if any: {{compensation.bonus.description}}</p>`,
    { status: "optional", tags: ["bonus", "performance"] },
  ),
  cv(
    "cl_bonus_fixed",
    "Fixed Bonus",
    "Compensation",
    `<p>Subject to the Employee remaining employed and in good standing on the payment date, the Company shall pay a fixed bonus of <strong>{{compensation.bonus.amount}} {{compensation.salary.currency}}</strong>.</p>
<p>{{compensation.bonus.description}}</p>`,
    { status: "optional", tags: ["bonus", "fixed"] },
  ),
  cv(
    "cl_commission",
    "Commission Compensation",
    "Compensation",
    `<p>In addition to base compensation, the Employee may earn commission in accordance with the following structure:</p>
<p>{{compensation.commission.structure}}</p>
<p>Commission is earned only on amounts actually received by the Company and remains subject to clawback for refunds, chargebacks, or policy breaches.</p>`,
    { status: "optional", tags: ["commission"] },
  ),
  cv(
    "cl_probation_paid",
    "Paid Probation",
    "Probation",
    `<p>The Employee's employment is subject to a paid probationary period of <strong>{{probation.duration}} {{probation.unit}}</strong> commencing on the start date.</p>
<p>During probation, either Party may terminate employment with shorter notice as permitted by applicable law and Company policy. Completion of probation does not limit the Company's rights under the termination provisions of this Agreement.</p>`,
    { tags: ["probation"] },
  ),
  cv(
    "cl_no_probation",
    "No Probation",
    "Probation",
    `<p>The Parties agree that this engagement is not subject to a probationary period. The notice and termination provisions of this Agreement apply from the start date.</p>`,
    { status: "optional" },
  ),
  cv(
    "cl_working_hours",
    "Working Hours",
    "Schedule",
    `<p>The Employee's ordinary working schedule is:</p>
<ul>
<li>Days: as specified in the working schedule</li>
<li>Hours: {{schedule.summary}}</li>
<li>Time zone: {{workingSchedule.timezone}}</li>
</ul>
<p>The Employee may be required to work additional hours reasonably necessary to perform the role. Any urgent-availability requirement will be communicated in writing.</p>`,
  ),
  cv(
    "cl_remote_work",
    "Remote Work",
    "Schedule",
    `<p>The Employee is authorized to perform duties remotely, subject to maintaining reliable connectivity, confidentiality, and availability during agreed working hours.</p>
<p>The Company may require reasonable on-site attendance for training, collaboration, or operational need. Remote work is a working arrangement, not a contractual place of employment, unless expressly agreed in writing.</p>`,
    { status: "optional", tags: ["remote"] },
  ),
  cv(
    "cl_confidentiality_standard",
    "Standard Confidentiality",
    "Confidentiality",
    `<p>The Employee shall keep confidential all non-public information relating to the Company, its clients, campaigns, processes, pricing, personnel, and technology ("Confidential Information").</p>
<p>The Employee shall not use Confidential Information except as required to perform duties, and shall not disclose it to any third party without prior written consent, except as required by law.</p>
<p>These obligations survive termination of employment.</p>`,
  ),
  cv(
    "cl_confidentiality_executive",
    "Enhanced Executive Confidentiality",
    "Confidentiality",
    `<p>Given the Employee's access to strategic, financial, and client information, the Employee owes an enhanced duty of confidentiality. The Employee shall not, during or after employment, copy, retain, or transmit Confidential Information except as expressly authorized for Company business.</p>
<p>Upon request, the Employee shall certify in writing that all Confidential Information has been returned or securely destroyed.</p>`,
    { status: "optional", tags: ["executive", "confidentiality"], applicableRoles: ["executive"] },
  ),
  cv(
    "cl_data_protection",
    "Client Data Protection",
    "Data",
    `<p>The Employee may access personal data and client records solely for authorized work. The Employee shall comply with applicable data protection laws and Company security policies, including access-control, device, and acceptable-use rules.</p>
<p>The Employee shall immediately report any actual or suspected data incident to the Company.</p>`,
  ),
  cv(
    "cl_ip_ownership",
    "Intellectual Property Ownership",
    "IP",
    `<p>All work product, copy, creatives, code, processes, documentation, and other intellectual property created by the Employee in the course of employment, whether during or outside ordinary hours, shall belong exclusively to the Company.</p>
<p>The Employee hereby assigns to the Company all right, title, and interest in such intellectual property and shall execute documents reasonably required to perfect that assignment.</p>`,
  ),
  cv(
    "cl_client_protection",
    "Employee Client Protection",
    "Restrictive",
    `<p>During employment and for <strong>{{clientProtectionMonths}} months</strong> after it ends, the Employee shall not, on their own account or for any other person, solicit, divert, or accept business from clients or prospective clients of the Company with whom the Employee had material dealings in the twelve months before termination, except with prior written consent.</p>
<p>This restriction is intended to protect legitimate client relationships and confidential information, and shall be enforced to the maximum extent permitted by applicable law.</p>`,
  ),
  cv(
    "cl_client_protection_exec",
    "Executive Client Protection",
    "Restrictive",
    `<p>In light of the Employee's seniority, the client-protection restriction shall apply to all Company clients of which the Employee had knowledge, and shall include a prohibition on inducing Company personnel to leave employment during the restricted period.</p>`,
    { status: "optional", tags: ["executive"], applicableRoles: ["executive"] },
  ),
  cv(
    "cl_performance",
    "Performance & Conduct",
    "Conduct",
    `<p>The Employee shall maintain professional conduct, honesty, and a standard of performance consistent with the role. The Company may address performance or conduct issues through coaching, written warning, or, where appropriate, termination in accordance with this Agreement and applicable law.</p>
<p>Serious misconduct, including theft, harassment, data misuse, or conflict of interest, may result in immediate termination.</p>`,
  ),
  cv(
    "cl_termination_notice",
    "30-Day Notice",
    "Termination",
    `<p>After any applicable probation, either Party may terminate this Agreement by giving <strong>{{noticePeriodDays}} days'</strong> written notice, or payment in lieu of notice at the Company's election.</p>
<p>The Company may terminate immediately for serious misconduct, material breach, or other cause permitted by law.</p>`,
  ),
  cv(
    "cl_immediate_termination",
    "Immediate Termination for Serious Misconduct",
    "Termination",
    `<p>Without limiting other rights, the Company may terminate employment without notice if the Employee commits serious misconduct, including but not limited to fraud, unauthorized disclosure of Confidential Information, violence, or willful refusal to perform duties.</p>`,
  ),
  cv(
    "cl_handover",
    "Mandatory Executive Handover",
    "Termination",
    `<p>Upon notice of termination or resignation, the Employee shall complete a documented handover of projects, credentials, client contacts, and outstanding obligations, and shall remain reasonably available during the notice period to ensure operational continuity.</p>`,
    { status: "optional", tags: ["executive"], applicableRoles: ["executive"] },
  ),
  cv(
    "cl_return_property",
    "Return of Company Property",
    "Termination",
    `<p>Upon termination, the Employee shall immediately return all Company property, including devices, access tokens, documents, and copies of Confidential Information, and shall not retain any copy except as required by law.</p>`,
  ),
  cv(
    "cl_jurisdiction_pk",
    "Pakistan Jurisdiction",
    "Jurisdiction",
    `<p>This Agreement is governed by the laws of <strong>Pakistan</strong>. The courts of competent jurisdiction in Pakistan shall have exclusive jurisdiction over disputes arising out of or in connection with this Agreement, without prejudice to the Company's right to seek injunctive relief in any forum.</p>`,
    { applicableJurisdictions: ["Pakistan"] },
  ),
  cv(
    "cl_jurisdiction_us",
    "US State Jurisdiction",
    "Jurisdiction",
    `<p>This Agreement is governed by the laws of the applicable US state identified as the governing jurisdiction, without regard to conflict-of-law rules. Courts located in that jurisdiction shall have exclusive jurisdiction, except that the Company may seek injunctive relief elsewhere.</p>`,
    { status: "optional", applicableJurisdictions: ["United States"] },
  ),
  cv(
    "cl_entire_agreement",
    "Entire Agreement",
    "Boilerplate",
    `<p>This Agreement, including any schedules and approved amendments, constitutes the entire agreement between the Parties and supersedes prior discussions relating to its subject matter. Amendments are valid only if made in a written instrument approved through the Company's contract process.</p>
<p>If any provision is held unenforceable, the remaining provisions continue in full force, and the unenforceable provision shall be modified to the minimum extent required to make it enforceable.</p>`,
  ),
  cv(
    "cl_no_guarantee",
    "No Sales Guarantee",
    "Client",
    `<p>The Company does not guarantee leads, appointments, sales, revenue, or any particular commercial result. Service fees are payable for services rendered, not for outcome. The Client acknowledges that advertising platforms, market conditions, and Client-side conversion factors are outside the Company's control.</p>`,
    {
      applicableDocumentTypes: ["service_agreement", "lead_generation_agreement", "marketing_agreement", "collaboration_agreement"],
    },
  ),
  cv(
    "cl_ad_spend",
    "Advertising Spend Paid Separately",
    "Client",
    `<p>Media or advertising spend is payable by the Client in addition to the Company's service fees, unless expressly stated otherwise in writing. The Company is not obliged to deploy campaigns until agreed ad spend is funded.</p>`,
    {
      applicableDocumentTypes: ["service_agreement", "lead_generation_agreement", "marketing_agreement", "collaboration_agreement"],
    },
  ),
  cv(
    "cl_lead_ownership",
    "Client Owns Generated Leads",
    "Client",
    `<p>Subject to payment of applicable fees, leads generated for the Client under this Agreement are owned by the Client. The Company may retain anonymized performance data for reporting and service improvement.</p>`,
    {
      applicableDocumentTypes: ["lead_generation_agreement", "service_agreement", "collaboration_agreement"],
    },
  ),
  cv(
    "cl_monthly_retainer",
    "Monthly Retainer",
    "Client",
    `<p>The Client shall pay a monthly retainer of <strong>{{serviceFee}} {{feeCurrency}}</strong>, in advance, for the services described in this Agreement. Invoices are due on the terms stated in the commercial schedule. Late amounts may suspend services.</p>`,
    {
      applicableDocumentTypes: ["service_agreement", "lead_generation_agreement", "marketing_agreement", "collaboration_agreement"],
    },
  ),
  cv(
    "cl_fixed_term_service",
    "Fixed-Term Service Agreement",
    "Client",
    `<p>The initial term is <strong>{{termMonths}} months</strong> commencing on {{startDate}}. Thereafter the Agreement continues month-to-month until terminated on thirty (30) days' written notice, unless a renewal agreement is executed.</p>`,
    {
      applicableDocumentTypes: ["service_agreement", "lead_generation_agreement", "collaboration_agreement", "marketing_agreement", "renewal_agreement"],
    },
  ),
  cv(
    "cl_client_parties",
    "Client Parties",
    "Parties",
    `<p>This Agreement is made between <strong>{{company.legalName}}</strong> (the "Company") and <strong>{{client.legalName}}</strong> (the "Client").</p>
<p>Primary Client contact: {{client.primaryContact}} ({{client.email}}).</p>`,
    {
      applicableDocumentTypes: ["service_agreement", "lead_generation_agreement", "collaboration_agreement", "marketing_agreement"],
    },
  ),
  cv(
    "cl_services_scope",
    "Services",
    "Client",
    `<p>The Company shall provide the following services:</p>
{{responsibilities.list}}
<p>Services not listed are out of scope unless added by a written statement of work or amendment.</p>`,
    {
      applicableDocumentTypes: ["service_agreement", "lead_generation_agreement", "collaboration_agreement", "marketing_agreement"],
    },
  ),
  cv(
    "cl_optimization_period",
    "Campaign Optimization Period",
    "Client",
    `<p>The Company shall have a <strong>fourteen (14) day</strong> optimization period from the start date (or from the launch of a new vertical) to test and refine creatives, targeting, and campaign strategy. Performance during this period is diagnostic and shall not, by itself, constitute a failure of the services.</p>`,
    {
      applicableDocumentTypes: ["lead_generation_agreement", "marketing_agreement", "collaboration_agreement"],
    },
  ),
  cv(
    "cl_additional_verticals",
    "Additional Campaign Verticals",
    "Client",
    `<p>Additional campaign verticals or niches may be added at the Client's written request during the term without separate setup fees, unless the new vertical requires materially different infrastructure. Media spend, if any, remains payable by the Client.</p>`,
    {
      applicableDocumentTypes: ["lead_generation_agreement", "marketing_agreement", "collaboration_agreement"],
    },
  ),
  cv(
    "cl_inbound_calls",
    "Inbound Call Generation",
    "Client",
    `<p>Where the commercial schedule specifies inbound calls, the Company will generate and route live calls to the destination provided by the Client. Call quality, talk time, and geography will follow the targeting agreed in writing. The Client is responsible for answering, qualifying, and converting those calls.</p>`,
    {
      status: "optional",
      applicableDocumentTypes: ["lead_generation_agreement", "collaboration_agreement"],
    },
  ),
  cv(
    "cl_collaboration_scope",
    "Collaboration Services",
    "Client",
    `<p>The Company will provide performance-marketing collaboration services for the Client, which may include paid media, landing pages, creatives, campaign optimization, and (where agreed) knowledge sharing on campaign method. The specific channels and offers are those listed below.</p>
{{responsibilities.list}}`,
    {
      applicableDocumentTypes: ["collaboration_agreement"],
    },
  ),
  cv(
    "cl_media_buying_scope",
    "Media Buying Services",
    "Client",
    `<p>The Company is engaged to plan, buy, and optimize paid media on agreed platforms (including Meta), together with related landing pages, tracking, creatives, pacing, and reporting. The Client remains the advertiser of record unless the parties agree otherwise in writing.</p>
{{responsibilities.list}}
<p>Advertising spend is payable by the Client in addition to the Company's service fees and is not a Company cost unless expressly stated.</p>`,
    {
      applicableDocumentTypes: ["marketing_agreement"],
    },
  ),
  cv(
    "cl_amendment_recitals",
    "Amendment Recitals",
    "Amendment",
    `<p>The Parties previously entered into an employment agreement (the "Original Agreement"). The Parties now wish to amend the Original Agreement to reflect an updated role and compensation, while leaving remaining terms in force except as modified herein.</p>
<p>This instrument amends, and does not replace except as stated, the Original Agreement. Capitalized terms have the meaning given in the Original Agreement unless defined here.</p>`,
    {
      applicableDocumentTypes: ["promotion_amended_employment", "employment_amendment", "salary_amendment"],
    },
  ),
];

export function seedClauses(): { clauses: Clause[]; versions: ClauseVersion[] } {
  return {
    clauses: CLAUSE_SEEDS.map((item) => item.clause),
    versions: CLAUSE_SEEDS.map((item) => item.version),
  };
}
