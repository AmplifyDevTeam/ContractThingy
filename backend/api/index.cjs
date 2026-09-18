"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lib/config.ts
function isFirebaseConfigured() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
  );
}
function useLocalAdapter() {
  if (process.env.DATA_ADAPTER === "local") return true;
  if (process.env.DATA_ADAPTER === "firestore") return false;
  return !isFirebaseConfigured();
}
function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production.");
  }
  return "amplify-contractos-local-dev-secret";
}
function appUrl() {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
function isLoopbackHost(hostname) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}
function isLoopbackUrl(value) {
  try {
    return isLoopbackHost(new URL(value.includes("://") ? value : `http://${value}`).hostname);
  } catch {
    return false;
  }
}
function resolveAppUrl(requestHost, requestProto) {
  const fallback = appUrl();
  if (!requestHost) return fallback;
  const proto = requestProto ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const fromRequest = `${proto}://${requestHost}`.replace(/\/$/, "");
  if (!isLoopbackUrl(fromRequest)) return fromRequest;
  if (!isLoopbackUrl(fallback)) return fallback;
  return fromRequest;
}
async function requestAppUrl() {
  return resolveAppUrl();
}
function dataDir() {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  const cwd = process.cwd();
  if (cwd.endsWith("/backend") || cwd.endsWith("\\backend")) {
    return `${cwd}/../.data`;
  }
  return `${cwd}/.data`;
}
function geminiEnabled() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}
function corsOrigins() {
  const raw = process.env.CORS_ORIGINS ?? process.env.APP_URL ?? "http://localhost:3000";
  return raw.split(",").map((item) => item.trim().replace(/\/$/, "")).filter(Boolean);
}
var DEFAULT_ORG_ID;
var init_config = __esm({
  "src/lib/config.ts"() {
    "use strict";
    DEFAULT_ORG_ID = "amplify-media-technologies";
  }
});

// src/lib/seed/clients.ts
function address(line1, city, state, postalCode, country) {
  return { line1, line2: "", city, state, postalCode, country };
}
function company(input) {
  const addr2 = address(input.line1 ?? "", input.city, input.state, input.postalCode ?? "", input.country);
  return {
    id: input.id,
    legalName: input.legalName,
    displayName: input.displayName,
    companyType: input.companyType ?? "LLC",
    primaryContact: input.primaryContact,
    contactTitle: input.contactTitle ?? "",
    email: input.email,
    phone: input.phone ?? "",
    website: input.website ?? "",
    billingAddress: addr2,
    businessAddress: addr2,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode ?? "",
    country: input.country,
    jurisdiction: input.jurisdiction ?? `${input.state}, ${input.country}`,
    relationshipStatus: "active",
    notes: input.notes,
    createdAt,
    updatedAt: createdAt,
    createdBy: actor
  };
}
function source(id, fileName, detectedType, companyId, uploadedAt, knowledge) {
  return {
    id,
    fileName,
    contentType: "application/pdf",
    storagePath: `${ATTACH}/${fileName}`,
    uploadedAt,
    uploadedBy: actor,
    analysisStatus: "ANALYZED",
    knowledgeStatus: "approved",
    detectedType,
    analysisJson: { companyId, family: "CLIENT", ...knowledge },
    analysisConfidence: 0.94
  };
}
var createdAt, actor, CLIENT_COMPANIES, ATTACH, lg, col, media, service, CLIENT_SOURCE_DOCUMENTS, CLIENT_KNOWLEDGE_FINDINGS;
var init_clients = __esm({
  "src/lib/seed/clients.ts"() {
    "use strict";
    createdAt = "2026-01-15T09:00:00.000Z";
    actor = "user_super_admin";
    CLIENT_COMPANIES = [
      company({
        id: "co_prime_medical",
        legalName: "Prime Medical Outlet LLC",
        displayName: "Prime Medical Outlet",
        primaryContact: "Zaveen Tatari",
        email: "info@primedicaloutlet.com",
        line1: "1005 S Muskogee Ave",
        city: "Tahlequah",
        state: "OK",
        postalCode: "74464",
        country: "United States",
        notes: "Lead generation \u2014 Final Expense and DME. Agreement dated 20 Jun 2025."
      }),
      company({
        id: "co_atleads",
        legalName: "Atleads LLC",
        displayName: "Atleads",
        primaryContact: "Anthony Ferlanti",
        contactTitle: "Contact",
        email: "anthony@atleads.com",
        website: "https://www.atleads.com",
        line1: "7777 Glades Rd",
        city: "Boca Raton",
        state: "FL",
        postalCode: "33434",
        country: "United States",
        notes: "Lead generation for affiliate offers. Agreement dated 3 Dec 2024."
      }),
      company({
        id: "co_anchor_line",
        legalName: "Anchor Line Insurance",
        displayName: "Anchor Line Insurance",
        companyType: "Agency",
        primaryContact: "Anchor Line Insurance",
        email: "info@anchorlineinsurance.test",
        line1: "3423 Chiquita Blvd",
        city: "Cape Coral",
        state: "FL",
        postalCode: "33914",
        country: "United States",
        notes: "Collaboration \u2014 inbound auto insurance calls. Agreement dated 11 Jan 2026."
      }),
      company({
        id: "co_launch_forward",
        legalName: "Launch Forward",
        displayName: "Launch Forward",
        companyType: "Affiliate",
        primaryContact: "Rocky Manrique",
        contactTitle: "Owner",
        email: "rocky@launchforward.test",
        city: "Columbus",
        state: "OH",
        country: "United States",
        notes: "Collaboration \u2014 MVA leads. Agreement dated 27 Mar 2025."
      }),
      company({
        id: "co_rf_insurance",
        legalName: "RF Insurance Agency",
        displayName: "RF Insurance Agency",
        companyType: "Agency",
        primaryContact: "Renzo Figueroa",
        contactTitle: "Owner",
        email: "renzofigueroa1987@gmail.com",
        city: "",
        state: "",
        country: "United States",
        jurisdiction: "United States",
        notes: "Collaboration \u2014 insurance leads. Agreement dated 2 May 2025."
      }),
      company({
        id: "co_poshnee",
        legalName: "Poshnee Tech (SMC-Private) Limited",
        displayName: "Poshnee Tech",
        companyType: "SMC-Private Limited",
        primaryContact: "Awais Anwer Khawaja",
        contactTitle: "Owner",
        email: "awais@poshnee.test",
        line1: "Office 1-12, Second Floor, Burj-e-Noor Trading Center, Shamsabad",
        city: "Rawalpindi",
        state: "Punjab",
        country: "Pakistan",
        jurisdiction: "Pakistan",
        notes: "Lead generation (Final Expense inbound) and media buying services. Agreements dated Jun 2025."
      }),
      company({
        id: "co_all_star_bpo",
        legalName: "All Star BPO",
        displayName: "All Star BPO",
        companyType: "BPO",
        primaryContact: "Hamza Tariq",
        contactTitle: "Owner",
        email: "hamza@allstarbpo.test",
        line1: "Chandni Chowk Flyover, B-Block, Satellite Town",
        city: "Rawalpindi",
        state: "Punjab",
        postalCode: "43000",
        country: "Pakistan",
        jurisdiction: "Pakistan",
        notes: "Lead generation \u2014 Final Expense inbound calls. Agreement dated 14 Aug 2025."
      }),
      company({
        id: "co_first_party_digital",
        legalName: "Influencer Interactive, LLC DBA First Party Digital",
        displayName: "First Party Digital",
        primaryContact: "Greg",
        email: "greg@firstpartydigital.com",
        line1: "627 Steamboat Rd, 2nd Floor",
        city: "Naperville",
        state: "IL",
        postalCode: "60565",
        country: "United States",
        notes: "Lead generation \u2014 workers' compensation claims. Agreement dated 2 May 2025."
      }),
      company({
        id: "co_exclusive_media",
        legalName: "Exclusive Media Corporation",
        displayName: "Exclusive Media Corporation",
        companyType: "Corporation",
        primaryContact: "Thomas Varghese",
        contactTitle: "CEO",
        email: "thomas@exclusivemedia.test",
        line1: "7055 Old Katy Road, Suite 1019",
        city: "Houston",
        state: "TX",
        postalCode: "77024",
        country: "United States",
        notes: "Lead generation \u2014 exclusive MVA leads. Agreement dated 26 Nov 2025."
      }),
      company({
        id: "co_capital_media",
        legalName: "Capital Media Agency",
        displayName: "Capital Media Agency",
        companyType: "Agency",
        primaryContact: "Debra",
        email: "debra@capitalmediaagency.com",
        line1: "5924 Aretha Place, Unit 203",
        city: "Virginia Beach",
        state: "VA",
        postalCode: "23455",
        country: "United States",
        notes: "Lead generation. Agreement dated 17 Jun 2025."
      }),
      company({
        id: "co_hatim_abbasi",
        legalName: "Hatim Hameed Abbasi",
        displayName: "Hatim Hameed Abbasi",
        companyType: "Individual",
        primaryContact: "Hatim Hameed Abbasi",
        email: "hatimhameed704@gmail.com",
        phone: "+92 320 9558273",
        line1: "Village and Post Office Ausia, Tehsil & District Murree",
        city: "Murree",
        state: "Punjab",
        country: "Pakistan",
        jurisdiction: "Pakistan",
        notes: "Lead generation \u2014 auto insurance inbound calls. Agreement dated 25 Sep 2025."
      }),
      company({
        id: "co_nettx",
        legalName: "Nettx Marketing",
        displayName: "Nettx Marketing",
        companyType: "Agency",
        primaryContact: "Tushar Raj",
        contactTitle: "CEO",
        email: "tushar.raj@nettxmarketingsolutions.com",
        city: "",
        state: "",
        country: "United States",
        jurisdiction: "United States",
        notes: "Lead generation \u2014 affiliate offers and MVA. Agreement dated 16 Jul 2025."
      }),
      company({
        id: "co_zednex",
        legalName: "ZEDNEX PRIVATE LIMITED / ZEDNEX GLOBAL LLC",
        displayName: "Zednex",
        companyType: "Private Limited",
        primaryContact: "Syed Sahir Abbas",
        email: "sahir@zedbpo.com",
        phone: "+92 314 6062442",
        line1: "624-626 Eden Tower, Gulberg 3",
        city: "Lahore",
        state: "Punjab",
        country: "Pakistan",
        jurisdiction: "Pakistan",
        notes: "Medical billing lead generation. Agreement dated 30 Jul 2026."
      }),
      company({
        id: "co_lone_star",
        legalName: "Lone Star Financial & Senior Services LLC",
        displayName: "Lone Star Financial",
        primaryContact: "Steve Baucom",
        email: "steve@lonestarfinancial.test",
        line1: "713 Edwards Walk Dr",
        city: "Cedar Park",
        state: "TX",
        postalCode: "78613",
        country: "United States",
        notes: "Collaboration \u2014 Medicare / Final Expense acquisition system. Agreement dated 2 May 2026."
      }),
      company({
        id: "co_satellite_bpo",
        legalName: "Satellite BPO",
        displayName: "Satellite BPO",
        companyType: "BPO",
        primaryContact: "Saifullah Chauhan",
        email: "saifullahchauhan2@gmail.com",
        phone: "+92 320 0454455",
        line1: "Office #1, First Floor, Walayat Plaza",
        city: "Rawalpindi",
        state: "Punjab",
        country: "Pakistan",
        jurisdiction: "Pakistan",
        notes: "Full-service growth partnership. Agreement dated 26 Aug 2026."
      }),
      company({
        id: "co_unlimited_insurance",
        legalName: "Unlimited Insurance",
        displayName: "Unlimited Insurance",
        companyType: "Agency",
        primaryContact: "Josh Streit",
        contactTitle: "Owner",
        email: "josh@unlimitedinsurance.test",
        city: "Miami",
        state: "FL",
        country: "United States",
        notes: "Recruitment services. Agreement dated Dec 2023."
      })
    ];
    ATTACH = "source-agreements";
    lg = {
      recommendedTemplateId: "tpl_lead_generation",
      recommendedAction: "new_lead_generation"
    };
    col = {
      recommendedTemplateId: "tpl_collaboration",
      recommendedAction: "new_collaboration"
    };
    media = {
      recommendedTemplateId: "tpl_media_buying",
      recommendedAction: "new_media_buying"
    };
    service = {
      recommendedTemplateId: "tpl_service_agreement",
      recommendedAction: "new_service_agreement"
    };
    CLIENT_SOURCE_DOCUMENTS = [
      source("src_prime_medical", "AMPLIFY_AND_PRIME_MEDICAL.pdf", "lead_generation_agreement", "co_prime_medical", "2025-06-20T00:00:00.000Z", {
        title: "Lead Generation Agreement",
        clientName: "Prime Medical Outlet LLC",
        summary: "Meta lead generation for Final Expense and DME, exclusive to this client, with a 14-day optimization window and advertising spend paid separately.",
        monthlyFee: "USD 1,000",
        verticals: ["Final Expense", "DME"],
        ...lg,
        patterns: ["14-day optimization", "additional verticals", "ad spend separate", "exclusive leads"]
      }),
      source("src_prime_medical_2", "LEAD_GENERATION_AGREEMENT__prime_medical_outlet.pdf", "lead_generation_agreement", "co_prime_medical", "2025-06-20T00:00:00.000Z", {
        title: "Lead Generation Agreement",
        clientName: "Prime Medical Outlet LLC",
        summary: "Duplicate of the Prime Medical lead-generation engagement dated 20 June 2025.",
        monthlyFee: "USD 1,000",
        verticals: ["Final Expense", "DME"],
        ...lg,
        patterns: ["14-day optimization", "additional verticals", "ad spend separate", "exclusive leads"]
      }),
      source("src_atleads", "ATLEADS__X_AMPLIFY.pdf", "lead_generation_agreement", "co_atleads", "2024-12-03T00:00:00.000Z", {
        title: "Lead Generation Agreement",
        clientName: "Atleads LLC",
        summary: "Affiliate-offer lead generation with a monthly retainer, 14-day optimization period, and the right to add verticals during the term.",
        monthlyFee: "USD 1,000",
        verticals: ["Affiliate offers"],
        ...lg,
        patterns: ["14-day optimization", "additional verticals", "ad spend separate", "exclusive leads"]
      }),
      source("src_atleads_2", "atleads_x_amplify.pdf", "lead_generation_agreement", "co_atleads", "2024-12-03T00:00:00.000Z", {
        title: "Lead Generation Agreement",
        clientName: "Atleads LLC",
        summary: "Duplicate of the Atleads lead-generation engagement dated 3 December 2024.",
        monthlyFee: "USD 1,000",
        verticals: ["Affiliate offers"],
        ...lg,
        patterns: ["14-day optimization", "additional verticals", "ad spend separate", "exclusive leads"]
      }),
      source("src_anchor_line", "Anchor_Line_Insurance_agreement.pdf", "collaboration_agreement", "co_anchor_line", "2026-01-11T00:00:00.000Z", {
        title: "Collaboration Agreement",
        clientName: "Anchor Line Insurance",
        summary: "Pay-per-call collaboration to deliver inbound auto-insurance calls. No outcome guarantee. Monthly service fee is USD 500.",
        monthlyFee: "USD 500",
        verticals: ["Auto insurance", "Inbound calls"],
        ...col,
        patterns: ["inbound calls", "no outcome guarantee", "pay per call"]
      }),
      source("src_rocky", "COLLABORATION_AGREEMENT.pdf", "collaboration_agreement", "co_launch_forward", "2025-03-27T00:00:00.000Z", {
        title: "Collaboration Agreement",
        clientName: "Launch Forward / Rocky Manrique",
        summary: "Pay-per-call collaboration for motor-vehicle-accident leads, including knowledge sharing on campaign method, at USD 1,000 per month.",
        monthlyFee: "USD 1,000",
        verticals: ["MVA", "Inbound calls"],
        ...col,
        patterns: ["inbound calls", "knowledge sharing", "pay per call", "no outcome guarantee"]
      }),
      source("src_rocky_2", "collaboration_agreement_with_Rocky_Manrique.pdf", "collaboration_agreement", "co_launch_forward", "2025-03-27T00:00:00.000Z", {
        title: "Collaboration Agreement",
        clientName: "Launch Forward / Rocky Manrique",
        summary: "Duplicate of the Launch Forward MVA collaboration dated 27 March 2025.",
        monthlyFee: "USD 1,000",
        verticals: ["MVA", "Inbound calls"],
        ...col,
        patterns: ["inbound calls", "knowledge sharing", "pay per call", "no outcome guarantee"]
      }),
      source("src_rocky_3", "Service_Colloboration_Agreement_with_Rocky_from_launch_forward.pdf", "collaboration_agreement", "co_launch_forward", "2025-03-27T00:00:00.000Z", {
        title: "Collaboration Agreement",
        clientName: "Launch Forward / Rocky Manrique",
        summary: "Alternate execution of the Launch Forward MVA pay-per-call collaboration.",
        monthlyFee: "USD 1,000",
        verticals: ["MVA", "Inbound calls"],
        ...col,
        patterns: ["inbound calls", "knowledge sharing", "pay per call"]
      }),
      source("src_renzo", "COLLABORATION_AGREEMENT_2.pdf", "collaboration_agreement", "co_rf_insurance", "2025-05-02T00:00:00.000Z", {
        title: "Collaboration Agreement",
        clientName: "RF Insurance Agency",
        summary: "Pay-per-call insurance collaboration with knowledge sharing and a USD 1,000 monthly fee. Performance is not guaranteed.",
        monthlyFee: "USD 1,000",
        verticals: ["Insurance", "Inbound calls"],
        ...col,
        patterns: ["inbound calls", "knowledge sharing", "pay per call", "no outcome guarantee"]
      }),
      source("src_renzo_2", "collaboration_agreement_with_Renzo.pdf", "collaboration_agreement", "co_rf_insurance", "2025-05-02T00:00:00.000Z", {
        title: "Collaboration Agreement",
        clientName: "RF Insurance Agency",
        summary: "Duplicate of the RF Insurance collaboration dated 2 May 2025.",
        monthlyFee: "USD 1,000",
        verticals: ["Insurance", "Inbound calls"],
        ...col,
        patterns: ["inbound calls", "knowledge sharing", "pay per call", "no outcome guarantee"]
      }),
      source("src_poshnee_lg", "LEAD_GENERATION_AGREEMENT.pdf", "lead_generation_agreement", "co_poshnee", "2025-06-16T00:00:00.000Z", {
        title: "Lead Generation Agreement",
        clientName: "Poshnee Tech (SMC-Private) Limited",
        summary: "Final Expense inbound-call generation on Meta, affiliate routing on a fixed rate per call, starting at USD 500 per month.",
        monthlyFee: "USD 500",
        verticals: ["Final Expense", "Inbound calls"],
        ...lg,
        patterns: ["inbound calls", "ad spend separate", "exclusive leads", "optimization"]
      }),
      source("src_poshnee_lg_2", "Lead_generation_contract_with_Anwer.pdf", "lead_generation_agreement", "co_poshnee", "2025-06-16T00:00:00.000Z", {
        title: "Lead Generation Agreement",
        clientName: "Poshnee Tech (SMC-Private) Limited",
        summary: "Duplicate of the Poshnee Tech Final Expense inbound lead-generation agreement.",
        monthlyFee: "USD 500",
        verticals: ["Final Expense", "Inbound calls"],
        ...lg,
        patterns: ["inbound calls", "ad spend separate", "exclusive leads", "optimization"]
      }),
      source("src_poshnee_media", "MEDIA_BUYING_SERVICES_AGREEMENT.pdf", "marketing_agreement", "co_poshnee", "2025-06-18T00:00:00.000Z", {
        title: "Media Buying Services Agreement",
        clientName: "Poshnee Tech (SMC-Private) Limited",
        summary: "Separate media-buying engagement: Meta campaigns, landers, pixels, pacing, and reporting. Service fee in PKR plus a minimum daily ad budget of USD 50.",
        monthlyFee: "PKR 140,000",
        verticals: ["Meta ads", "DME"],
        ...media,
        patterns: ["media buying", "daily ad budget", "ad spend separate", "optimization"]
      }),
      source("src_poshnee_media_2", "media_buying_service_agreement_with_poshnee_tech.pdf", "marketing_agreement", "co_poshnee", "2025-06-18T00:00:00.000Z", {
        title: "Media Buying Services Agreement",
        clientName: "Poshnee Tech (SMC-Private) Limited",
        summary: "Duplicate of the Poshnee Tech media-buying services agreement dated 18 June 2025.",
        monthlyFee: "PKR 140,000",
        verticals: ["Meta ads", "DME"],
        ...media,
        patterns: ["media buying", "daily ad budget", "ad spend separate", "optimization"]
      }),
      source("src_all_star", "LEAD_GENERATION_AGREEMENT_ALL_STAR__X__AMPLIFY_MEDIA__2_.pdf", "lead_generation_agreement", "co_all_star_bpo", "2025-08-14T00:00:00.000Z", {
        title: "Lead Generation Agreement",
        clientName: "All Star BPO",
        summary: "Final Expense inbound-call generation. Total monthly fee USD 2,000, with the first month split across signing and the first cycle.",
        monthlyFee: "USD 2,000",
        verticals: ["Final Expense", "Inbound calls"],
        ...lg,
        patterns: ["inbound calls", "ad spend separate", "exclusive leads", "optimization"]
      }),
      source("src_all_star_2", "LEAD_GENERATION_AGREEMENT_pbo__2_.pdf", "lead_generation_agreement", "co_all_star_bpo", "2025-08-18T00:00:00.000Z", {
        title: "Lead Generation Agreement",
        clientName: "All Star BPO",
        summary: "Follow-on All Star BPO inbound Final Expense agreement dated 18 August 2025, same commercial model.",
        monthlyFee: "USD 2,000",
        verticals: ["Final Expense", "Inbound calls"],
        ...lg,
        patterns: ["inbound calls", "ad spend separate", "exclusive leads", "optimization"]
      }),
      source("src_fpd", "LEAD_GENERATION_AGREEMENT_Amplify_Media.pdf", "lead_generation_agreement", "co_first_party_digital", "2025-05-02T00:00:00.000Z", {
        title: "Lead Generation Agreement",
        clientName: "First Party Digital",
        summary: "Workers\u2019 compensation claim lead generation at USD 1,000 per month, due by the 5th, with a 14-day optimization period.",
        monthlyFee: "USD 1,000",
        verticals: ["Workers' compensation"],
        ...lg,
        patterns: ["14-day optimization", "additional verticals", "ad spend separate", "exclusive leads"]
      }),
      source("src_fpd_2", "LEAD_GENERATION_AGREEMENT_Date_May_2__2025.pdf", "lead_generation_agreement", "co_first_party_digital", "2025-05-02T00:00:00.000Z", {
        title: "Lead Generation Agreement",
        clientName: "First Party Digital",
        summary: "Duplicate of the First Party Digital workers\u2019 compensation lead-generation agreement.",
        monthlyFee: "USD 1,000",
        verticals: ["Workers' compensation"],
        ...lg,
        patterns: ["14-day optimization", "additional verticals", "ad spend separate", "exclusive leads"]
      }),
      source("src_fpd_3", "LEAD_GENERATION_AGREEMENT_with___LLC_DBA.pdf", "lead_generation_agreement", "co_first_party_digital", "2025-05-02T00:00:00.000Z", {
        title: "Lead Generation Agreement",
        clientName: "Influencer Interactive, LLC DBA First Party Digital",
        summary: "Named-entity variant of the First Party Digital lead-generation agreement dated 2 May 2025.",
        monthlyFee: "USD 1,000",
        verticals: ["Workers' compensation"],
        ...lg,
        patterns: ["14-day optimization", "additional verticals", "ad spend separate", "exclusive leads"]
      }),
      source("src_exclusive", "LEAD_GENERATION_AGREEMENT_Exclusive_Media_Corporation__-_SIGNED.pdf", "lead_generation_agreement", "co_exclusive_media", "2025-11-26T00:00:00.000Z", {
        title: "Lead Generation Agreement",
        clientName: "Exclusive Media Corporation",
        summary: "Exclusive MVA lead generation. USD 1,000 retainer paid upfront, 14-day optimization, advertising spend paid separately.",
        monthlyFee: "USD 1,000",
        verticals: ["MVA"],
        ...lg,
        patterns: ["14-day optimization", "ad spend separate", "exclusive leads", "retainer"]
      }),
      source("src_exclusive_2", "LEAD_GENERATION_AGREEMENT_Exclusive_Media_Corporation__2_.pdf", "lead_generation_agreement", "co_exclusive_media", "2025-11-26T00:00:00.000Z", {
        title: "Lead Generation Agreement",
        clientName: "Exclusive Media Corporation",
        summary: "Unsigned counterpart of the Exclusive Media MVA lead-generation agreement.",
        monthlyFee: "USD 1,000",
        verticals: ["MVA"],
        ...lg,
        patterns: ["14-day optimization", "ad spend separate", "exclusive leads", "retainer"]
      }),
      source("src_capital", "LEAD_GENERATION_AGREEMENT____Date_June_17__2025.pdf", "lead_generation_agreement", "co_capital_media", "2025-06-17T00:00:00.000Z", {
        title: "Lead Generation Agreement",
        clientName: "Capital Media Agency",
        summary: "Standard Meta lead-generation retainer of USD 1,000 due by the 5th, with a 14-day optimization window and extra verticals at no setup fee.",
        monthlyFee: "USD 1,000",
        verticals: ["Lead generation"],
        ...lg,
        patterns: ["14-day optimization", "additional verticals", "ad spend separate"]
      }),
      source("src_capital_2", "lead_generation_agreement_with_Debra.pdf", "lead_generation_agreement", "co_capital_media", "2025-06-17T00:00:00.000Z", {
        title: "Lead Generation Agreement",
        clientName: "Capital Media Agency",
        summary: "Duplicate of the Capital Media Agency lead-generation agreement dated 17 June 2025.",
        monthlyFee: "USD 1,000",
        verticals: ["Lead generation"],
        ...lg,
        patterns: ["14-day optimization", "additional verticals", "ad spend separate"]
      }),
      source("src_hatim", "lead_generation_agreeement_hatim_vs_amplify.pdf", "lead_generation_agreement", "co_hatim_abbasi", "2025-09-25T00:00:00.000Z", {
        title: "Lead Generation Agreement",
        clientName: "Hatim Hameed Abbasi",
        summary: "Auto-insurance inbound-call generation. USD 1,000 billed up front each cycle, with a minimum daily ad budget of USD 50 funded by the client.",
        monthlyFee: "USD 1,000",
        verticals: ["Auto insurance", "Inbound calls"],
        ...lg,
        patterns: ["inbound calls", "daily ad budget", "ad spend separate", "exclusive leads", "optimization"]
      }),
      source("src_nettx", "nettx_market_with_amplify.pdf", "lead_generation_agreement", "co_nettx", "2025-07-16T00:00:00.000Z", {
        title: "Lead Generation Agreement",
        clientName: "Nettx Marketing",
        summary: "Affiliate and MVA lead generation at USD 2,000 per month, with a 14-day optimization period and exclusive delivery.",
        monthlyFee: "USD 2,000",
        verticals: ["Affiliate offers", "MVA"],
        ...lg,
        patterns: ["14-day optimization", "additional verticals", "ad spend separate", "exclusive leads"]
      }),
      source("src_zednex", "ZEDNEX_agreement_signed.pdf", "lead_generation_agreement", "co_zednex", "2026-07-30T00:00:00.000Z", {
        title: "Medical Billing Lead Generation Agreement",
        clientName: "ZEDNEX PRIVATE LIMITED / ZEDNEX GLOBAL LLC",
        summary: "Medical-billing lead generation. USD 1,000 monthly service fee. Outcomes are not guaranteed; advertising spend sits with the client.",
        monthlyFee: "USD 1,000",
        verticals: ["Medical billing"],
        ...lg,
        patterns: ["no outcome guarantee", "ad spend separate", "optimization"]
      }),
      source("src_baucom", "Steve_Baucom_AGREEMENT_pdf__1__copy.pdf", "collaboration_agreement", "co_lone_star", "2026-05-02T00:00:00.000Z", {
        title: "Collaboration Agreement",
        clientName: "Lone Star Financial & Senior Services LLC",
        summary: "Insurance client-acquisition collaboration for Medicare and Final Expense. USD 800 monthly fee paid upfront. No outcome guarantee.",
        monthlyFee: "USD 800",
        verticals: ["Medicare", "Final Expense"],
        ...col,
        patterns: ["no outcome guarantee", "ad spend separate", "optimization"]
      }),
      source("src_satellite", "SERVICE_AGREEMENT_Satellite_BPO_edited__1_.pdf", "service_agreement", "co_satellite_bpo", "2026-08-26T00:00:00.000Z", {
        title: "Service Agreement",
        clientName: "Satellite BPO",
        summary: "Full-service growth partnership. USD 500 monthly fee, USD 1,500 total contract value, and a minimum ad spend of USD 33 per day. No outcome guarantee.",
        monthlyFee: "USD 500",
        verticals: ["Insurance acquisition"],
        ...service,
        patterns: ["no outcome guarantee", "daily ad budget", "ad spend separate"]
      }),
      source("src_unlimited", "RECRUITMENT_SERVICE_AGREEMENT__4_.pdf", "service_agreement", "co_unlimited_insurance", "2023-12-01T00:00:00.000Z", {
        title: "Recruitment Service Agreement",
        clientName: "Unlimited Insurance",
        summary: "Recruitment services for Unlimited Insurance in Miami. Placement fees between USD 200 and USD 300 per hire. Distinct from lead-generation retainers.",
        monthlyFee: "USD 200\u2013300 per hire",
        verticals: ["Recruitment"],
        ...service,
        patterns: ["recruitment"]
      })
    ];
    CLIENT_KNOWLEDGE_FINDINGS = [
      {
        id: "kf_optimization_period",
        title: "14-day campaign optimization period",
        category: "Client \xB7 Term",
        occurrenceCount: 16,
        sampleText: "Lead-generation agreements grant a diagnostic window to test creatives, targeting, and strategy before performance is judged.",
        suggestedClauseId: "cl_optimization_period",
        sourceDocumentIds: ["src_prime_medical", "src_atleads", "src_fpd", "src_exclusive", "src_capital", "src_nettx"],
        decision: "approve_standard",
        status: "resolved",
        createdAt
      },
      {
        id: "kf_extra_verticals",
        title: "Additional campaign verticals without setup fees",
        category: "Client \xB7 Scope",
        occurrenceCount: 12,
        sampleText: "Clients may add niches or verticals during the term without extra setup charges. Media spend remains payable by the client.",
        suggestedClauseId: "cl_additional_verticals",
        sourceDocumentIds: ["src_prime_medical", "src_atleads", "src_fpd", "src_capital", "src_nettx"],
        decision: "approve_standard",
        status: "resolved",
        createdAt
      },
      {
        id: "kf_no_guarantee",
        title: "No guarantee of leads, sales, or ROI",
        category: "Client \xB7 Commercial",
        occurrenceCount: 14,
        sampleText: "Fees are for services rendered. Platform, market, and client-side conversion factors sit outside Amplify's control.",
        suggestedClauseId: "cl_no_guarantee",
        sourceDocumentIds: ["src_anchor_line", "src_rocky", "src_renzo", "src_zednex", "src_baucom", "src_satellite"],
        decision: "approve_standard",
        status: "resolved",
        createdAt
      },
      {
        id: "kf_inbound_calls",
        title: "Inbound call generation and live routing",
        category: "Client \xB7 Services",
        occurrenceCount: 10,
        sampleText: "Collaborations and several lead-gen retainers require live inbound calls (auto, Final Expense, MVA) routed to the client's closers.",
        suggestedClauseId: "cl_inbound_calls",
        sourceDocumentIds: ["src_anchor_line", "src_rocky", "src_renzo", "src_poshnee_lg", "src_all_star", "src_hatim"],
        decision: "approve_optional",
        status: "resolved",
        createdAt
      },
      {
        id: "kf_ad_spend",
        title: "Advertising spend paid separately",
        category: "Client \xB7 Commercial",
        occurrenceCount: 20,
        sampleText: "Media budget is the client's cost, often with a minimum daily spend, and is not included in Amplify's retainer.",
        suggestedClauseId: "cl_ad_spend",
        sourceDocumentIds: ["src_prime_medical", "src_hatim", "src_poshnee_media", "src_satellite", "src_zednex"],
        decision: "approve_standard",
        status: "resolved",
        createdAt
      },
      {
        id: "kf_media_buying",
        title: "Media buying as a distinct engagement",
        category: "Client \xB7 Services",
        occurrenceCount: 2,
        sampleText: "Poshnee Tech used a media-buying agreement covering Meta campaigns, landers, pixels, pacing, and reporting \u2014 separate from its lead-gen retainer.",
        suggestedClauseId: "cl_media_buying_scope",
        sourceDocumentIds: ["src_poshnee_media", "src_poshnee_media_2"],
        decision: "approve_standard",
        status: "resolved",
        createdAt
      },
      {
        id: "kf_collaboration",
        title: "Pay-per-call collaboration model",
        category: "Client \xB7 Commercial",
        occurrenceCount: 7,
        sampleText: "Agency and affiliate collaborations cover inbound calls or leads plus a monthly fee, often with knowledge sharing on campaign method.",
        suggestedClauseId: "cl_collaboration_scope",
        sourceDocumentIds: ["src_anchor_line", "src_rocky", "src_renzo", "src_baucom"],
        decision: "approve_standard",
        status: "resolved",
        createdAt
      }
    ];
  }
});

// src/lib/seed/employees.ts
function addr(line1, city, province, country = "Pakistan") {
  return { line1, line2: "", city, state: province, postalCode: "", country };
}
function person(input) {
  const city = input.city ?? "Rawalpindi";
  const province = input.province ?? "Punjab";
  const address2 = addr(input.line1 ?? "", city, province);
  return {
    id: input.id,
    firstName: input.firstName,
    middleName: "",
    lastName: input.lastName,
    fullLegalName: input.fullLegalName ?? `${input.firstName} ${input.lastName}`,
    fatherName: input.fatherName ?? "",
    identityNumber: input.identityNumber ?? "",
    dateOfBirth: input.dateOfBirth ?? "",
    email: input.email,
    phone: input.phone ?? "",
    residentialAddress: address2,
    permanentAddress: address2,
    city,
    province,
    country: "Pakistan",
    employeeId: input.employeeId,
    type: input.type ?? "employee",
    currentJobTitle: input.currentJobTitle,
    department: input.department,
    reportingManager: "Basit Gilani",
    employmentStatus: input.employmentStatus ?? "active",
    employmentStartDate: input.employmentStartDate ?? "",
    currentSalary: input.currentSalary,
    salaryCurrency: input.salaryCurrency ?? "PKR",
    salaryFrequency: "monthly",
    notes: input.notes,
    createdAt: createdAt2,
    updatedAt: createdAt2,
    createdBy: actor2
  };
}
function source2(id, fileName, detectedType, personId, uploadedAt, knowledge) {
  return {
    id,
    fileName,
    contentType: "application/pdf",
    storagePath: `source-agreements/${fileName}`,
    uploadedAt,
    uploadedBy: actor2,
    analysisStatus: "ANALYZED",
    knowledgeStatus: "approved",
    detectedType,
    analysisJson: { family: "EMPLOYMENT", personId, ...knowledge },
    analysisConfidence: 0.93
  };
}
var createdAt2, actor2, EMPLOYMENT_PEOPLE, ea, setter, promo, salary, EMPLOYMENT_SOURCE_DOCUMENTS, EMPLOYMENT_KNOWLEDGE_FINDINGS;
var init_employees = __esm({
  "src/lib/seed/employees.ts"() {
    "use strict";
    createdAt2 = "2026-01-15T09:00:00.000Z";
    actor2 = "user_super_admin";
    EMPLOYMENT_PEOPLE = [
      person({
        id: "p_zunaira_yaqoob",
        firstName: "Zunaira",
        lastName: "Yaqoob",
        fatherName: "Yaqoob Masih",
        identityNumber: "71501-1675637-2",
        dateOfBirth: "2007-08-25",
        email: "zunaira.yaqoob@amplify.test",
        line1: "Mohallah Pakistan Colony, Jutial",
        city: "Gilgit",
        province: "Gilgit-Baltistan",
        employeeId: "AMP-EMP-1101",
        currentJobTitle: "Appointment Setter",
        department: "Sales",
        employmentStartDate: "2026-08-18",
        currentSalary: 1e5,
        notes: "On-site appointment setter. Night shift 17:00\u201303:00. 10-day paid probation."
      }),
      person({
        id: "p_maria_ali",
        firstName: "Maria",
        lastName: "Ali",
        identityNumber: "37405-6801169-8",
        email: "Mariah.ManagingDirector@gmail.com",
        line1: "Apartment 123B, Floor S-8, QJ Heights, Bahria Town",
        city: "Islamabad",
        province: "Islamabad Capital Territory",
        employeeId: "AMP-EMP-1102",
        currentJobTitle: "Appointment Setter",
        department: "Sales",
        employmentStartDate: "2026-06-25",
        currentSalary: 500,
        salaryCurrency: "USD",
        notes: "Agency appointment setter assigned across client and internal campaigns. Commission on internal campaigns."
      }),
      person({
        id: "p_adeel_asghar",
        firstName: "Adeel",
        lastName: "Asghar",
        fatherName: "Ali Asghar",
        identityNumber: "35101-7811441-9",
        email: "real.adeelasghar@gmail.com",
        phone: "03005012320",
        line1: "Mohalla Muhajir Wara No. 2, Dak Khana Allahabad",
        city: "Kasur",
        employeeId: "AMP-EMP-1103",
        currentJobTitle: "Media Buyer",
        department: "Media",
        employmentStartDate: "2025-08-12",
        currentSalary: 1e5,
        notes: "Media buyer. Salary payable within first 10 days of each month."
      }),
      person({
        id: "p_nida_ajaz",
        firstName: "Nida",
        lastName: "Ajaz",
        fatherName: "Malik Ajaz Ahmed",
        identityNumber: "13101-4011519-4",
        dateOfBirth: "1997-12-02",
        email: "mbaawais456@gmail.com",
        phone: "03105888399",
        line1: "Riffat Shaheen Road, Street 2, Opposite Madina Car Parking, KRL Road",
        employeeId: "AMP-EMP-1104",
        currentJobTitle: "GHL Executive",
        department: "Operations",
        employmentStartDate: "2026-06-16",
        currentSalary: 25e3,
        notes: "Converted from GHL intern (PKR 10,000 stipend) to full-time GHL Executive."
      }),
      person({
        id: "p_arham_awan",
        firstName: "Arham",
        lastName: "Awan",
        fullLegalName: "Arham Tahir Awan",
        identityNumber: "42301-3774046-9",
        email: "arhamtawan@gmail.com",
        phone: "+923473179123",
        line1: "House 191, Street 98, I-8/4",
        city: "Islamabad",
        province: "Islamabad Capital Territory",
        employeeId: "AMP-EMP-1105",
        currentJobTitle: "Outsourced Application Support Engineer",
        department: "Engineering",
        employmentStartDate: "2026-06-11",
        currentSalary: 100,
        salaryCurrency: "USD",
        notes: "Supports operational and maintenance work with the development team."
      }),
      person({
        id: "p_anam_harmain",
        firstName: "Anam",
        lastName: "Harmain",
        fatherName: "Muhammad Harmain",
        identityNumber: "34402-2323700-8",
        email: "mrsharmain12@gmail.com",
        phone: "03315220122",
        line1: "House #88, Street #4, Block B, Rawal Enclave, near Kuri Sheher",
        city: "Islamabad",
        province: "Islamabad Capital Territory",
        employeeId: "AMP-EMP-1106",
        currentJobTitle: "Creative Manager & Graphic Designer",
        department: "Creative",
        employmentStartDate: "2025-05-17",
        currentSalary: 3e4,
        notes: "Part-time creative lead. No fixed hours."
      }),
      person({
        id: "p_asif_masih",
        firstName: "Asif",
        lastName: "Masih",
        fatherName: "Gulzar Masih",
        identityNumber: "37405-0595835-5",
        email: "asif.masih@amplify.test",
        phone: "03495728072",
        employeeId: "AMP-EMP-1107",
        currentJobTitle: "Office Boy & Security Guard",
        department: "Operations",
        employmentStartDate: "2026-04-18",
        currentSalary: 37e3,
        notes: "Office support and security. Agreement dated 15 June 2026."
      }),
      person({
        id: "p_dure_shawar",
        firstName: "Dur-e-Shawar",
        lastName: "Nasir",
        fatherName: "Nasir Ahmed",
        identityNumber: "35202-2560524-4",
        email: "diya02618@gmail.com",
        phone: "03218583029",
        line1: "House #695, Block D, Sher Shah Colony, Raiwind Road",
        city: "Lahore",
        employeeId: "AMP-EMP-1108",
        currentJobTitle: "Creative Manager & Graphic Designer",
        department: "Creative",
        employmentStartDate: "2026-01-01",
        currentSalary: 5e4,
        notes: "Night-shift creative manager. Original salary PKR 35,000; incremented to PKR 50,000 from 1 Aug 2026."
      }),
      person({
        id: "p_ijaz_ansari",
        firstName: "Hafiz",
        lastName: "Ijaz",
        fullLegalName: "Hafiz Muhammad Ijaz",
        fatherName: "Muhammad Anwar",
        identityNumber: "33100-9838550-9",
        email: "ijazansari781@gmail.com",
        phone: "03034545439",
        line1: "House #195, E-Block, FED",
        employeeId: "AMP-EMP-1109",
        currentJobTitle: "Website Designer",
        department: "Creative",
        employmentStartDate: "2024-12-01",
        currentSalary: 5e4,
        notes: "Part-time website designer."
      }),
      person({
        id: "p_hassan_zubair",
        firstName: "Hassan",
        lastName: "Zubair",
        fullLegalName: "Malik Hassan Zubair",
        fatherName: "Malik Zubair Ahmad",
        identityNumber: "31302-9988596-3",
        email: "hassanmalik99885@gmail.com",
        phone: "03442440427",
        line1: "Plot # 258/B, SH-I, Sector 11-1/2, Muhammad Mustafa Colony, Orangi Town",
        city: "Karachi",
        province: "Sindh",
        employeeId: "AMP-EMP-1110",
        currentJobTitle: "Video Editor",
        department: "Creative",
        employmentStartDate: "2025-01-01",
        currentSalary: 5e4,
        notes: "Full-time video editor. 10-hour shifts coordinated to project needs."
      }),
      person({
        id: "p_kanwal_shehzadi",
        firstName: "Kanwal",
        lastName: "Shehzadi",
        fatherName: "Pervez Akhtar",
        identityNumber: "82101-6613615-4",
        email: "kanwalshehzadi663@gmail.com",
        phone: "03100000292",
        line1: "Bagh Azad Kashmir, Dhand Gulistan, Chatir Number 1",
        city: "Bagh",
        province: "Azad Kashmir",
        employeeId: "AMP-EMP-1111",
        currentJobTitle: "Junior Graphic Designer",
        department: "Creative",
        employmentStartDate: "2025-05-16",
        currentSalary: 3e4,
        notes: "Full-time junior designer supporting the creative manager."
      }),
      person({
        id: "p_sikandar_naqvi",
        firstName: "Syed",
        lastName: "Naqvi",
        fullLegalName: "Syed Sikandar Ali Naqvi",
        fatherName: "Syed Zulfiqar Ali",
        identityNumber: "61101-9715456-3",
        email: "sikku.a12@gmail.com",
        phone: "03369415505",
        line1: "House no 26B, Sector 4A, Khayaban e Sirsyed",
        employeeId: "AMP-EMP-1112",
        currentJobTitle: "AI Video Editor & Content Creator",
        department: "Creative",
        employmentStartDate: "2026-01-01",
        currentSalary: 5e4,
        notes: "Joined as AI video intern (PKR 10,000) on 1 Jan 2026; full-time AI video editor from 15 Jun 2026 at PKR 50,000."
      }),
      person({
        id: "p_raheel_mehmood",
        firstName: "Raheel",
        lastName: "Mehmood",
        fullLegalName: "Hafiz Muhammad Raheel",
        fatherName: "Tariq Mehmood",
        identityNumber: "37201-5418873-5",
        email: "raheelmuhammad300@gmail.com",
        phone: "03350783246",
        line1: "Allama Iqbal Colony C-8, Sumbalgah, Kahuta",
        employeeId: "AMP-EMP-1113",
        currentJobTitle: "Media Buyer",
        department: "Media",
        employmentStartDate: "2025-05-08",
        currentSalary: 1e5,
        notes: "Media buyer. 30-day notice."
      }),
      person({
        id: "p_ali_subhan",
        firstName: "Ali",
        lastName: "Subhan",
        identityNumber: "36302-8599132-3",
        email: "alisubhanbaloch99@gmail.com",
        phone: "+923021771900",
        line1: "House No. 412, Gulshan-e-Wahid Colony, near Wapda Town Phase 1",
        city: "Multan",
        employeeId: "AMP-EMP-1114",
        currentJobTitle: "Business Development Manager",
        department: "Sales",
        employmentStatus: "probation",
        employmentStartDate: "2026-08-07",
        currentSalary: 5e4,
        notes: "90-day trial as BDM/BDR. Permanent offer after successful trial."
      }),
      person({
        id: "p_abeera_shaheen",
        firstName: "Abeera",
        lastName: "Shaheen",
        identityNumber: "37402-8131603-2",
        email: "abeera67781@gmail.com",
        phone: "03441803916",
        line1: "House No# 89, Street# 15-C, Babar Colony, Shaheed Chowk",
        employeeId: "AMP-INT-1115",
        type: "intern",
        currentJobTitle: "Facebook Ads Intern",
        department: "Media",
        employmentStartDate: "2026-07-01",
        currentSalary: 1e4,
        notes: "Internship stipend PKR 10,000. Hours set by the company."
      }),
      person({
        id: "p_suleyman_raja",
        firstName: "Suleyman",
        lastName: "Raja",
        fullLegalName: "M Suleyman Saleem Raja",
        identityNumber: "34101-3423068-9",
        email: "suleymanraja8@gmail.com",
        phone: "03055673835",
        line1: "House 301, Street 4, Sector C, Askari 10",
        employeeId: "AMP-EMP-1116",
        currentJobTitle: "Business Development Representative",
        department: "Sales",
        employmentStatus: "probation",
        employmentStartDate: "2026-08-31",
        currentSalary: 1e5,
        notes: "BDR with variable close commission. Two-month probation."
      }),
      person({
        id: "p_musab_aslam",
        firstName: "Musab",
        lastName: "Aslam",
        fullLegalName: "Musab Bin Aslam",
        fatherName: "Muhammad Aslam",
        email: "musab@amplifymediatechnologies.com",
        line1: "House #948, KRL Road, Babar Colony, Near Rajgan Haveli, Dhoke Gangal",
        employeeId: "AMP-EMP-1117",
        currentJobTitle: "Chief Technical Officer",
        department: "Engineering",
        employmentStartDate: "2026-08-01",
        currentSalary: 115e3,
        notes: "Executive CTO. GHL is excluded from scope. Project-based development commission in addition to salary."
      }),
      person({
        id: "p_waseem_abbas",
        firstName: "Muhammad",
        lastName: "Abbas",
        fullLegalName: "Muhammad Waseem Abbas",
        email: "waseem@amplifymediatechnologies.com",
        line1: "Hassu Balail, Tehsil Ahmad Pur Sial",
        city: "Jhang",
        employeeId: "AMP-EMP-1118",
        currentJobTitle: "Chief Operating Officer",
        department: "Operations",
        employmentStartDate: "2025-10-13",
        currentSalary: 1e5,
        notes: "Hired as Media Buyer on 13 Oct 2025. Promoted to COO effective 1 Aug 2026."
      })
    ];
    ea = { recommendedTemplateId: "tpl_employment_standard", recommendedAction: "hire" };
    setter = { recommendedTemplateId: "tpl_employment_appointment_setter", recommendedAction: "hire" };
    promo = { recommendedTemplateId: "tpl_promotion_amended", recommendedAction: "promote" };
    salary = { recommendedTemplateId: "tpl_promotion_amended", recommendedAction: "change_salary" };
    EMPLOYMENT_SOURCE_DOCUMENTS = [
      source2("src_zunaira", "Agreement__APPOINTMENT_SETTER_Zunaira_Yaqoob__1_.pdf__1_.pdf", "employment_appointment_setter", "p_zunaira_yaqoob", "2026-08-18T00:00:00.000Z", {
        title: "Appointment Setter Employment Agreement",
        partyName: "Zunaira Yaqoob",
        summary: "On-site appointment setter on a night shift (17:00\u201303:00) at PKR 100,000 per month, with a 10-day paid probation.",
        compensation: "PKR 100,000 / month",
        role: "Appointment Setter",
        ...setter,
        patterns: ["appointment setter", "paid probation", "night shift", "client data"]
      }),
      source2("src_maria", "AGREEMENT__Maria_Ali__1_.pdf", "employment_appointment_setter", "p_maria_ali", "2026-06-25T00:00:00.000Z", {
        title: "Employment Agreement (Agency Role)",
        partyName: "Maria Ali",
        summary: "Appointment setter assigned across external clients and internal campaigns. USD 500 monthly (or PKR equivalent) plus internal-campaign commission.",
        compensation: "USD 500 / month",
        role: "Appointment Setter",
        ...setter,
        patterns: ["appointment setter", "commission", "multi-client assignment", "client data"]
      }),
      source2("src_adeel", "emploement_agreement_with_Adeel.pdf", "employment_standard", "p_adeel_asghar", "2025-08-12T00:00:00.000Z", {
        title: "Employment Agreement",
        partyName: "Adeel Asghar",
        summary: "Media buyer at PKR 100,000 per month, payable within the first 10 days. 30-day notice. IP and confidentiality covered.",
        compensation: "PKR 100,000 / month",
        role: "Media Buyer",
        ...ea,
        patterns: ["media buyer", "10-day payroll", "30-day notice", "IP ownership"]
      }),
      source2("src_adeel_2", "emploement_agreement_with_Adeel_1_.pdf", "employment_standard", "p_adeel_asghar", "2025-08-12T00:00:00.000Z", {
        title: "Employment Agreement",
        partyName: "Adeel Asghar",
        summary: "Duplicate of Adeel Asghar\u2019s media-buyer employment agreement dated 12 August 2025.",
        compensation: "PKR 100,000 / month",
        role: "Media Buyer",
        ...ea,
        patterns: ["media buyer", "10-day payroll", "30-day notice", "IP ownership"]
      }),
      source2("src_nida", "_employement_agreement_Nida_Ajaz___.pdf__1_.pdf", "employment_standard", "p_nida_ajaz", "2026-06-16T00:00:00.000Z", {
        title: "Employment Agreement",
        partyName: "Nida Ajaz",
        summary: "Converts a GHL internship (PKR 10,000 stipend) into a full-time GHL Executive role at PKR 25,000 from 16 June 2026.",
        compensation: "PKR 25,000 / month",
        role: "GHL Executive",
        ...ea,
        patterns: ["intern conversion", "GHL", "10-day payroll"]
      }),
      source2("src_arham", "employement_agreement_Arham_Tahir_Awan.pdf", "employment_standard", "p_arham_awan", "2026-06-11T00:00:00.000Z", {
        title: "Employment Agreement",
        partyName: "Arham Tahir Awan",
        summary: "Outsourced application support engineer working with the development team. USD 100 per month.",
        compensation: "USD 100 / month",
        role: "Outsourced Application Support Engineer",
        ...ea,
        patterns: ["engineering", "30-day notice", "IP ownership"]
      }),
      source2("src_anam", "employement_agreement_anam_harmain_1.pdf", "employment_standard", "p_anam_harmain", "2025-05-17T00:00:00.000Z", {
        title: "Employment Agreement",
        partyName: "Anam Harmain",
        summary: "Part-time Creative Manager & Graphic Designer at PKR 30,000, with no fixed hours and 30-day notice.",
        compensation: "PKR 30,000 / month",
        role: "Creative Manager & Graphic Designer",
        ...ea,
        patterns: ["part-time", "creative", "salary deductions", "30-day notice", "IP ownership"]
      }),
      source2("src_anam_2", "employement_agreement_anam_harmain_1_1_.pdf", "employment_standard", "p_anam_harmain", "2025-05-17T00:00:00.000Z", {
        title: "Employment Agreement",
        partyName: "Anam Harmain",
        summary: "Duplicate of Anam Harmain\u2019s part-time creative manager agreement dated 17 May 2025.",
        compensation: "PKR 30,000 / month",
        role: "Creative Manager & Graphic Designer",
        ...ea,
        patterns: ["part-time", "creative", "salary deductions", "30-day notice"]
      }),
      source2("src_asif", "employement_agreement_Asif_Masih__.pdf.pdf", "employment_standard", "p_asif_masih", "2026-06-15T00:00:00.000Z", {
        title: "Employment Agreement",
        partyName: "Asif Masih",
        summary: "Office boy and security guard. Employment commenced 18 April 2026. Monthly salary PKR 37,000.",
        compensation: "PKR 37,000 / month",
        role: "Office Boy & Security Guard",
        ...ea,
        patterns: ["operations"]
      }),
      source2("src_dure", "employement_agreement_Dur-e-Shawar_nasir.pdf.pdf", "employment_standard", "p_dure_shawar", "2026-01-01T00:00:00.000Z", {
        title: "Employment Agreement",
        partyName: "Dur-e-Shawar Nasir",
        summary: "Creative Manager & Graphic Designer on a night shift at PKR 35,000, with salary-deduction and 30-day notice terms.",
        compensation: "PKR 35,000 / month",
        role: "Creative Manager & Graphic Designer",
        ...ea,
        patterns: ["night shift", "salary deductions", "30-day notice", "IP ownership"]
      }),
      source2("src_dure_increment", "EMPLOYMENT_CONTRACT_EXTENSION___SALARY_INCREMENT_AGREEMENT_DUR-E-SHAWAR__1_.pdf", "salary_amendment", "p_dure_shawar", "2026-08-01T00:00:00.000Z", {
        title: "Employment Contract Extension & Salary Increment",
        partyName: "Dur-e-Shawar Nasir",
        summary: "Amends the 1 Jan 2026 employment agreement. Basic salary rises from PKR 35,000 to PKR 50,000 from 1 Aug 2026. Other terms continue.",
        compensation: "PKR 50,000 / month",
        role: "Creative Manager & Graphic Designer",
        ...salary,
        patterns: ["salary increment", "amends original", "30-day notice"]
      }),
      source2("src_ijaz", "EMPLOYEMENT_AGREEMENT_IJAZ.pdf", "employment_standard", "p_ijaz_ansari", "2024-12-01T00:00:00.000Z", {
        title: "Employment Agreement",
        partyName: "Hafiz Muhammad Ijaz",
        summary: "Part-time website designer at PKR 50,000, payable within 10 days, with salary-deduction and 30-day notice clauses.",
        compensation: "PKR 50,000 / month",
        role: "Website Designer",
        ...ea,
        patterns: ["part-time", "salary deductions", "30-day notice", "IP ownership"]
      }),
      source2("src_ijaz_2", "EMPLOYEMENT_AGREEMENT_IJAZ_1_.pdf", "employment_standard", "p_ijaz_ansari", "2024-12-01T00:00:00.000Z", {
        title: "Employment Agreement",
        partyName: "Hafiz Muhammad Ijaz",
        summary: "Duplicate of Hafiz Muhammad Ijaz\u2019s website-designer agreement dated 1 December 2024.",
        compensation: "PKR 50,000 / month",
        role: "Website Designer",
        ...ea,
        patterns: ["part-time", "salary deductions", "30-day notice"]
      }),
      source2("src_hassan", "employement_agreement_hassan.pdf", "employment_standard", "p_hassan_zubair", "2025-01-01T00:00:00.000Z", {
        title: "Employment Agreement",
        partyName: "Malik Hassan Zubair",
        summary: "Full-time video editor at PKR 50,000. Ten-hour days. Work product is Company IP. 30-day notice.",
        compensation: "PKR 50,000 / month",
        role: "Video Editor",
        ...ea,
        patterns: ["video editor", "salary deductions", "30-day notice", "IP ownership"]
      }),
      source2("src_hassan_2", "employement_agreement_hassan_1_.pdf", "employment_standard", "p_hassan_zubair", "2025-01-01T00:00:00.000Z", {
        title: "Employment Agreement",
        partyName: "Malik Hassan Zubair",
        summary: "Duplicate of Malik Hassan Zubair\u2019s video-editor employment agreement.",
        compensation: "PKR 50,000 / month",
        role: "Video Editor",
        ...ea,
        patterns: ["video editor", "salary deductions", "30-day notice", "IP ownership"]
      }),
      source2("src_kanwal", "employement_agreement_kanwal.pdf", "employment_standard", "p_kanwal_shehzadi", "2025-05-16T00:00:00.000Z", {
        title: "Employment Agreement",
        partyName: "Kanwal Shehzadi",
        summary: "Full-time junior graphic designer at PKR 30,000. 12-month client-protection language and 30-day notice.",
        compensation: "PKR 30,000 / month",
        role: "Junior Graphic Designer",
        ...ea,
        patterns: ["graphic designer", "client protection", "salary deductions", "30-day notice", "IP ownership"]
      }),
      source2("src_kanwal_2", "employement_agreement_kanwal_1_.pdf", "employment_standard", "p_kanwal_shehzadi", "2025-05-16T00:00:00.000Z", {
        title: "Employment Agreement",
        partyName: "Kanwal Shehzadi",
        summary: "Duplicate of Kanwal Shehzadi\u2019s junior graphic designer agreement dated 16 May 2025.",
        compensation: "PKR 30,000 / month",
        role: "Junior Graphic Designer",
        ...ea,
        patterns: ["graphic designer", "client protection", "30-day notice"]
      }),
      source2("src_sikandar_intern", "employement_agreement_Syed_Sikandar_Ali_Naqvi.pdf__2_.pdf", "internship_agreement", "p_sikandar_naqvi", "2026-01-01T00:00:00.000Z", {
        title: "Internship / Employment Agreement",
        partyName: "Syed Sikandar Ali Naqvi",
        summary: "Joined 1 Jan 2026 as an intern for AI video generation and content at PKR 10,000 per month.",
        compensation: "PKR 10,000 / month",
        role: "AI Video Intern",
        ...ea,
        patterns: ["internship", "AI video", "10-day payroll"]
      }),
      source2("src_sikandar", "employement_agreement_Syed_Sikandar_Ali_Naqvi.pdf__3_.pdf", "employment_standard", "p_sikandar_naqvi", "2026-06-15T00:00:00.000Z", {
        title: "Employment Agreement",
        partyName: "Syed Sikandar Ali Naqvi",
        summary: "Full-time AI video editor and content creator from 15 June 2026 at PKR 50,000, nine hours per day.",
        compensation: "PKR 50,000 / month",
        role: "AI Video Editor & Content Creator",
        ...ea,
        patterns: ["video editor", "intern conversion", "30-day notice", "IP ownership"]
      }),
      source2("src_raheel", "employement_agreement_with_Raheel.pdf", "employment_standard", "p_raheel_mehmood", "2025-05-08T00:00:00.000Z", {
        title: "Employment Agreement",
        partyName: "Hafiz Muhammad Raheel",
        summary: "Media buyer at PKR 100,000 per month with 30-day notice and salary-deduction language.",
        compensation: "PKR 100,000 / month",
        role: "Media Buyer",
        ...ea,
        patterns: ["media buyer", "10-day payroll", "30-day notice", "salary deductions"]
      }),
      source2("src_raheel_2", "employement_agreement_with_Raheel_1_.pdf", "employment_standard", "p_raheel_mehmood", "2025-05-08T00:00:00.000Z", {
        title: "Employment Agreement",
        partyName: "Hafiz Muhammad Raheel",
        summary: "Duplicate of Hafiz Muhammad Raheel\u2019s media-buyer agreement dated 8 May 2025.",
        compensation: "PKR 100,000 / month",
        role: "Media Buyer",
        ...ea,
        patterns: ["media buyer", "30-day notice"]
      }),
      source2("src_ali_trial", "EMPLOYMENT_AGREEMENT__TRIAL_PERIOD__Ali__1_.pdf", "employment_standard", "p_ali_subhan", "2026-08-07T00:00:00.000Z", {
        title: "Employment Agreement (Trial Period)",
        partyName: "Ali Subhan",
        summary: "BDM/BDR on a 90-day trial at PKR 50,000. Permanent offer is contingent on completing the trial.",
        compensation: "PKR 50,000 / month",
        role: "Business Development Manager",
        ...ea,
        patterns: ["trial period", "probation", "BDR"]
      }),
      source2("src_abeera", "INTERNSHIP_AGREEMENT__Abeera_shaheen_copy.pdf", "internship_agreement", "p_abeera_shaheen", "2026-07-01T00:00:00.000Z", {
        title: "Internship Agreement",
        partyName: "Abeera Shaheen",
        summary: "Facebook Ads intern from 1 July 2026. Monthly stipend PKR 10,000. Hours set by the company.",
        compensation: "PKR 10,000 / month",
        role: "Facebook Ads Intern",
        ...ea,
        patterns: ["internship", "stipend", "media"]
      }),
      source2("src_suleyman", "EMPLOYMENT_AGREEMENT_M_Suleyman_Saleem_Raja__1___1_.pdf", "employment_standard", "p_suleyman_raja", "2026-08-31T00:00:00.000Z", {
        title: "Employment Agreement",
        partyName: "M Suleyman Saleem Raja",
        summary: "Business development representative at PKR 100,000 plus variable close commission. Two-month probation.",
        compensation: "PKR 100,000 / month + commission",
        role: "Business Development Representative",
        ...ea,
        patterns: ["BDR", "commission", "probation", "client protection"]
      }),
      source2("src_musab", "EMPLOYMENT_AGREEMENT_CHIEF_TECHNICAL_OFFICER__CTO_Musab_Bin_Aslam.pdf__1__copy_2.pdf", "employment_executive", "p_musab_aslam", "2026-08-01T00:00:00.000Z", {
        title: "CTO Employment Agreement",
        partyName: "Musab Bin Aslam",
        summary: "Chief Technical Officer from 1 August 2026 at PKR 115,000 plus project-based development commission. GHL work is expressly excluded.",
        compensation: "PKR 115,000 / month + project commission",
        role: "Chief Technical Officer",
        ...ea,
        patterns: ["executive", "CTO", "commission", "GHL exclusion"]
      }),
      source2("src_waseem", "employement_agreemnet_waseem.pdf", "employment_standard", "p_waseem_abbas", "2025-10-13T00:00:00.000Z", {
        title: "Employment Agreement",
        partyName: "Muhammad Waseem Abbas",
        summary: "Original media-buyer employment from 13 October 2025 at PKR 100,000 per month.",
        compensation: "PKR 100,000 / month",
        role: "Media Buyer",
        ...ea,
        patterns: ["media buyer", "10-day payroll", "30-day notice"]
      }),
      source2("src_waseem_promo", "Signed_PROMOTION___AMENDED_EMPLOYMENT_AGREEMENT_Muhammad_Waseem_Abbas.pdf", "promotion_amended_employment", "p_waseem_abbas", "2026-08-01T00:00:00.000Z", {
        title: "Promotion & Amended Employment Agreement",
        partyName: "Muhammad Waseem Abbas",
        summary: "Promotes the 13 Oct 2025 media-buyer agreement to Chief Operating Officer effective 1 August 2026. Amends rather than replaces the original.",
        compensation: "PKR 100,000 / month",
        role: "Chief Operating Officer",
        ...promo,
        patterns: ["promotion", "amends original", "executive", "COO"]
      })
    ];
    EMPLOYMENT_KNOWLEDGE_FINDINGS = [
      {
        id: "kf_notice_30",
        title: "Thirty-day written notice",
        category: "Employment \xB7 Termination",
        occurrenceCount: 16,
        sampleText: "Most staff agreements terminate on 30 days\u2019 written notice, with immediate termination reserved for misconduct or material breach.",
        suggestedClauseId: "cl_termination_notice",
        sourceDocumentIds: ["src_adeel", "src_anam", "src_dure", "src_ijaz", "src_hassan", "src_kanwal", "src_raheel"],
        decision: "approve_standard",
        status: "resolved",
        createdAt: createdAt2
      },
      {
        id: "kf_salary_deductions",
        title: "Salary deductions for non-performance",
        category: "Employment \xB7 Compensation",
        occurrenceCount: 10,
        sampleText: "Creative and media agreements allow deductions where the employee is unresponsive in working hours, misses deadlines, or fails delivery standards.",
        suggestedClauseId: "cl_compensation_monthly",
        sourceDocumentIds: ["src_anam", "src_dure", "src_ijaz", "src_hassan", "src_kanwal", "src_raheel"],
        decision: "approve_standard",
        status: "resolved",
        createdAt: createdAt2
      },
      {
        id: "kf_ip_work_product",
        title: "Company owns work product",
        category: "Employment \xB7 IP",
        occurrenceCount: 14,
        sampleText: "Videos, designs, ads, and other work created during employment are Company intellectual property.",
        suggestedClauseId: "cl_ip_ownership",
        sourceDocumentIds: ["src_adeel", "src_anam", "src_hassan", "src_kanwal", "src_sikandar"],
        decision: "approve_standard",
        status: "resolved",
        createdAt: createdAt2
      },
      {
        id: "kf_payroll_10_days",
        title: "Salary paid within ten days",
        category: "Employment \xB7 Compensation",
        occurrenceCount: 12,
        sampleText: "Monthly salary is typically due within the first ten days of the following month.",
        suggestedClauseId: "cl_compensation_monthly",
        sourceDocumentIds: ["src_adeel", "src_zunaira", "src_anam", "src_sikandar"],
        decision: "approve_standard",
        status: "resolved",
        createdAt: createdAt2
      },
      {
        id: "kf_paid_probation",
        title: "Paid probation or trial period",
        category: "Employment \xB7 Probation",
        occurrenceCount: 3,
        sampleText: "New hires use a paid probation or trial: 10 days (appointment setter), 2 months (BDR), or 90 days (BDM trial).",
        suggestedClauseId: "cl_probation_paid",
        sourceDocumentIds: ["src_zunaira", "src_suleyman", "src_ali_trial"],
        decision: "approve_standard",
        status: "resolved",
        createdAt: createdAt2
      },
      {
        id: "kf_intern_stipend",
        title: "Internship stipend then conversion",
        category: "Employment \xB7 Internship",
        occurrenceCount: 3,
        sampleText: "Internships start at about PKR 10,000. Nida converted to GHL Executive; Sikandar converted to full-time AI video editor.",
        suggestedClauseId: "cl_compensation_monthly",
        sourceDocumentIds: ["src_abeera", "src_nida", "src_sikandar_intern"],
        decision: "approve_optional",
        status: "resolved",
        createdAt: createdAt2
      },
      {
        id: "kf_promotion_amends",
        title: "Promotion and salary changes amend the original",
        category: "Employment \xB7 Amendment",
        occurrenceCount: 2,
        sampleText: "Waseem\u2019s COO promotion and Dur-e-Shawar\u2019s increment amend the existing employment agreement instead of replacing it.",
        suggestedClauseId: "cl_amendment_recitals",
        sourceDocumentIds: ["src_waseem_promo", "src_dure_increment"],
        decision: "approve_standard",
        status: "resolved",
        createdAt: createdAt2
      },
      {
        id: "kf_setter_client_data",
        title: "Appointment setters handle client personal data",
        category: "Employment \xB7 Role",
        occurrenceCount: 2,
        sampleText: "Appointment-setter agreements cover multi-client campaigns and require protection of lead and client contact data.",
        suggestedClauseId: "cl_data_protection",
        sourceDocumentIds: ["src_zunaira", "src_maria"],
        decision: "approve_standard",
        status: "resolved",
        createdAt: createdAt2
      }
    ];
  }
});

// src/lib/branding/identity.ts
function formatCompanyAddress(company2) {
  const addr2 = company2.primaryAddress;
  return [addr2.line1, addr2.line2, [addr2.city, addr2.state].filter(Boolean).join(", "), addr2.country].filter(Boolean).join(", ");
}
function websiteHost(website) {
  return website.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
function brandingAssets(isDark) {
  return {
    logo: isDark ? "/branding/amplify-logo-dark.png" : "/branding/amplify-logo-light.png",
    signature: isDark ? "/branding/signature-basit.png" : "/branding/signature-basit-ink.png",
    seal: isDark ? "/branding/amplify-seal-dark.png" : "/branding/amplify-seal-light.png"
  };
}
var AMPLIFY_ADDRESS, AMPLIFY_COMPANY;
var init_identity = __esm({
  "src/lib/branding/identity.ts"() {
    "use strict";
    AMPLIFY_ADDRESS = {
      line1: "House # 948, KRL Road, Babar Colony",
      line2: "Near Rajgan Haveli, Dhoke Gangal",
      city: "Rawalpindi",
      state: "Punjab",
      postalCode: "",
      country: "Pakistan"
    };
    AMPLIFY_COMPANY = {
      legalName: "Amplify Media",
      displayName: "Amplify Media",
      companyType: "Sole Proprietorship",
      registrationDetails: "A sole proprietorship owned by Basit Gilani",
      ntn: "E675825-6",
      primaryAddress: AMPLIFY_ADDRESS,
      phone: "+92 321 6727983",
      usPhone: "+1 (575) 243-7649",
      email: "basit@amplifymediatechnologies.com",
      website: "https://amplifymediatechnologies.com",
      authorizedSignatory: "Basit Gilani",
      authorizedSignatoryTitle: "CEO",
      logoPath: "/branding/amplify-logo-dark.png",
      signaturePath: "/branding/signature-basit.png",
      sealPath: "/branding/amplify-seal-light.png",
      defaultThemeId: "amplify_modern_dark",
      defaultJurisdiction: "Pakistan",
      defaultNoticePeriodDays: 30,
      defaultCurrency: "PKR",
      defaultProbationDays: 30,
      defaultWorkMode: "hybrid",
      defaultPageSize: "A4"
    };
  }
});

// src/lib/branding/themes.ts
function resolveThemeId(id) {
  if (!id) return "amplify_modern_dark";
  if (AMPLIFY_DOCUMENT_THEMES.some((theme) => theme.id === id)) {
    return id;
  }
  return LEGACY_THEME_MAP[id] ?? "amplify_modern_dark";
}
function themeById(id) {
  const resolved = resolveThemeId(id);
  return AMPLIFY_DOCUMENT_THEMES.find((theme) => theme.id === resolved);
}
var AMPLIFY_DOCUMENT_THEMES, BRANDING_TYPE_META, LEGACY_THEME_MAP;
var init_themes = __esm({
  "src/lib/branding/themes.ts"() {
    "use strict";
    AMPLIFY_DOCUMENT_THEMES = [
      {
        id: "amplify_classic_white",
        name: "Amplify Paper White",
        primaryColor: "#141414",
        accentColor: "#2F5D2A",
        headingFont: "Times New Roman",
        bodyFont: "Georgia",
        background: "light",
        margins: { top: "20mm", right: "18mm", bottom: "20mm", left: "18mm" },
        pageSize: "A4",
        showHeader: true,
        showFooter: true,
        showPageNumbers: true,
        contactFooter: true,
        signatureLayout: "side_by_side"
      },
      {
        id: "amplify_modern_dark",
        name: "Amplify Signal Dark",
        primaryColor: "#0b0c0a",
        accentColor: "#C8E64A",
        headingFont: "Georgia",
        bodyFont: "IBM Plex Sans",
        background: "dark",
        margins: { top: "18mm", right: "16mm", bottom: "18mm", left: "16mm" },
        pageSize: "A4",
        showHeader: true,
        showFooter: true,
        showPageNumbers: true,
        contactFooter: true,
        signatureLayout: "side_by_side"
      },
      {
        id: "amplify_harbor_night",
        name: "Amplify Harbor Night",
        primaryColor: "#07131a",
        accentColor: "#5EEAD4",
        headingFont: "IBM Plex Sans",
        bodyFont: "IBM Plex Sans",
        background: "dark",
        margins: { top: "17mm", right: "15mm", bottom: "17mm", left: "15mm" },
        pageSize: "A4",
        showHeader: true,
        showFooter: true,
        showPageNumbers: true,
        contactFooter: true,
        signatureLayout: "side_by_side"
      },
      {
        id: "amplify_ember_brief",
        name: "Amplify Ember Brief",
        primaryColor: "#1a120c",
        accentColor: "#E8A06A",
        headingFont: "Georgia",
        bodyFont: "IBM Plex Sans",
        background: "dark",
        margins: { top: "16mm", right: "15mm", bottom: "16mm", left: "15mm" },
        pageSize: "Letter",
        showHeader: true,
        showFooter: true,
        showPageNumbers: true,
        contactFooter: true,
        signatureLayout: "stacked"
      }
    ];
    BRANDING_TYPE_META = [
      {
        id: "amplify_classic_white",
        label: "Paper White",
        summary: "The only white letterhead \u2014 clean paper field, forest accent, print-ready.",
        useFor: "Employment packets, formal wet-ink style PDFs"
      },
      {
        id: "amplify_modern_dark",
        label: "Signal Dark",
        summary: "Ink field with electric olive \u2014 Amplify\u2019s default digital send look.",
        useFor: "Client proposals, internal drafts, screen signing"
      },
      {
        id: "amplify_harbor_night",
        label: "Harbor Night",
        summary: "Deep harbor field with seafoam accent \u2014 cool, maritime, precise.",
        useFor: "Service agreements, lead-gen packs, modern clients"
      },
      {
        id: "amplify_ember_brief",
        label: "Ember Brief",
        summary: "Warm charcoal with copper ember accent \u2014 compact Letter, stacked signatures.",
        useFor: "US Letter briefs, short client SOWs, amendments"
      }
    ];
    LEGACY_THEME_MAP = {
      amplify_editorial_ink: "amplify_classic_white",
      amplify_olive_formal: "amplify_classic_white",
      amplify_mono_print: "amplify_classic_white",
      amplify_slate_compact: "amplify_ember_brief"
    };
  }
});

// src/lib/seed/clauses.ts
function cv(id, title, category, legalText, extra) {
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
        "promotion_amended_employment"
      ],
      applicableRoles: extra?.applicableRoles ?? [],
      applicableJurisdictions: extra?.applicableJurisdictions ?? ["Pakistan", "United States"],
      createdBy: actor3,
      approvedBy: actor3,
      createdAt: createdAt3,
      updatedAt: createdAt3,
      effectiveDate: "2026-01-15"
    },
    version: {
      id: versionId,
      clauseId: id,
      version: 1,
      status: "approved",
      legalText,
      createdBy: actor3,
      approvedBy: actor3,
      createdAt: createdAt3,
      effectiveDate: "2026-01-15",
      changeNotes: "Initial approved wording."
    }
  };
}
function seedClauses() {
  return {
    clauses: CLAUSE_SEEDS.map((item) => item.clause),
    versions: CLAUSE_SEEDS.map((item) => item.version)
  };
}
var actor3, createdAt3, CLAUSE_SEEDS;
var init_clauses = __esm({
  "src/lib/seed/clauses.ts"() {
    "use strict";
    actor3 = "user_super_admin";
    createdAt3 = "2026-01-15T09:00:00.000Z";
    CLAUSE_SEEDS = [
      cv(
        "cl_parties",
        "Parties",
        "Parties",
        `<p>This Agreement is made between <strong>{{company.legalName}}</strong> (the "<strong>Company</strong>"), with its principal place of business at {{company.address}}, and <strong>{{person.fullLegalName}}</strong> (the "<strong>Employee</strong>"), residing at {{address.full}}.</p>
<p>The Company and the Employee are each a "Party" and together the "Parties".</p>`
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
<p>The Employee shall promptly notify the Company of any change to the information listed above.</p>`
      ),
      cv(
        "cl_position",
        "Position",
        "Role",
        `<p>The Company employs the Employee in the position of <strong>{{jobTitle}}</strong> in the {{department}} department, reporting to {{reportingManager}}.</p>
<p>The Employee's employment shall commence on <strong>{{startDate}}</strong> and shall continue until terminated in accordance with this Agreement.</p>
<p>The Company may reasonably adjust the Employee's duties, title, reporting line, or work location in line with operational needs, provided that such adjustments are consistent with the Employee's skills and seniority.</p>`
      ),
      cv(
        "cl_responsibilities",
        "Responsibilities",
        "Role",
        `<p>The Employee shall diligently and faithfully perform the duties of {{jobTitle}}, including the following:</p>
{{responsibilities.list}}
<p>The Employee shall comply with all lawful and reasonable directions of the Company and with all applicable policies, as amended from time to time.</p>`
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
        { status: "optional", tags: ["executive"], applicableRoles: ["executive"] }
      ),
      cv(
        "cl_compensation_monthly",
        "Compensation \u2014 Standard Monthly Salary",
        "Compensation",
        `<p>The Company shall pay the Employee a gross salary of <strong>{{compensation.display}}</strong>, subject to applicable tax and statutory deductions.</p>
<p>Salary shall be paid {{compensation.salary.paymentTiming}} by electronic transfer to an account nominated by the Employee.</p>
<p>The Company may review compensation from time to time. Any change to compensation shall be recorded in writing and, where it amends this Agreement, documented as an approved amendment.</p>`
      ),
      cv(
        "cl_bonus_performance",
        "Performance Bonus",
        "Compensation",
        `<p>The Employee may be eligible for a discretionary performance bonus. Any bonus, if awarded, is not guaranteed, does not form part of ordinary salary, and does not create an entitlement in future periods.</p>
<p>Bonus criteria, if any: {{compensation.bonus.description}}</p>`,
        { status: "optional", tags: ["bonus", "performance"] }
      ),
      cv(
        "cl_bonus_fixed",
        "Fixed Bonus",
        "Compensation",
        `<p>Subject to the Employee remaining employed and in good standing on the payment date, the Company shall pay a fixed bonus of <strong>{{compensation.bonus.amount}} {{compensation.salary.currency}}</strong>.</p>
<p>{{compensation.bonus.description}}</p>`,
        { status: "optional", tags: ["bonus", "fixed"] }
      ),
      cv(
        "cl_commission",
        "Commission Compensation",
        "Compensation",
        `<p>In addition to base compensation, the Employee may earn commission in accordance with the following structure:</p>
<p>{{compensation.commission.structure}}</p>
<p>Commission is earned only on amounts actually received by the Company and remains subject to clawback for refunds, chargebacks, or policy breaches.</p>`,
        { status: "optional", tags: ["commission"] }
      ),
      cv(
        "cl_probation_paid",
        "Paid Probation",
        "Probation",
        `<p>The Employee's employment is subject to a paid probationary period of <strong>{{probation.duration}} {{probation.unit}}</strong> commencing on the start date.</p>
<p>During probation, either Party may terminate employment with shorter notice as permitted by applicable law and Company policy. Completion of probation does not limit the Company's rights under the termination provisions of this Agreement.</p>`,
        { tags: ["probation"] }
      ),
      cv(
        "cl_no_probation",
        "No Probation",
        "Probation",
        `<p>The Parties agree that this engagement is not subject to a probationary period. The notice and termination provisions of this Agreement apply from the start date.</p>`,
        { status: "optional" }
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
<p>The Employee may be required to work additional hours reasonably necessary to perform the role. Any urgent-availability requirement will be communicated in writing.</p>`
      ),
      cv(
        "cl_remote_work",
        "Remote Work",
        "Schedule",
        `<p>The Employee is authorized to perform duties remotely, subject to maintaining reliable connectivity, confidentiality, and availability during agreed working hours.</p>
<p>The Company may require reasonable on-site attendance for training, collaboration, or operational need. Remote work is a working arrangement, not a contractual place of employment, unless expressly agreed in writing.</p>`,
        { status: "optional", tags: ["remote"] }
      ),
      cv(
        "cl_confidentiality_standard",
        "Standard Confidentiality",
        "Confidentiality",
        `<p>The Employee shall keep confidential all non-public information relating to the Company, its clients, campaigns, processes, pricing, personnel, and technology ("Confidential Information").</p>
<p>The Employee shall not use Confidential Information except as required to perform duties, and shall not disclose it to any third party without prior written consent, except as required by law.</p>
<p>These obligations survive termination of employment.</p>`
      ),
      cv(
        "cl_confidentiality_executive",
        "Enhanced Executive Confidentiality",
        "Confidentiality",
        `<p>Given the Employee's access to strategic, financial, and client information, the Employee owes an enhanced duty of confidentiality. The Employee shall not, during or after employment, copy, retain, or transmit Confidential Information except as expressly authorized for Company business.</p>
<p>Upon request, the Employee shall certify in writing that all Confidential Information has been returned or securely destroyed.</p>`,
        { status: "optional", tags: ["executive", "confidentiality"], applicableRoles: ["executive"] }
      ),
      cv(
        "cl_data_protection",
        "Client Data Protection",
        "Data",
        `<p>The Employee may access personal data and client records solely for authorized work. The Employee shall comply with applicable data protection laws and Company security policies, including access-control, device, and acceptable-use rules.</p>
<p>The Employee shall immediately report any actual or suspected data incident to the Company.</p>`
      ),
      cv(
        "cl_ip_ownership",
        "Intellectual Property Ownership",
        "IP",
        `<p>All work product, copy, creatives, code, processes, documentation, and other intellectual property created by the Employee in the course of employment, whether during or outside ordinary hours, shall belong exclusively to the Company.</p>
<p>The Employee hereby assigns to the Company all right, title, and interest in such intellectual property and shall execute documents reasonably required to perfect that assignment.</p>`
      ),
      cv(
        "cl_client_protection",
        "Employee Client Protection",
        "Restrictive",
        `<p>During employment and for <strong>{{clientProtectionMonths}} months</strong> after it ends, the Employee shall not, on their own account or for any other person, solicit, divert, or accept business from clients or prospective clients of the Company with whom the Employee had material dealings in the twelve months before termination, except with prior written consent.</p>
<p>This restriction is intended to protect legitimate client relationships and confidential information, and shall be enforced to the maximum extent permitted by applicable law.</p>`
      ),
      cv(
        "cl_client_protection_exec",
        "Executive Client Protection",
        "Restrictive",
        `<p>In light of the Employee's seniority, the client-protection restriction shall apply to all Company clients of which the Employee had knowledge, and shall include a prohibition on inducing Company personnel to leave employment during the restricted period.</p>`,
        { status: "optional", tags: ["executive"], applicableRoles: ["executive"] }
      ),
      cv(
        "cl_performance",
        "Performance & Conduct",
        "Conduct",
        `<p>The Employee shall maintain professional conduct, honesty, and a standard of performance consistent with the role. The Company may address performance or conduct issues through coaching, written warning, or, where appropriate, termination in accordance with this Agreement and applicable law.</p>
<p>Serious misconduct, including theft, harassment, data misuse, or conflict of interest, may result in immediate termination.</p>`
      ),
      cv(
        "cl_termination_notice",
        "30-Day Notice",
        "Termination",
        `<p>After any applicable probation, either Party may terminate this Agreement by giving <strong>{{noticePeriodDays}} days'</strong> written notice, or payment in lieu of notice at the Company's election.</p>
<p>The Company may terminate immediately for serious misconduct, material breach, or other cause permitted by law.</p>`
      ),
      cv(
        "cl_immediate_termination",
        "Immediate Termination for Serious Misconduct",
        "Termination",
        `<p>Without limiting other rights, the Company may terminate employment without notice if the Employee commits serious misconduct, including but not limited to fraud, unauthorized disclosure of Confidential Information, violence, or willful refusal to perform duties.</p>`
      ),
      cv(
        "cl_handover",
        "Mandatory Executive Handover",
        "Termination",
        `<p>Upon notice of termination or resignation, the Employee shall complete a documented handover of projects, credentials, client contacts, and outstanding obligations, and shall remain reasonably available during the notice period to ensure operational continuity.</p>`,
        { status: "optional", tags: ["executive"], applicableRoles: ["executive"] }
      ),
      cv(
        "cl_return_property",
        "Return of Company Property",
        "Termination",
        `<p>Upon termination, the Employee shall immediately return all Company property, including devices, access tokens, documents, and copies of Confidential Information, and shall not retain any copy except as required by law.</p>`
      ),
      cv(
        "cl_jurisdiction_pk",
        "Pakistan Jurisdiction",
        "Jurisdiction",
        `<p>This Agreement is governed by the laws of <strong>Pakistan</strong>. The courts of competent jurisdiction in Pakistan shall have exclusive jurisdiction over disputes arising out of or in connection with this Agreement, without prejudice to the Company's right to seek injunctive relief in any forum.</p>`,
        { applicableJurisdictions: ["Pakistan"] }
      ),
      cv(
        "cl_jurisdiction_us",
        "US State Jurisdiction",
        "Jurisdiction",
        `<p>This Agreement is governed by the laws of the applicable US state identified as the governing jurisdiction, without regard to conflict-of-law rules. Courts located in that jurisdiction shall have exclusive jurisdiction, except that the Company may seek injunctive relief elsewhere.</p>`,
        { status: "optional", applicableJurisdictions: ["United States"] }
      ),
      cv(
        "cl_entire_agreement",
        "Entire Agreement",
        "Boilerplate",
        `<p>This Agreement, including any schedules and approved amendments, constitutes the entire agreement between the Parties and supersedes prior discussions relating to its subject matter. Amendments are valid only if made in a written instrument approved through the Company's contract process.</p>
<p>If any provision is held unenforceable, the remaining provisions continue in full force, and the unenforceable provision shall be modified to the minimum extent required to make it enforceable.</p>`
      ),
      cv(
        "cl_no_guarantee",
        "No Sales Guarantee",
        "Client",
        `<p>The Company does not guarantee leads, appointments, sales, revenue, or any particular commercial result. Service fees are payable for services rendered, not for outcome. The Client acknowledges that advertising platforms, market conditions, and Client-side conversion factors are outside the Company's control.</p>`,
        {
          applicableDocumentTypes: ["service_agreement", "lead_generation_agreement", "marketing_agreement", "collaboration_agreement"]
        }
      ),
      cv(
        "cl_ad_spend",
        "Advertising Spend Paid Separately",
        "Client",
        `<p>Media or advertising spend is payable by the Client in addition to the Company's service fees, unless expressly stated otherwise in writing. The Company is not obliged to deploy campaigns until agreed ad spend is funded.</p>`,
        {
          applicableDocumentTypes: ["service_agreement", "lead_generation_agreement", "marketing_agreement", "collaboration_agreement"]
        }
      ),
      cv(
        "cl_lead_ownership",
        "Client Owns Generated Leads",
        "Client",
        `<p>Subject to payment of applicable fees, leads generated for the Client under this Agreement are owned by the Client. The Company may retain anonymized performance data for reporting and service improvement.</p>`,
        {
          applicableDocumentTypes: ["lead_generation_agreement", "service_agreement", "collaboration_agreement"]
        }
      ),
      cv(
        "cl_monthly_retainer",
        "Monthly Retainer",
        "Client",
        `<p>The Client shall pay a monthly retainer of <strong>{{serviceFee}} {{feeCurrency}}</strong>, in advance, for the services described in this Agreement. Invoices are due on the terms stated in the commercial schedule. Late amounts may suspend services.</p>`,
        {
          applicableDocumentTypes: ["service_agreement", "lead_generation_agreement", "marketing_agreement", "collaboration_agreement"]
        }
      ),
      cv(
        "cl_fixed_term_service",
        "Fixed-Term Service Agreement",
        "Client",
        `<p>The initial term is <strong>{{termMonths}} months</strong> commencing on {{startDate}}. Thereafter the Agreement continues month-to-month until terminated on thirty (30) days' written notice, unless a renewal agreement is executed.</p>`,
        {
          applicableDocumentTypes: ["service_agreement", "lead_generation_agreement", "collaboration_agreement", "marketing_agreement", "renewal_agreement"]
        }
      ),
      cv(
        "cl_client_parties",
        "Client Parties",
        "Parties",
        `<p>This Agreement is made between <strong>{{company.legalName}}</strong> (the "Company") and <strong>{{client.legalName}}</strong> (the "Client").</p>
<p>Primary Client contact: {{client.primaryContact}} ({{client.email}}).</p>`,
        {
          applicableDocumentTypes: ["service_agreement", "lead_generation_agreement", "collaboration_agreement", "marketing_agreement"]
        }
      ),
      cv(
        "cl_services_scope",
        "Services",
        "Client",
        `<p>The Company shall provide the following services:</p>
{{responsibilities.list}}
<p>Services not listed are out of scope unless added by a written statement of work or amendment.</p>`,
        {
          applicableDocumentTypes: ["service_agreement", "lead_generation_agreement", "collaboration_agreement", "marketing_agreement"]
        }
      ),
      cv(
        "cl_optimization_period",
        "Campaign Optimization Period",
        "Client",
        `<p>The Company shall have a <strong>fourteen (14) day</strong> optimization period from the start date (or from the launch of a new vertical) to test and refine creatives, targeting, and campaign strategy. Performance during this period is diagnostic and shall not, by itself, constitute a failure of the services.</p>`,
        {
          applicableDocumentTypes: ["lead_generation_agreement", "marketing_agreement", "collaboration_agreement"]
        }
      ),
      cv(
        "cl_additional_verticals",
        "Additional Campaign Verticals",
        "Client",
        `<p>Additional campaign verticals or niches may be added at the Client's written request during the term without separate setup fees, unless the new vertical requires materially different infrastructure. Media spend, if any, remains payable by the Client.</p>`,
        {
          applicableDocumentTypes: ["lead_generation_agreement", "marketing_agreement", "collaboration_agreement"]
        }
      ),
      cv(
        "cl_inbound_calls",
        "Inbound Call Generation",
        "Client",
        `<p>Where the commercial schedule specifies inbound calls, the Company will generate and route live calls to the destination provided by the Client. Call quality, talk time, and geography will follow the targeting agreed in writing. The Client is responsible for answering, qualifying, and converting those calls.</p>`,
        {
          status: "optional",
          applicableDocumentTypes: ["lead_generation_agreement", "collaboration_agreement"]
        }
      ),
      cv(
        "cl_collaboration_scope",
        "Collaboration Services",
        "Client",
        `<p>The Company will provide performance-marketing collaboration services for the Client, which may include paid media, landing pages, creatives, campaign optimization, and (where agreed) knowledge sharing on campaign method. The specific channels and offers are those listed below.</p>
{{responsibilities.list}}`,
        {
          applicableDocumentTypes: ["collaboration_agreement"]
        }
      ),
      cv(
        "cl_media_buying_scope",
        "Media Buying Services",
        "Client",
        `<p>The Company is engaged to plan, buy, and optimize paid media on agreed platforms (including Meta), together with related landing pages, tracking, creatives, pacing, and reporting. The Client remains the advertiser of record unless the parties agree otherwise in writing.</p>
{{responsibilities.list}}
<p>Advertising spend is payable by the Client in addition to the Company's service fees and is not a Company cost unless expressly stated.</p>`,
        {
          applicableDocumentTypes: ["marketing_agreement"]
        }
      ),
      cv(
        "cl_amendment_recitals",
        "Amendment Recitals",
        "Amendment",
        `<p>The Parties previously entered into an employment agreement (the "Original Agreement"). The Parties now wish to amend the Original Agreement to reflect an updated role and compensation, while leaving remaining terms in force except as modified herein.</p>
<p>This instrument amends, and does not replace except as stated, the Original Agreement. Capitalized terms have the meaning given in the Original Agreement unless defined here.</p>`,
        {
          applicableDocumentTypes: ["promotion_amended_employment", "employment_amendment", "salary_amendment"]
        }
      )
    ];
  }
});

// src/lib/auth/password.ts
function hashPassword(password) {
  const salt = (0, import_node_crypto.randomBytes)(16).toString("hex");
  const hash = (0, import_node_crypto.scryptSync)(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = (0, import_node_crypto.scryptSync)(password, salt, 64);
  const actual = Buffer.from(hash, "hex");
  if (test.length !== actual.length) return false;
  return (0, import_node_crypto.timingSafeEqual)(test, actual);
}
var import_node_crypto;
var init_password = __esm({
  "src/lib/auth/password.ts"() {
    "use strict";
    import_node_crypto = require("node:crypto");
  }
});

// src/lib/seed/templates.ts
function section(id, order, title, clauseIds, extra) {
  return {
    id,
    order,
    title,
    required: extra?.required ?? true,
    optional: extra?.optional ?? false,
    clauseIds,
    includeWhen: extra?.includeWhen
  };
}
function template(id, name, documentType, category, description, sections, rules = employmentRules) {
  const versionId = `tv_${id}_v1`;
  return {
    template: {
      id,
      name,
      category,
      documentType,
      description,
      currentVersionId: versionId,
      currentVersion: 1,
      status: "active",
      themeId: "amplify_modern_dark",
      createdBy: actor4,
      approvedBy: actor4,
      createdAt: createdAt4,
      updatedAt: createdAt4,
      effectiveDate: "2026-01-15"
    },
    version: {
      id: versionId,
      templateId: id,
      version: 1,
      name: `${name} v1`,
      status: "approved",
      themeId: "amplify_modern_dark",
      requiredFields: category === "CLIENT" ? [
        { key: "startDate", label: "Start date", type: "date", required: true },
        { key: "serviceFee", label: "Service fee", type: "currency", required: true },
        { key: "feeCurrency", label: "Currency", type: "string", required: true },
        { key: "termMonths", label: "Term (months)", type: "number", required: true }
      ] : employmentFields,
      optionalFields: category === "CLIENT" ? [
        { key: "adSpendPaidSeparately", label: "Ad spend paid separately", type: "boolean", required: false },
        { key: "noSalesGuarantee", label: "No sales guarantee", type: "boolean", required: false },
        { key: "clientOwnsLeads", label: "Client owns leads", type: "boolean", required: false },
        { key: "inboundCalls", label: "Inbound call generation", type: "boolean", required: false }
      ] : optionalEmploymentFields,
      sections,
      rules,
      signatureConfig: {
        order: "recipient_first",
        requireOtp: category === "CLIENT",
        requireManagerApproval: documentType.includes("executive") || documentType.includes("promotion"),
        allowDraftDownload: true,
        expiryDays: 7,
        reminderSchedule: ["24h", "3d"]
      },
      jurisdiction: category === "CLIENT" ? "United States" : "Pakistan",
      createdBy: actor4,
      approvedBy: actor4,
      createdAt: createdAt4,
      effectiveDate: "2026-01-15"
    }
  };
}
function seedTemplates() {
  const items = [
    template(
      "tpl_employment_standard",
      "Standard Employment Agreement",
      "employment_standard",
      "EMPLOYMENT",
      "Approved standard employment agreement for Amplify staff.",
      employmentSections
    ),
    template(
      "tpl_employment_appointment_setter",
      "Appointment Setter Employment Agreement",
      "employment_appointment_setter",
      "EMPLOYMENT",
      "Employment agreement for appointment setters, including client data protections.",
      appointmentSections
    ),
    template(
      "tpl_promotion_amended",
      "Promotion & Amended Employment Agreement",
      "promotion_amended_employment",
      "EMPLOYMENT",
      "Amends an existing employment agreement for promotion or material role change.",
      promotionSections
    ),
    template(
      "tpl_service_agreement",
      "Service Agreement",
      "service_agreement",
      "CLIENT",
      "Standard client service agreement.",
      serviceSections,
      clientRules
    ),
    template(
      "tpl_lead_generation",
      "Lead Generation Agreement",
      "lead_generation_agreement",
      "CLIENT",
      "Client agreement for lead generation, ad spend, and lead ownership.",
      leadSections,
      clientRules
    ),
    template(
      "tpl_collaboration",
      "Collaboration Agreement",
      "collaboration_agreement",
      "CLIENT",
      "Performance-marketing collaboration for inbound calls, leads, and shared campaign method.",
      collaborationSections,
      clientRules
    ),
    template(
      "tpl_media_buying",
      "Media Buying Services Agreement",
      "marketing_agreement",
      "CLIENT",
      "Paid media buying, landing pages, tracking, pacing, and reporting.",
      mediaBuyingSections,
      clientRules
    )
  ];
  return {
    templates: items.map((item) => item.template),
    versions: items.map((item) => item.version)
  };
}
var actor4, createdAt4, employmentFields, optionalEmploymentFields, employmentRules, employmentSections, appointmentSections, promotionSections, clientRules, serviceSections, leadSections, collaborationSections, mediaBuyingSections;
var init_templates = __esm({
  "src/lib/seed/templates.ts"() {
    "use strict";
    actor4 = "user_super_admin";
    createdAt4 = "2026-01-15T09:00:00.000Z";
    employmentFields = [
      { key: "jobTitle", label: "Role / job title", type: "string", required: true },
      { key: "department", label: "Department", type: "string", required: true },
      { key: "reportingManager", label: "Reporting manager", type: "string", required: true },
      { key: "startDate", label: "Start date", type: "date", required: true },
      { key: "compensation.salary.amount", label: "Salary amount", type: "currency", required: true },
      { key: "compensation.salary.currency", label: "Currency", type: "string", required: true },
      { key: "compensation.salary.frequency", label: "Salary frequency", type: "select", required: true },
      { key: "noticePeriodDays", label: "Notice period (days)", type: "number", required: true }
    ];
    optionalEmploymentFields = [
      { key: "compensation.bonus.enabled", label: "Bonus enabled", type: "boolean", required: false },
      { key: "probation.enabled", label: "Probation enabled", type: "boolean", required: false },
      { key: "remoteWork", label: "Remote work", type: "boolean", required: false },
      { key: "clientProtectionMonths", label: "Client protection (months)", type: "number", required: false }
    ];
    employmentRules = [
      {
        id: "rule_bonus_performance",
        name: "Include performance bonus clause",
        when: {
          combinator: "AND",
          conditions: [
            { field: "compensation.bonus.enabled", operator: "equals", value: true },
            { field: "compensation.bonus.type", operator: "equals", value: "performance" }
          ]
        },
        then: [{ type: "include_clause", clauseId: "cl_bonus_performance" }]
      },
      {
        id: "rule_bonus_fixed",
        name: "Include fixed bonus clause",
        when: {
          combinator: "AND",
          conditions: [
            { field: "compensation.bonus.enabled", operator: "equals", value: true },
            { field: "compensation.bonus.type", operator: "equals", value: "fixed" }
          ]
        },
        then: [{ type: "include_clause", clauseId: "cl_bonus_fixed" }]
      },
      {
        id: "rule_commission",
        name: "Include commission clause",
        when: {
          combinator: "OR",
          conditions: [
            { field: "compensation.commission.enabled", operator: "equals", value: true },
            { field: "compensation.bonus.type", operator: "equals", value: "commission" }
          ]
        },
        then: [{ type: "include_clause", clauseId: "cl_commission" }]
      },
      {
        id: "rule_no_probation",
        name: "Exclude probation when disabled",
        when: {
          combinator: "AND",
          conditions: [{ field: "probation.enabled", operator: "equals", value: false }]
        },
        then: [
          { type: "exclude_clause", clauseId: "cl_probation_paid" },
          { type: "include_clause", clauseId: "cl_no_probation" }
        ]
      },
      {
        id: "rule_remote",
        name: "Include remote work",
        when: {
          combinator: "OR",
          conditions: [
            { field: "remoteWork", operator: "equals", value: true },
            { field: "workingSchedule.workMode", operator: "equals", value: "remote" },
            { field: "workingSchedule.workMode", operator: "equals", value: "hybrid" }
          ]
        },
        then: [{ type: "include_clause", clauseId: "cl_remote_work" }]
      },
      {
        id: "rule_executive",
        name: "Executive protections",
        when: {
          combinator: "OR",
          conditions: [
            { field: "employeeLevel", operator: "equals", value: "executive" },
            { field: "jobTitle", operator: "contains", value: "Chief" },
            { field: "jobTitle", operator: "contains", value: "Director" },
            { field: "jobTitle", operator: "contains", value: "Manager" }
          ]
        },
        then: [
          { type: "include_clause", clauseId: "cl_exec_responsibilities" },
          { type: "include_clause", clauseId: "cl_confidentiality_executive" },
          { type: "include_clause", clauseId: "cl_handover" },
          { type: "include_clause", clauseId: "cl_client_protection_exec" }
        ]
      },
      {
        id: "rule_us_jurisdiction",
        name: "US jurisdiction clause",
        when: {
          combinator: "AND",
          conditions: [{ field: "jurisdiction", operator: "contains", value: "United" }]
        },
        then: [
          { type: "exclude_clause", clauseId: "cl_jurisdiction_pk" },
          { type: "include_clause", clauseId: "cl_jurisdiction_us" }
        ]
      }
    ];
    employmentSections = [
      section("sec_parties", 1, "Parties", ["cl_parties"]),
      section("sec_employee", 2, "Employee Information", ["cl_employee_info"]),
      section("sec_position", 3, "Position", ["cl_position"]),
      section("sec_responsibilities", 4, "Responsibilities", ["cl_responsibilities", "cl_exec_responsibilities"]),
      section("sec_compensation", 5, "Compensation", [
        "cl_compensation_monthly",
        "cl_bonus_performance",
        "cl_bonus_fixed",
        "cl_commission"
      ]),
      section("sec_probation", 6, "Probation", ["cl_probation_paid", "cl_no_probation"]),
      section("sec_hours", 7, "Working Hours", ["cl_working_hours", "cl_remote_work"]),
      section("sec_confidentiality", 8, "Confidentiality", [
        "cl_confidentiality_standard",
        "cl_confidentiality_executive"
      ]),
      section("sec_data", 9, "Client Data Protection", ["cl_data_protection"]),
      section("sec_ip", 10, "Intellectual Property", ["cl_ip_ownership"]),
      section("sec_client_protection", 11, "Client Protection", [
        "cl_client_protection",
        "cl_client_protection_exec"
      ]),
      section("sec_conduct", 12, "Performance & Conduct", ["cl_performance"]),
      section("sec_termination", 13, "Termination", [
        "cl_termination_notice",
        "cl_immediate_termination",
        "cl_handover",
        "cl_return_property"
      ]),
      section("sec_jurisdiction", 14, "Jurisdiction", ["cl_jurisdiction_pk", "cl_jurisdiction_us"]),
      section("sec_entire", 15, "Entire Agreement", ["cl_entire_agreement"])
    ];
    appointmentSections = employmentSections.map(
      (item) => item.id === "sec_data" ? { ...item, clauseIds: ["cl_data_protection", "cl_no_guarantee"] } : item
    );
    promotionSections = [
      section("sec_amendment", 1, "Amendment Recitals", ["cl_amendment_recitals"]),
      ...employmentSections.filter((item) => item.id !== "sec_parties")
    ];
    clientRules = [
      {
        id: "rule_no_guarantee",
        name: "No sales guarantee",
        when: {
          combinator: "AND",
          conditions: [{ field: "noSalesGuarantee", operator: "equals", value: true }]
        },
        then: [{ type: "include_clause", clauseId: "cl_no_guarantee" }]
      },
      {
        id: "rule_ad_spend",
        name: "Ad spend separately",
        when: {
          combinator: "AND",
          conditions: [{ field: "adSpendPaidSeparately", operator: "equals", value: true }]
        },
        then: [{ type: "include_clause", clauseId: "cl_ad_spend" }]
      },
      {
        id: "rule_leads",
        name: "Client owns leads",
        when: {
          combinator: "AND",
          conditions: [{ field: "clientOwnsLeads", operator: "equals", value: true }]
        },
        then: [{ type: "include_clause", clauseId: "cl_lead_ownership" }]
      },
      {
        id: "rule_inbound_calls",
        name: "Inbound call generation",
        when: {
          combinator: "AND",
          conditions: [{ field: "inboundCalls", operator: "equals", value: true }]
        },
        then: [{ type: "include_clause", clauseId: "cl_inbound_calls" }]
      }
    ];
    serviceSections = [
      section("sec_c_parties", 1, "Parties", ["cl_client_parties"]),
      section("sec_c_services", 2, "Services", ["cl_services_scope"]),
      section("sec_c_fees", 3, "Fees", ["cl_monthly_retainer", "cl_ad_spend"]),
      section("sec_c_term", 4, "Term", ["cl_fixed_term_service"]),
      section("sec_c_guarantee", 5, "No Guarantee", ["cl_no_guarantee"]),
      section("sec_c_conf", 6, "Confidentiality", ["cl_confidentiality_standard"]),
      section("sec_c_jurisdiction", 7, "Jurisdiction", ["cl_jurisdiction_us"]),
      section("sec_c_entire", 8, "Entire Agreement", ["cl_entire_agreement"])
    ];
    leadSections = [
      section("sec_lg_parties", 1, "Parties", ["cl_client_parties"]),
      section("sec_lg_services", 2, "Services", ["cl_services_scope", "cl_optimization_period", "cl_additional_verticals", "cl_inbound_calls"]),
      section("sec_lg_fees", 3, "Fees", ["cl_monthly_retainer", "cl_ad_spend"]),
      section("sec_lg_term", 4, "Term", ["cl_fixed_term_service"]),
      section("sec_lg_guarantee", 5, "No Guarantee", ["cl_no_guarantee"]),
      section("sec_lg_leads", 6, "Lead Ownership", ["cl_lead_ownership"]),
      section("sec_lg_conf", 7, "Confidentiality", ["cl_confidentiality_standard"]),
      section("sec_lg_jurisdiction", 8, "Jurisdiction", ["cl_jurisdiction_us"]),
      section("sec_lg_entire", 9, "Entire Agreement", ["cl_entire_agreement"])
    ];
    collaborationSections = [
      section("sec_col_parties", 1, "Parties", ["cl_client_parties"]),
      section("sec_col_services", 2, "Collaboration", ["cl_collaboration_scope", "cl_optimization_period", "cl_additional_verticals", "cl_inbound_calls"]),
      section("sec_col_fees", 3, "Fees", ["cl_monthly_retainer", "cl_ad_spend"]),
      section("sec_col_term", 4, "Term", ["cl_fixed_term_service"]),
      section("sec_col_guarantee", 5, "No Guarantee", ["cl_no_guarantee"]),
      section("sec_col_leads", 6, "Lead Ownership", ["cl_lead_ownership"]),
      section("sec_col_conf", 7, "Confidentiality", ["cl_confidentiality_standard"]),
      section("sec_col_jurisdiction", 8, "Jurisdiction", ["cl_jurisdiction_us"]),
      section("sec_col_entire", 9, "Entire Agreement", ["cl_entire_agreement"])
    ];
    mediaBuyingSections = [
      section("sec_mkt_parties", 1, "Parties", ["cl_client_parties"]),
      section("sec_mkt_services", 2, "Media Buying", ["cl_media_buying_scope", "cl_optimization_period", "cl_additional_verticals"]),
      section("sec_mkt_fees", 3, "Fees", ["cl_monthly_retainer", "cl_ad_spend"]),
      section("sec_mkt_term", 4, "Term", ["cl_fixed_term_service"]),
      section("sec_mkt_guarantee", 5, "No Guarantee", ["cl_no_guarantee"]),
      section("sec_mkt_conf", 6, "Confidentiality", ["cl_confidentiality_standard"]),
      section("sec_mkt_jurisdiction", 7, "Jurisdiction", ["cl_jurisdiction_us"]),
      section("sec_mkt_entire", 8, "Entire Agreement", ["cl_entire_agreement"])
    ];
  }
});

// src/lib/seed/state.ts
function bootstrapAdmin() {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";
  const displayName = (process.env.BOOTSTRAP_ADMIN_NAME ?? "Workspace Admin").trim();
  if (!email || !password) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required to create a production workspace."
      );
    }
    return {
      id: "user_super_admin",
      email: "admin@localhost",
      displayName: "Local Admin",
      role: "SUPER_ADMIN",
      active: true,
      passwordHash: hashPassword("change-me-now"),
      createdAt: LIBRARY_CREATED_AT
    };
  }
  if (password.length < 8) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters.");
  }
  return {
    id: "user_super_admin",
    email,
    displayName: displayName || "Workspace Admin",
    role: "SUPER_ADMIN",
    active: true,
    passwordHash: hashPassword(password),
    createdAt: LIBRARY_CREATED_AT
  };
}
function libraryRoleProfiles() {
  return [
    {
      id: "role_software_developer",
      name: "Software Developer",
      department: "Engineering",
      suggestedResponsibilities: [
        "Design, build, and maintain internal and client-facing software",
        "Write tests and participate in code review",
        "Collaborate with operations and media teams on tooling",
        "Protect source code, credentials, and production systems"
      ],
      suggestedClauseIds: ["cl_ip_ownership", "cl_remote_work"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT
    },
    {
      id: "role_appointment_setter",
      name: "Appointment Setter",
      department: "Sales",
      suggestedResponsibilities: [
        "Contact leads using approved scripts and systems",
        "Book qualified appointments for closers",
        "Keep CRM records accurate and current",
        "Handle client personal data according to Company policy"
      ],
      suggestedClauseIds: ["cl_data_protection", "cl_no_guarantee"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT
    },
    {
      id: "role_media_buyer",
      name: "Media Buyer",
      department: "Media",
      suggestedResponsibilities: [
        "Plan and manage paid media campaigns",
        "Monitor performance and optimize spend",
        "Report results to account and operations leads"
      ],
      suggestedClauseIds: ["cl_data_protection"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT
    },
    {
      id: "role_video_editor",
      name: "Video Editor",
      department: "Creative",
      suggestedResponsibilities: [
        "Edit video assets to brand and campaign specifications",
        "Manage versions and delivery deadlines",
        "Protect unpublished creative work"
      ],
      suggestedClauseIds: ["cl_ip_ownership"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT
    },
    {
      id: "role_ghl_executive",
      name: "GHL Executive",
      department: "Operations",
      suggestedResponsibilities: [
        "Configure and maintain GoHighLevel assets",
        "Support campaign operations and reporting",
        "Protect client funnels and contact data"
      ],
      suggestedClauseIds: ["cl_data_protection"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT
    },
    {
      id: "role_account_manager",
      name: "Account Manager",
      department: "Client Success",
      suggestedResponsibilities: [
        "Own day-to-day client communication",
        "Coordinate delivery across media and operations",
        "Escalate risks and protect client relationships"
      ],
      suggestedClauseIds: ["cl_client_protection"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT
    },
    {
      id: "role_coo",
      name: "Chief Operating Officer",
      department: "Operations",
      suggestedResponsibilities: [
        "Lead day-to-day operations and delivery quality",
        "Build process, hiring, and performance systems",
        "Protect Company and client interests at an executive level"
      ],
      suggestedClauseIds: [
        "cl_exec_responsibilities",
        "cl_confidentiality_executive",
        "cl_handover"
      ],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT
    }
  ];
}
function libraryDocumentTypes() {
  return [
    { id: "dt_ea", code: "employment_standard", name: "Standard Employment Agreement", family: "EMPLOYMENT", defaultTemplateId: "tpl_employment_standard", idPrefix: "EA" },
    { id: "dt_as", code: "employment_appointment_setter", name: "Appointment Setter Employment Agreement", family: "EMPLOYMENT", defaultTemplateId: "tpl_employment_appointment_setter", idPrefix: "AS" },
    { id: "dt_pr", code: "promotion_amended_employment", name: "Promotion & Amended Employment Agreement", family: "EMPLOYMENT", defaultTemplateId: "tpl_promotion_amended", idPrefix: "AMEND" },
    { id: "dt_sa", code: "service_agreement", name: "Service Agreement", family: "CLIENT", defaultTemplateId: "tpl_service_agreement", idPrefix: "SA" },
    { id: "dt_lg", code: "lead_generation_agreement", name: "Lead Generation Agreement", family: "CLIENT", defaultTemplateId: "tpl_lead_generation", idPrefix: "LG" },
    { id: "dt_col", code: "collaboration_agreement", name: "Collaboration Agreement", family: "CLIENT", defaultTemplateId: "tpl_collaboration", idPrefix: "COL" },
    { id: "dt_mkt", code: "marketing_agreement", name: "Media Buying Services Agreement", family: "CLIENT", defaultTemplateId: "tpl_media_buying", idPrefix: "MKT" },
    { id: "dt_nda", code: "nda", name: "NDA", family: "EMPLOYMENT", idPrefix: "NDA" }
  ];
}
function libraryDocumentPacks() {
  return [
    {
      id: "pack_new_dev",
      name: "New Software Developer",
      description: "Employment agreement plus IP and confidentiality coverage.",
      templateIds: ["tpl_employment_standard"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT
    },
    {
      id: "pack_new_setter",
      name: "New Appointment Setter",
      description: "Appointment setter employment pack.",
      templateIds: ["tpl_employment_appointment_setter"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT
    },
    {
      id: "pack_new_contractor",
      name: "New Contractor",
      description: "Contractor-oriented employment family starting point.",
      templateIds: ["tpl_employment_standard"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT
    },
    {
      id: "pack_new_client",
      name: "New Client",
      description: "Lead generation, collaboration, or media buying depending on the engagement.",
      templateIds: ["tpl_lead_generation", "tpl_collaboration", "tpl_media_buying", "tpl_service_agreement"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT
    }
  ];
}
function buildBootstrapState(_orgId) {
  const { clauses, versions: clauseVersions } = seedClauses();
  const { templates, versions: templateVersions } = seedTemplates();
  const themes = AMPLIFY_DOCUMENT_THEMES.map((theme) => ({ ...theme }));
  const company2 = { ...AMPLIFY_COMPANY };
  const month = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
  return {
    users: [bootstrapAdmin()],
    people: [...EMPLOYMENT_PEOPLE],
    companies: [...CLIENT_COMPANIES],
    templates,
    templateVersions,
    clauses,
    clauseVersions,
    documentTypes: libraryDocumentTypes(),
    documents: [],
    documentVersions: [],
    documentRelationships: [],
    signingRequests: [],
    signatureEvents: [],
    storedSignatures: [],
    auditEvents: [],
    sourceDocuments: [...CLIENT_SOURCE_DOCUMENTS, ...EMPLOYMENT_SOURCE_DOCUMENTS],
    knowledgeFindings: [...CLIENT_KNOWLEDGE_FINDINGS, ...EMPLOYMENT_KNOWLEDGE_FINDINGS],
    documentPacks: libraryDocumentPacks(),
    themes,
    roleProfiles: libraryRoleProfiles(),
    notifications: [],
    settings: {
      company: company2,
      ai: {
        enabled: false,
        analyzeUploads: true,
        recommendTemplates: true,
        recommendClauses: true,
        recommendThemes: true,
        extractFields: true,
        compareDocuments: true,
        generateSummaries: true,
        dashboardInsights: true,
        draftNewClauses: false,
        monthlySpendingWarningUsd: 50,
        hardSpendingLimitUsd: 150
      },
      aiUsage: {
        month,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostUsd: 0,
        requests: 0
      },
      signing: {
        defaultExpiryDays: 7,
        defaultOrder: "recipient_first",
        requireOtpForClientAgreements: true,
        allowDraftDownload: true
      },
      email: {
        fromName: AMPLIFY_COMPANY.displayName,
        fromAddress: AMPLIFY_COMPANY.email,
        replyTo: AMPLIFY_COMPANY.email,
        notifyInternalOnSign: true,
        notifyRecipientOnComplete: true,
        sendReminders: true
      },
      security: {
        sessionDays: 14,
        minPasswordLength: 8,
        requireMixedCase: true,
        requireDigit: true,
        requireSymbol: false
      },
      sequences: {}
    }
  };
}
var LIBRARY_CREATED_AT;
var init_state = __esm({
  "src/lib/seed/state.ts"() {
    "use strict";
    init_identity();
    init_themes();
    init_password();
    init_clauses();
    init_clients();
    init_employees();
    init_templates();
    LIBRARY_CREATED_AT = "2026-01-01T00:00:00.000Z";
  }
});

// src/lib/firebase/admin.ts
function privateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replaceAll("\\n", "\n");
}
function getFirebaseAdmin() {
  if (app) return app;
  if ((0, import_app.getApps)().length > 0) {
    app = (0, import_app.getApps)()[0];
    return app;
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const key = privateKey();
  if (projectId && clientEmail && key) {
    app = (0, import_app.initializeApp)({
      credential: (0, import_app.cert)({ projectId, clientEmail, privateKey: key }),
      projectId
    });
  } else {
    app = (0, import_app.initializeApp)({
      credential: (0, import_app.applicationDefault)(),
      projectId
    });
  }
  return app;
}
function adminDb() {
  return (0, import_firestore.getFirestore)(getFirebaseAdmin());
}
var import_app, import_auth, import_firestore, app;
var init_admin = __esm({
  "src/lib/firebase/admin.ts"() {
    "use strict";
    import_app = require("firebase-admin/app");
    import_auth = require("firebase-admin/auth");
    import_firestore = require("firebase-admin/firestore");
    app = null;
  }
});

// src/lib/data/firestore-store.ts
var firestore_store_exports = {};
__export(firestore_store_exports, {
  FirestoreStore: () => FirestoreStore
});
function fileDocId(path) {
  return (0, import_node_crypto2.createHash)("sha256").update(path).digest("hex").slice(0, 40);
}
var import_node_crypto2, SEEDED, CHUNK_CHARS, FirestoreStore;
var init_firestore_store = __esm({
  "src/lib/data/firestore-store.ts"() {
    "use strict";
    import_node_crypto2 = require("node:crypto");
    init_admin();
    init_state();
    SEEDED = /* @__PURE__ */ new Set();
    CHUNK_CHARS = 7e5;
    FirestoreStore = class {
      constructor(orgId) {
        this.orgId = orgId;
      }
      col(collection) {
        return adminDb().collection("organizations").doc(this.orgId).collection(collection);
      }
      async ensureSeed() {
        if (SEEDED.has(this.orgId)) return;
        const snap = await adminDb().collection("organizations").doc(this.orgId).get();
        if (!snap.exists) {
          const seed = buildBootstrapState(this.orgId);
          const batchWriter = async () => {
            const collections = [
              "users",
              "people",
              "companies",
              "templates",
              "templateVersions",
              "clauses",
              "clauseVersions",
              "documentTypes",
              "documents",
              "documentVersions",
              "documentRelationships",
              "signingRequests",
              "signatureEvents",
              "storedSignatures",
              "auditEvents",
              "sourceDocuments",
              "knowledgeFindings",
              "documentPacks",
              "themes",
              "roleProfiles",
              "notifications"
            ];
            await adminDb().collection("organizations").doc(this.orgId).set({
              id: this.orgId,
              name: "Amplify Media Technologies",
              bootstrappedAt: (/* @__PURE__ */ new Date()).toISOString()
            });
            for (const name of collections) {
              const items = seed[name];
              for (const item of items) {
                await this.col(name).doc(item.id).set(item);
              }
            }
            const settings = adminDb().collection("organizations").doc(this.orgId).collection("settings");
            await settings.doc("company").set(seed.settings.company);
            await settings.doc("ai").set(seed.settings.ai);
            await settings.doc("aiUsage").set(seed.settings.aiUsage);
            await settings.doc("signing").set(seed.settings.signing);
            await settings.doc("email").set(seed.settings.email);
            await settings.doc("security").set(seed.settings.security);
            await settings.doc("sequences").set(seed.settings.sequences);
          };
          await batchWriter();
        }
        SEEDED.add(this.orgId);
      }
      async getDoc(collection, id) {
        await this.ensureSeed();
        const snap = await this.col(collection).doc(id).get();
        return snap.exists ? snap.data() : null;
      }
      async setDoc(collection, data) {
        await this.ensureSeed();
        await this.col(collection).doc(data.id).set(data);
      }
      async listDocs(collection) {
        await this.ensureSeed();
        const snap = await this.col(collection).get();
        return snap.docs.map((doc) => doc.data());
      }
      async queryDocs(collection, predicate) {
        const all = await this.listDocs(collection);
        return all.filter(predicate);
      }
      async deleteDoc(collection, id) {
        await this.col(collection).doc(id).delete();
      }
      async getSettings(key) {
        await this.ensureSeed();
        const snap = await adminDb().collection("organizations").doc(this.orgId).collection("settings").doc(key).get();
        return snap.data();
      }
      async setSettings(key, data) {
        await adminDb().collection("organizations").doc(this.orgId).collection("settings").doc(key).set(data);
      }
      async transact(fn) {
        return adminDb().runTransaction(async () => fn(this));
      }
      async putFile(path, bytes, contentType) {
        const id = fileDocId(path);
        const base64 = Buffer.from(bytes).toString("base64");
        const metaRef = adminDb().collection("organizations").doc(this.orgId).collection("files").doc(id);
        const chunks = Math.ceil(base64.length / CHUNK_CHARS) || 1;
        await metaRef.set({
          path,
          contentType,
          byteLength: bytes.byteLength,
          chunks,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        for (let i = 0; i < chunks; i++) {
          const slice = base64.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS);
          await metaRef.collection("chunks").doc(String(i)).set({ data: slice });
        }
        return path;
      }
      async getFile(path) {
        try {
          const id = fileDocId(path);
          const metaRef = adminDb().collection("organizations").doc(this.orgId).collection("files").doc(id);
          const meta = await metaRef.get();
          if (!meta.exists) return null;
          const data = meta.data();
          if (data.base64) {
            return {
              bytes: Buffer.from(data.base64, "base64"),
              contentType: data.contentType ?? "application/octet-stream"
            };
          }
          const count = data.chunks ?? 0;
          if (count <= 0) return null;
          const parts = [];
          for (let i = 0; i < count; i++) {
            const chunk = await metaRef.collection("chunks").doc(String(i)).get();
            if (!chunk.exists) return null;
            parts.push(String(chunk.data().data ?? ""));
          }
          return {
            bytes: Buffer.from(parts.join(""), "base64"),
            contentType: data.contentType ?? "application/octet-stream"
          };
        } catch {
          return null;
        }
      }
    };
  }
});

// src/lib/services/ai-service.ts
var ai_service_exports = {};
__export(ai_service_exports, {
  AIDisabledError: () => AIDisabledError,
  clauseCatalogForPrompt: () => clauseCatalogForPrompt,
  getContractAIService: () => getContractAIService,
  recordAiUsage: () => recordAiUsage,
  requireAiCapability: () => requireAiCapability
});
function geminiModel() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}
function parseJsonObject(raw) {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Gemini returned non-JSON output");
  }
}
function createLiveService() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return new DisabledAIService();
  return new GeminiContractService(key);
}
async function getContractAIService(store) {
  if (!geminiEnabled()) return new DisabledAIService();
  if (store) {
    const settings = await store.getSettings("ai");
    if (!settings?.enabled) return new DisabledAIService();
  }
  return createLiveService();
}
async function requireAiCapability(store, capability) {
  if (!geminiEnabled()) throw new AIDisabledError("GEMINI_API_KEY is not configured");
  const settings = await store.getSettings("ai");
  if (!settings?.enabled) throw new AIDisabledError();
  if (!settings[capability]) throw new AIDisabledError(`AI capability disabled: ${capability}`);
  if (settings.draftNewClauses) {
    throw new AIDisabledError("Drafting new legal clauses is not permitted");
  }
  const usage = await store.getSettings("aiUsage");
  if (usage.estimatedCostUsd >= settings.hardSpendingLimitUsd) {
    throw new Error("AI hard spending limit reached");
  }
  return createLiveService();
}
async function recordAiUsage(store, usage) {
  const current = await store.getSettings("aiUsage");
  const settings = await store.getSettings("ai");
  const next = {
    ...current,
    inputTokens: current.inputTokens + usage.inputTokens,
    outputTokens: current.outputTokens + usage.outputTokens,
    estimatedCostUsd: Number((current.estimatedCostUsd + usage.costUsd).toFixed(4)),
    requests: current.requests + 1
  };
  if (next.estimatedCostUsd > settings.hardSpendingLimitUsd) {
    throw new Error("AI hard spending limit reached");
  }
  await store.setSettings("aiUsage", next);
}
function clauseCatalogForPrompt(clauses, templates) {
  return {
    clauseIds: clauses.map((item) => ({ id: item.id, title: item.title })),
    templateIds: templates.map((item) => ({ id: item.id, name: item.name }))
  };
}
var DisabledAIService, GeminiContractService, AIDisabledError;
var init_ai_service = __esm({
  "src/lib/services/ai-service.ts"() {
    "use strict";
    init_config();
    DisabledAIService = class {
      async analyzeSourceDocument() {
        throw new AIDisabledError();
      }
      async recommendTemplate() {
        throw new AIDisabledError();
      }
      async recommendClauses() {
        throw new AIDisabledError();
      }
      async recommendTheme() {
        throw new AIDisabledError();
      }
      async extractDocumentFields() {
        throw new AIDisabledError();
      }
      async summarizeDocument() {
        throw new AIDisabledError();
      }
      async compareDocuments() {
        throw new AIDisabledError();
      }
      async dashboardInsights() {
        throw new AIDisabledError();
      }
    };
    GeminiContractService = class {
      constructor(apiKey) {
        this.apiKey = apiKey;
      }
      async complete(system, user) {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const client = new GoogleGenerativeAI(this.apiKey);
        const model = client.getGenerativeModel({
          model: geminiModel(),
          systemInstruction: system,
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json"
          }
        });
        const result = await model.generateContent(user);
        const text = result.response.text();
        if (!text?.trim()) throw new Error("Gemini returned an empty response");
        return text;
      }
      async analyzeSourceDocument(input) {
        const raw = await this.complete(
          "You extract structured contract metadata. Return JSON only matching the requested schema. Never invent approved legal wording.",
          `File: ${input.fileName}

${input.text.slice(0, 24e3)}`
        );
        return parseJsonObject(raw);
      }
      async recommendTemplate(input) {
        const raw = await this.complete(
          "Recommend an existing Amplify template id from: tpl_employment_standard, tpl_employment_appointment_setter, tpl_promotion_amended, tpl_service_agreement, tpl_lead_generation. Return JSON {templateId, reason}. Do not draft legal text.",
          JSON.stringify(input)
        );
        return parseJsonObject(raw);
      }
      async recommendClauses(input) {
        const raw = await this.complete(
          "Recommend existing clause ids only. Return JSON {clauseIds:string[], reason:string}. Never create new legal wording.",
          JSON.stringify(input)
        );
        return parseJsonObject(raw);
      }
      async recommendTheme(input) {
        const ids = input.themes.map((theme) => theme.id).join(", ");
        const raw = await this.complete(
          `You pick ONE Amplify PDF letterhead theme id from this closed list only: ${ids}. Return JSON {themeId, reason}. Guide: amplify_classic_white = only white/paper print theme (employment, formal); amplify_modern_dark = digital olive on ink; amplify_harbor_night = cool seafoam on harbor dark (client service); amplify_ember_brief = warm copper on charcoal Letter (short US briefs). Never invent themes or legal text.`,
          JSON.stringify(input)
        );
        const parsed = parseJsonObject(raw);
        const themeId = input.themes.some((theme) => theme.id === parsed.themeId) ? parsed.themeId : input.themes[0]?.id;
        return {
          themeId: themeId ?? "amplify_modern_dark",
          reason: parsed.reason?.trim() || "Best match from Amplify\u2019s predefined letterhead set."
        };
      }
      async extractDocumentFields(input) {
        const raw = await this.complete(
          "Extract fields as JSON. Keys may include jobTitle, compensation, probation, jurisdiction, parties.",
          input.text.slice(0, 2e4)
        );
        return parseJsonObject(raw);
      }
      async summarizeDocument(input) {
        const raw = await this.complete(
          "Summarize the agreement in JSON {summary:string}. Do not rewrite clauses.",
          input.html.replace(/<[^>]+>/g, " ").slice(0, 12e3)
        );
        const parsed = parseJsonObject(raw);
        return parsed.summary ?? "";
      }
      async compareDocuments(input) {
        const raw = await this.complete(
          "Summarize differences in JSON {summary:string}. Deterministic diffs are handled separately.",
          JSON.stringify({
            left: input.left.replace(/<[^>]+>/g, " ").slice(0, 8e3),
            right: input.right.replace(/<[^>]+>/g, " ").slice(0, 8e3)
          })
        );
        const parsed = parseJsonObject(raw);
        return parsed.summary ?? "";
      }
      async dashboardInsights(input) {
        const raw = await this.complete(
          `You are an ops assistant for Amplify ContractOS. Given workspace metrics JSON, return JSON only:
{headline:string, insights:[{title:string, detail:string, tone:"urgent"|"watch"|"ok", href?:string}]}
Rules: 3 to 4 insights max. Be concrete and actionable for contracts/signing/people/clients. href may only be one of /documents, /generate, /people, /companies, /signatures, /knowledge, /approvals. Never invent legal wording, clause text, or private party facts not in the snapshot. Prefer blocked work and expiring signatures first.`,
          JSON.stringify(input.snapshot)
        );
        const parsed = parseJsonObject(raw);
        const allowedHrefs = /* @__PURE__ */ new Set([
          "/documents",
          "/generate",
          "/people",
          "/companies",
          "/signatures",
          "/knowledge",
          "/approvals"
        ]);
        const tones = /* @__PURE__ */ new Set(["urgent", "watch", "ok"]);
        const insights = (parsed.insights ?? []).filter((item) => item.title?.trim() && item.detail?.trim()).slice(0, 4).map((item) => ({
          title: String(item.title).trim(),
          detail: String(item.detail).trim(),
          tone: tones.has(String(item.tone)) ? item.tone : "watch",
          href: item.href && allowedHrefs.has(item.href) ? item.href : void 0
        }));
        return {
          headline: parsed.headline?.trim() || "Workspace pulse",
          insights
        };
      }
    };
    AIDisabledError = class extends Error {
      constructor(message = "AI assistance is disabled") {
        super(message);
        this.name = "AIDisabledError";
      }
    };
  }
});

// src/vercel.ts
var vercel_exports = {};
__export(vercel_exports, {
  default: () => vercel_default,
  maxDuration: () => maxDuration,
  runtime: () => runtime
});
module.exports = __toCommonJS(vercel_exports);
var import_vercel = require("hono/vercel");

// src/app.ts
var import_hono = require("hono");
var import_cors = require("hono/cors");
var import_cookie = require("hono/cookie");
init_config();

// src/lib/auth/session.ts
var import_jose = require("jose");
init_config();

// src/lib/data/store.ts
var import_node_async_hooks = require("node:async_hooks");
var import_node_fs = require("node:fs");
var import_promises = require("node:fs/promises");
var import_node_path = require("node:path");
init_config();
init_clients();
init_employees();

// src/lib/seed/merge.ts
init_identity();
init_themes();
init_clauses();
init_clients();
init_employees();

// src/lib/seed/purge-demo.ts
init_password();
var DEMO_USER_IDS = /* @__PURE__ */ new Set(["user_hr", "user_legal"]);
var DEMO_PERSON_IDS = /* @__PURE__ */ new Set(["p_alex_rivera", "p_jordan_malik", "p_ahmed_khan"]);
var DEMO_COMPANY_IDS = /* @__PURE__ */ new Set(["co_test_roofing"]);
var DEMO_DOCUMENT_IDS = /* @__PURE__ */ new Set(["doc_alex_ea", "doc_alex_promo"]);
var DEMO_VERSION_IDS = /* @__PURE__ */ new Set(["dv_alex_ea_v1", "dv_alex_promo_v1"]);
var DEMO_RELATIONSHIP_IDS = /* @__PURE__ */ new Set(["rel_promo_amends_ea"]);
var DEMO_AUDIT_IDS = /* @__PURE__ */ new Set(["aud_seed_ea", "aud_seed_promo"]);
function removeById(list, banned) {
  const next = list.filter((item) => !banned.has(item.id));
  if (next.length === list.length) return false;
  list.length = 0;
  list.push(...next);
  return true;
}
function makeBootstrapAdmin() {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";
  const displayName = (process.env.BOOTSTRAP_ADMIN_NAME ?? "Workspace Admin").trim();
  const createdAt6 = (/* @__PURE__ */ new Date()).toISOString();
  if (email && password && password.length >= 8) {
    return {
      id: "user_super_admin",
      email,
      displayName: displayName || "Workspace Admin",
      role: "SUPER_ADMIN",
      active: true,
      passwordHash: hashPassword(password),
      createdAt: createdAt6
    };
  }
  return {
    id: "user_super_admin",
    email: "admin@localhost",
    displayName: "Local Admin",
    role: "SUPER_ADMIN",
    active: true,
    passwordHash: hashPassword("change-me-now"),
    createdAt: createdAt6
  };
}
function removeDemoUsers(users) {
  const next = users.filter((user) => {
    if (DEMO_USER_IDS.has(user.id)) return false;
    if (user.email === "admin@amplify.test") return false;
    if (user.email === "hr@amplify.test") return false;
    if (user.email === "legal@amplify.test") return false;
    return true;
  });
  if (next.length === users.length) return false;
  users.length = 0;
  users.push(...next);
  return true;
}
function ensureAdminUser(users) {
  if (users.some((user) => user.active && user.role === "SUPER_ADMIN")) return false;
  users.push(makeBootstrapAdmin());
  return true;
}
function purgeDemoFixtures(org) {
  let changed = false;
  changed = removeDemoUsers(org.users) || changed;
  changed = ensureAdminUser(org.users) || changed;
  changed = removeById(org.people, DEMO_PERSON_IDS) || changed;
  changed = removeById(org.companies, DEMO_COMPANY_IDS) || changed;
  changed = removeById(org.documents, DEMO_DOCUMENT_IDS) || changed;
  changed = removeById(org.documentVersions, DEMO_VERSION_IDS) || changed;
  changed = removeById(org.documentRelationships, DEMO_RELATIONSHIP_IDS) || changed;
  changed = removeById(org.auditEvents, DEMO_AUDIT_IDS) || changed;
  for (const doc of org.documents) {
    if (doc.sha256?.startsWith("seed-hash-")) {
      doc.sha256 = void 0;
      changed = true;
    }
  }
  const liveDocIds = new Set(org.documents.map((item) => item.id));
  const beforeVersions = org.documentVersions.length;
  org.documentVersions = org.documentVersions.filter((item) => liveDocIds.has(item.documentId));
  if (org.documentVersions.length !== beforeVersions) changed = true;
  const beforeRels = org.documentRelationships.length;
  org.documentRelationships = org.documentRelationships.filter(
    (item) => liveDocIds.has(item.fromDocumentId) && liveDocIds.has(item.toDocumentId)
  );
  if (org.documentRelationships.length !== beforeRels) changed = true;
  return changed;
}

// src/lib/seed/merge.ts
init_templates();
function addMissing(list, incoming) {
  let changed = false;
  for (const item of incoming) {
    if (!list.some((existing) => existing.id === item.id)) {
      list.push(item);
      changed = true;
    }
  }
  return changed;
}
function upsertById(list, incoming) {
  let changed = false;
  for (const item of incoming) {
    const index = list.findIndex((existing) => existing.id === item.id);
    if (index < 0) {
      list.push(item);
      changed = true;
      continue;
    }
    if (JSON.stringify(list[index]) !== JSON.stringify(item)) {
      list[index] = item;
      changed = true;
    }
  }
  return changed;
}
var createdAt5 = "2026-01-01T00:00:00.000Z";
var LIBRARY_DOCUMENT_TYPES = [
  { id: "dt_ea", code: "employment_standard", name: "Standard Employment Agreement", family: "EMPLOYMENT", defaultTemplateId: "tpl_employment_standard", idPrefix: "EA" },
  { id: "dt_as", code: "employment_appointment_setter", name: "Appointment Setter Employment Agreement", family: "EMPLOYMENT", defaultTemplateId: "tpl_employment_appointment_setter", idPrefix: "AS" },
  { id: "dt_pr", code: "promotion_amended_employment", name: "Promotion & Amended Employment Agreement", family: "EMPLOYMENT", defaultTemplateId: "tpl_promotion_amended", idPrefix: "AMEND" },
  { id: "dt_sa", code: "service_agreement", name: "Service Agreement", family: "CLIENT", defaultTemplateId: "tpl_service_agreement", idPrefix: "SA" },
  { id: "dt_lg", code: "lead_generation_agreement", name: "Lead Generation Agreement", family: "CLIENT", defaultTemplateId: "tpl_lead_generation", idPrefix: "LG" },
  { id: "dt_col", code: "collaboration_agreement", name: "Collaboration Agreement", family: "CLIENT", defaultTemplateId: "tpl_collaboration", idPrefix: "COL" },
  { id: "dt_mkt", code: "marketing_agreement", name: "Media Buying Services Agreement", family: "CLIENT", defaultTemplateId: "tpl_media_buying", idPrefix: "MKT" },
  { id: "dt_nda", code: "nda", name: "NDA", family: "EMPLOYMENT", idPrefix: "NDA" }
];
var LIBRARY_PACKS = [
  {
    id: "pack_new_dev",
    name: "New Software Developer",
    description: "Employment agreement plus IP and confidentiality coverage.",
    templateIds: ["tpl_employment_standard"],
    createdAt: createdAt5,
    updatedAt: createdAt5
  },
  {
    id: "pack_new_setter",
    name: "New Appointment Setter",
    description: "Appointment setter employment pack.",
    templateIds: ["tpl_employment_appointment_setter"],
    createdAt: createdAt5,
    updatedAt: createdAt5
  },
  {
    id: "pack_new_contractor",
    name: "New Contractor",
    description: "Contractor-oriented employment family starting point.",
    templateIds: ["tpl_employment_standard"],
    createdAt: createdAt5,
    updatedAt: createdAt5
  },
  {
    id: "pack_new_client",
    name: "New Client",
    description: "Lead generation, collaboration, or media buying depending on the engagement.",
    templateIds: ["tpl_lead_generation", "tpl_collaboration", "tpl_media_buying", "tpl_service_agreement"],
    createdAt: createdAt5,
    updatedAt: createdAt5
  }
];
function mergeLibraryIntoOrg(org) {
  const { clauses, versions: clauseVersions } = seedClauses();
  const { templates, versions: templateVersions } = seedTemplates();
  let changed = false;
  changed = purgeDemoFixtures(org) || changed;
  changed = addMissing(org.people, EMPLOYMENT_PEOPLE) || changed;
  changed = addMissing(org.companies, CLIENT_COMPANIES) || changed;
  changed = upsertById(org.sourceDocuments, [...CLIENT_SOURCE_DOCUMENTS, ...EMPLOYMENT_SOURCE_DOCUMENTS]) || changed;
  changed = upsertById(org.knowledgeFindings, [...CLIENT_KNOWLEDGE_FINDINGS, ...EMPLOYMENT_KNOWLEDGE_FINDINGS]) || changed;
  changed = upsertById(org.templates, templates) || changed;
  changed = upsertById(org.templateVersions, templateVersions) || changed;
  changed = upsertById(org.clauses, clauses) || changed;
  changed = upsertById(org.clauseVersions, clauseVersions) || changed;
  changed = upsertById(org.documentTypes, LIBRARY_DOCUMENT_TYPES) || changed;
  changed = addMissing(org.documentPacks, LIBRARY_PACKS) || changed;
  const company2 = org.settings.company;
  if (!company2.signaturePath || !company2.authorizedSignatory || !company2.email) {
    org.settings.company = { ...AMPLIFY_COMPANY, ...company2 };
    changed = true;
  }
  const companyNow = org.settings.company;
  if (companyNow.defaultProbationDays == null || companyNow.defaultWorkMode == null || companyNow.defaultPageSize == null) {
    org.settings.company = {
      ...companyNow,
      defaultProbationDays: companyNow.defaultProbationDays ?? AMPLIFY_COMPANY.defaultProbationDays,
      defaultWorkMode: companyNow.defaultWorkMode ?? AMPLIFY_COMPANY.defaultWorkMode,
      defaultPageSize: companyNow.defaultPageSize ?? AMPLIFY_COMPANY.defaultPageSize
    };
    changed = true;
  }
  if (!org.settings.email) {
    org.settings.email = {
      fromName: companyNow.displayName || AMPLIFY_COMPANY.displayName,
      fromAddress: companyNow.email || AMPLIFY_COMPANY.email,
      replyTo: companyNow.email || AMPLIFY_COMPANY.email,
      notifyInternalOnSign: true,
      notifyRecipientOnComplete: true,
      sendReminders: true
    };
    changed = true;
  }
  if (!org.settings.security) {
    org.settings.security = {
      sessionDays: 14,
      minPasswordLength: 8,
      requireMixedCase: true,
      requireDigit: true,
      requireSymbol: false
    };
    changed = true;
  }
  if (org.settings.ai && org.settings.ai.recommendThemes == null) {
    org.settings.ai = { ...org.settings.ai, recommendThemes: true };
    changed = true;
  }
  if (org.settings.ai && org.settings.ai.dashboardInsights == null) {
    org.settings.ai = { ...org.settings.ai, dashboardInsights: true };
    changed = true;
  }
  const liveThemeIds = new Set(AMPLIFY_DOCUMENT_THEMES.map((theme) => theme.id));
  const companyTheme = resolveThemeId(org.settings.company.defaultThemeId);
  if (org.settings.company.defaultThemeId !== companyTheme) {
    org.settings.company = { ...org.settings.company, defaultThemeId: companyTheme };
    changed = true;
  }
  for (const document of org.documents) {
    const nextTheme = resolveThemeId(document.themeId);
    if (document.themeId !== nextTheme) {
      document.themeId = nextTheme;
      changed = true;
    }
  }
  for (const template2 of org.templates) {
    const nextTheme = resolveThemeId(template2.themeId);
    if (template2.themeId !== nextTheme) {
      template2.themeId = nextTheme;
      changed = true;
    }
  }
  for (const version of org.templateVersions) {
    const nextTheme = resolveThemeId(version.themeId);
    if (version.themeId !== nextTheme) {
      version.themeId = nextTheme;
      changed = true;
    }
  }
  const beforeThemeCount = org.themes.length;
  org.themes = org.themes.filter((theme) => liveThemeIds.has(theme.id));
  if (org.themes.length !== beforeThemeCount) changed = true;
  changed = upsertById(org.themes, AMPLIFY_DOCUMENT_THEMES.map((theme) => ({ ...theme }))) || changed;
  return changed;
}

// src/lib/data/store.ts
init_state();
var memory = null;
var queue = Promise.resolve();
var held = new import_node_async_hooks.AsyncLocalStorage();
function withLock(fn) {
  if (held.getStore()) return fn();
  const run = queue.then(
    () => held.run(true, fn),
    () => held.run(true, fn)
  );
  queue = run.then(
    () => void 0,
    () => void 0
  );
  return run;
}
function dbPath() {
  return (0, import_node_path.join)(dataDir(), "db.json");
}
async function readRoot() {
  if (memory) return memory;
  try {
    const raw = await (0, import_promises.readFile)(dbPath(), "utf8");
    memory = JSON.parse(raw);
    return memory;
  } catch {
    memory = { organizations: {}, files: {} };
    return memory;
  }
}
async function persist(root) {
  memory = root;
  await (0, import_promises.mkdir)(dataDir(), { recursive: true });
  await (0, import_promises.writeFile)(dbPath(), JSON.stringify(root, null, 2), "utf8");
}
function sourceAgreementDirs() {
  return [
    process.env.CONTRACT_SOURCE_DIR,
    (0, import_node_path.join)(process.cwd(), "source-agreements"),
    // Cursor chat attachments from the original Amplify agreement upload set
    "/Users/arhamawan/.cursor/projects/Users-arhamawan-Documents-Amplify-Contract-thing/attachments/f0153983-e2d6-478e-b263-c04805c2b562"
  ].filter((dir) => Boolean(dir));
}
async function ensureSourceAgreementFiles(root) {
  const srcDir = sourceAgreementDirs().find((dir) => (0, import_node_fs.existsSync)(dir));
  if (!srcDir) return false;
  let changed = false;
  await (0, import_promises.mkdir)((0, import_node_path.join)(dataDir(), "storage", "source-agreements"), { recursive: true });
  for (const doc of [...CLIENT_SOURCE_DOCUMENTS, ...EMPLOYMENT_SOURCE_DOCUMENTS]) {
    const dest = (0, import_node_path.join)(dataDir(), "storage", doc.storagePath);
    if (!(0, import_node_fs.existsSync)(dest)) {
      const src = (0, import_node_path.join)(srcDir, doc.fileName);
      if (!(0, import_node_fs.existsSync)(src)) continue;
      await (0, import_promises.mkdir)((0, import_node_path.dirname)(dest), { recursive: true });
      await (0, import_promises.copyFile)(src, dest);
      changed = true;
    }
    if (!root.files[doc.storagePath]) {
      root.files[doc.storagePath] = { contentType: "application/pdf" };
      changed = true;
    }
  }
  return changed;
}
async function ensureOrg(root, orgId) {
  let changed = false;
  if (!root.organizations[orgId]) {
    root.organizations[orgId] = buildBootstrapState(orgId);
    changed = true;
  } else if (mergeLibraryIntoOrg(root.organizations[orgId])) {
    changed = true;
  }
  if (await ensureSourceAgreementFiles(root)) changed = true;
  if (changed) await persist(root);
  return root.organizations[orgId];
}
var LocalStore = class {
  constructor(orgId) {
    this.orgId = orgId;
  }
  async getDoc(collection, id) {
    const root = await readRoot();
    const org = await ensureOrg(root, this.orgId);
    const list = org[collection];
    return list.find((item) => item.id === id) ?? null;
  }
  async setDoc(collection, data) {
    await withLock(async () => {
      const root = await readRoot();
      const org = await ensureOrg(root, this.orgId);
      const list = org[collection];
      const index = list.findIndex((item) => item.id === data.id);
      if (index >= 0) list[index] = data;
      else list.push(data);
      await persist(root);
    });
  }
  async listDocs(collection) {
    const root = await readRoot();
    const org = await ensureOrg(root, this.orgId);
    return [...org[collection]];
  }
  async queryDocs(collection, predicate) {
    const all = await this.listDocs(collection);
    return all.filter(predicate);
  }
  async deleteDoc(collection, id) {
    await withLock(async () => {
      const root = await readRoot();
      const org = await ensureOrg(root, this.orgId);
      const list = org[collection];
      const next = list.filter((item) => item.id !== id);
      org[collection] = next;
      await persist(root);
    });
  }
  async getSettings(key) {
    const root = await readRoot();
    const org = await ensureOrg(root, this.orgId);
    return org.settings[key];
  }
  async setSettings(key, data) {
    await withLock(async () => {
      const root = await readRoot();
      const org = await ensureOrg(root, this.orgId);
      org.settings[key] = data;
      await persist(root);
    });
  }
  async transact(fn) {
    return withLock(() => fn(this));
  }
  async putFile(path, bytes, contentType) {
    const abs = (0, import_node_path.join)(dataDir(), "storage", path);
    await (0, import_promises.mkdir)((0, import_node_path.dirname)(abs), { recursive: true });
    await (0, import_promises.writeFile)(abs, bytes);
    await withLock(async () => {
      const root = await readRoot();
      root.files[path] = { contentType };
      await persist(root);
    });
    return path;
  }
  async getFile(path) {
    try {
      const abs = (0, import_node_path.join)(dataDir(), "storage", path);
      const bytes = await (0, import_promises.readFile)(abs);
      const root = await readRoot();
      return { bytes, contentType: root.files[path]?.contentType ?? "application/octet-stream" };
    } catch {
      return null;
    }
  }
};
async function getStore(orgId = DEFAULT_ORG_ID) {
  if (!useLocalAdapter() && isFirebaseConfigured()) {
    const { FirestoreStore: FirestoreStore2 } = await Promise.resolve().then(() => (init_firestore_store(), firestore_store_exports));
    return new FirestoreStore2(orgId);
  }
  return new LocalStore(orgId);
}

// src/lib/auth/session.ts
init_password();

// src/lib/auth/permissions.ts
var ALL = [
  "people.read",
  "people.read_sensitive",
  "people.write",
  "companies.read",
  "companies.write",
  "documents.read",
  "documents.create",
  "documents.edit",
  "documents.approve",
  "documents.send",
  "documents.void",
  "documents.countersign",
  "templates.read",
  "templates.write",
  "clauses.read",
  "clauses.write",
  "clauses.approve",
  "knowledge.read",
  "knowledge.write",
  "knowledge.approve",
  "packs.read",
  "packs.write",
  "audit.read",
  "settings.read",
  "settings.write",
  "users.manage",
  "ai.use",
  "signing.manage"
];
var ROLE_PERMISSIONS = {
  SUPER_ADMIN: ALL,
  ADMIN_HR: [
    "people.read",
    "people.read_sensitive",
    "people.write",
    "companies.read",
    "companies.write",
    "documents.read",
    "documents.create",
    "documents.edit",
    "documents.approve",
    "documents.send",
    "documents.void",
    "documents.countersign",
    "templates.read",
    "clauses.read",
    "knowledge.read",
    "packs.read",
    "packs.write",
    "audit.read",
    "settings.read",
    "ai.use",
    "signing.manage"
  ],
  LEGAL_ADMIN: [
    "people.read",
    "companies.read",
    "documents.read",
    "templates.read",
    "templates.write",
    "clauses.read",
    "clauses.write",
    "clauses.approve",
    "knowledge.read",
    "knowledge.write",
    "knowledge.approve",
    "packs.read",
    "packs.write",
    "audit.read",
    "settings.read",
    "ai.use"
  ],
  MANAGER: [
    "people.read",
    "companies.read",
    "documents.read",
    "documents.create",
    "documents.edit",
    "documents.approve",
    "templates.read",
    "clauses.read",
    "packs.read",
    "audit.read"
  ],
  VIEWER: [
    "people.read",
    "companies.read",
    "documents.read",
    "templates.read",
    "clauses.read",
    "packs.read",
    "audit.read"
  ]
};
function hasPermission(role, permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}
function assertPermission(role, permission) {
  if (!hasPermission(role, permission)) {
    throw new AuthzError(`Missing permission: ${permission}`);
  }
}
var AuthzError = class extends Error {
  status = 403;
  constructor(message) {
    super(message);
    this.name = "AuthzError";
  }
};

// src/lib/auth/session.ts
var SESSION_COOKIE = "contractos_session";
function secretKey() {
  return new TextEncoder().encode(sessionSecret());
}
async function createSessionToken(user, options) {
  const days = Math.min(90, Math.max(1, options?.sessionDays ?? 14));
  return new import_jose.SignJWT(user).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${days}d`).sign(secretKey());
}
async function readSessionToken(token) {
  try {
    const { payload } = await (0, import_jose.jwtVerify)(token, secretKey());
    return payload;
  } catch {
    return null;
  }
}
function sessionFromAuthHeader(header) {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}
async function requirePermissionFromToken(token, permission) {
  if (!token) throw new AuthzError("Authentication required");
  const session = await readSessionToken(token);
  if (!session) throw new AuthzError("Authentication required");
  assertPermission(session.role, permission);
  return session;
}
async function loginWithPassword(email, password) {
  const store = await getStore(DEFAULT_ORG_ID);
  const users = await store.listDocs("users");
  const user = users.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.active);
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid email or password");
  }
  return {
    userId: user.id,
    orgId: DEFAULT_ORG_ID,
    email: user.email,
    displayName: user.displayName,
    role: user.role
  };
}

// src/lib/auth/security-settings.ts
init_config();
var DEFAULT_SECURITY_SETTINGS = {
  sessionDays: 14,
  minPasswordLength: 8,
  requireMixedCase: false,
  requireDigit: false,
  requireSymbol: false
};
async function loadSecuritySettings(store) {
  const active = store ?? await getStore(DEFAULT_ORG_ID);
  const stored = await active.getSettings("security");
  return {
    sessionDays: stored?.sessionDays ?? DEFAULT_SECURITY_SETTINGS.sessionDays,
    minPasswordLength: stored?.minPasswordLength ?? DEFAULT_SECURITY_SETTINGS.minPasswordLength,
    requireMixedCase: stored?.requireMixedCase ?? DEFAULT_SECURITY_SETTINGS.requireMixedCase,
    requireDigit: stored?.requireDigit ?? DEFAULT_SECURITY_SETTINGS.requireDigit,
    requireSymbol: stored?.requireSymbol ?? DEFAULT_SECURITY_SETTINGS.requireSymbol
  };
}
function assertPasswordPolicy(password, settings) {
  if (password.length < settings.minPasswordLength) {
    throw new Error(`Password must be at least ${settings.minPasswordLength} characters`);
  }
  if (settings.requireMixedCase && (!/[a-z]/.test(password) || !/[A-Z]/.test(password))) {
    throw new Error("Password must include upper and lower case letters");
  }
  if (settings.requireDigit && !/\d/.test(password)) {
    throw new Error("Password must include a number");
  }
  if (settings.requireSymbol && !/[^A-Za-z0-9]/.test(password)) {
    throw new Error("Password must include a symbol");
  }
}
function securityStatus() {
  const production = process.env.NODE_ENV === "production";
  const raw = process.env.SESSION_SECRET?.trim() ?? "";
  const configured = Boolean(raw) && raw !== "replace-with-a-long-random-string";
  return {
    sessionSecretConfigured: configured,
    production,
    secureCookies: production,
    dataAdapter: useLocalAdapter() ? "local" : "firestore",
    firebaseConfigured: isFirebaseConfigured()
  };
}

// src/app.ts
init_password();

// src/lib/types/enums.ts
var USER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN_HR",
  "LEGAL_ADMIN",
  "MANAGER",
  "VIEWER"
];
var PERSON_TYPES = [
  "employee",
  "contractor",
  "intern",
  "consultant",
  "other"
];
var EMPLOYMENT_STATUSES = [
  "active",
  "probation",
  "on_leave",
  "terminated",
  "resigned",
  "offer_pending"
];
var PARTY_TYPES = [
  "employee",
  "contractor",
  "intern",
  "client",
  "company",
  "other"
];
var DOCUMENT_FAMILIES = ["EMPLOYMENT", "CLIENT", "OTHER"];
var DOCUMENT_TYPE_CODES = [
  "employment_standard",
  "employment_appointment_setter",
  "employment_executive",
  "internship_agreement",
  "contractor_agreement",
  "promotion_agreement",
  "promotion_amended_employment",
  "employment_amendment",
  "salary_amendment",
  "offer_letter",
  "termination_letter",
  "experience_letter",
  "nda",
  "confidentiality_agreement",
  "ip_agreement",
  "remote_work_agreement",
  "service_agreement",
  "collaboration_agreement",
  "lead_generation_agreement",
  "marketing_agreement",
  "statement_of_work",
  "renewal_agreement",
  "pricing_amendment",
  "service_amendment",
  "custom_agreement"
];
var DOCUMENT_STATUSES = [
  "DRAFT",
  "CONFIGURING",
  "REVIEW_REQUIRED",
  "APPROVED",
  "READY_TO_SEND",
  "SENT",
  "VIEWED",
  "PARTIALLY_SIGNED",
  "SIGNED",
  "FINALIZED",
  "VOIDED",
  "EXPIRED"
];
var CLAUSE_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "optional",
  "role_specific",
  "legacy",
  "archived"
];
var TEMPLATE_STATUSES = ["draft", "active", "archived"];
var RELATIONSHIP_TYPES = [
  "amends",
  "supersedes",
  "supplements",
  "renews",
  "replaces",
  "terminates",
  "references"
];
var SOURCE_DOCUMENT_STATES = [
  "UPLOADED",
  "PROCESSING",
  "ANALYZED",
  "NEEDS_REVIEW",
  "APPROVED",
  "REJECTED"
];
var KNOWLEDGE_DECISIONS = [
  "approve_standard",
  "approve_optional",
  "role_specific",
  "executive_only",
  "legacy_only",
  "ignore"
];
var SIGNING_ORDERS = [
  "recipient_first",
  "company_first",
  "parallel"
];
var SIGNATURE_METHODS = ["draw", "type"];
var SIGNATURE_EVENT_TYPES = [
  "document_sent",
  "email_delivered",
  "document_opened",
  "document_viewed",
  "consent_accepted",
  "otp_verified",
  "signature_started",
  "signature_completed",
  "company_signed",
  "document_finalized",
  "pdf_downloaded",
  "link_revoked",
  "link_extended",
  "reminder_sent"
];
var AUDIT_EVENT_TYPES = [
  "DOCUMENT_CREATED",
  "DOCUMENT_EDITED",
  "DOCUMENT_GENERATED",
  "DOCUMENT_APPROVED",
  "DOCUMENT_SENT",
  "DOCUMENT_OPENED",
  "DOCUMENT_SIGNED",
  "DOCUMENT_COUNTERSIGNED",
  "DOCUMENT_FINALIZED",
  "DOCUMENT_DOWNLOADED",
  "DOCUMENT_VOIDED",
  "TEMPLATE_CREATED",
  "TEMPLATE_UPDATED",
  "TEMPLATE_VERSIONED",
  "CLAUSE_CREATED",
  "CLAUSE_APPROVED",
  "CLAUSE_VERSIONED",
  "SOURCE_DOCUMENT_UPLOADED",
  "SOURCE_DOCUMENT_ANALYZED",
  "KNOWLEDGE_APPROVED",
  "PERSON_CREATED",
  "PERSON_UPDATED",
  "COMPANY_CREATED",
  "COMPANY_UPDATED",
  "SETTINGS_UPDATED",
  "USER_INVITED",
  "USER_ROLE_CHANGED"
];
var RULE_OPERATORS = [
  "equals",
  "not_equals",
  "greater_than",
  "less_than",
  "greater_than_or_equal",
  "less_than_or_equal",
  "contains",
  "not_contains",
  "exists",
  "not_exists",
  "in",
  "not_in"
];
var RULE_COMBINATORS = ["AND", "OR"];
var RULE_ACTION_TYPES = [
  "include_clause",
  "exclude_clause",
  "include_section",
  "exclude_section",
  "recommend_template",
  "recommend_clause",
  "set_field"
];
var SALARY_FREQUENCIES = [
  "hourly",
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "annual"
];
var BONUS_TYPES = [
  "fixed",
  "performance",
  "percentage",
  "commission",
  "custom"
];
var WORK_MODES = ["on_site", "remote", "hybrid", "flexible"];
var SHIFT_TYPES = [
  "standard",
  "evening",
  "night",
  "rotating",
  "flexible"
];
var THEME_IDS = [
  "amplify_classic_white",
  "amplify_modern_dark",
  "amplify_harbor_night",
  "amplify_ember_brief"
];
var DOCUMENT_ACTIONS = [
  "hire",
  "promote",
  "change_salary",
  "amend_agreement",
  "generate_nda",
  "terminate",
  "new_lead_generation",
  "new_collaboration",
  "new_media_buying",
  "new_service_agreement",
  "renew",
  "amend_services",
  "change_pricing",
  "custom"
];
var DOCUMENT_ID_PREFIXES = {
  employment_standard: "EA",
  employment_appointment_setter: "AS",
  employment_executive: "EX",
  internship_agreement: "IN",
  contractor_agreement: "CA",
  promotion_agreement: "PR",
  promotion_amended_employment: "AMEND",
  employment_amendment: "AMEND",
  salary_amendment: "SAL",
  offer_letter: "OL",
  termination_letter: "TL",
  experience_letter: "EL",
  nda: "NDA",
  confidentiality_agreement: "CONF",
  ip_agreement: "IP",
  remote_work_agreement: "RW",
  service_agreement: "SA",
  collaboration_agreement: "COL",
  lead_generation_agreement: "LG",
  marketing_agreement: "MKT",
  statement_of_work: "SOW",
  renewal_agreement: "REN",
  pricing_amendment: "PA",
  service_amendment: "SAM",
  custom_agreement: "CUS"
};

// src/lib/ids.ts
function nextReadableId(args) {
  const prefix = DOCUMENT_ID_PREFIXES[args.documentType] ?? "DOC";
  return `AMP-${prefix}-${args.year}-${String(args.sequence).padStart(4, "0")}`;
}
function randomToken(bytes = 32) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString("base64url");
}
async function sha256Hex(input) {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(digest).toString("hex");
}
function newId(prefix) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}

// src/lib/services/audit-service.ts
async function writeAudit(store, args) {
  const event = {
    id: newId("aud"),
    type: args.type,
    timestamp: nowIso(),
    actorUserId: args.actor?.userId,
    actorEmail: args.actor?.email,
    actorName: args.actor?.displayName,
    entityType: args.entityType,
    entityId: args.entityId,
    summary: args.summary,
    metadata: args.metadata ?? {},
    ipAddress: args.ipAddress
  };
  await store.setDoc("auditEvents", event);
  return event;
}

// src/lib/render/assemble.ts
init_identity();

// src/lib/rules/engine.ts
function getByPath(source3, path) {
  return path.split(".").reduce((acc, key) => {
    if (acc === null || acc === void 0) return void 0;
    if (typeof acc !== "object") return void 0;
    return acc[key];
  }, source3);
}
function asNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return void 0;
}
function asString(value) {
  if (value === null || value === void 0) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
function evaluateCondition(condition, context) {
  const actual = getByPath(context, condition.field);
  const expected = condition.value;
  switch (condition.operator) {
    case "exists":
      return actual !== void 0 && actual !== null && actual !== "";
    case "not_exists":
      return actual === void 0 || actual === null || actual === "";
    case "equals":
      return actual === expected;
    case "not_equals":
      return actual !== expected;
    case "greater_than": {
      const a = asNumber(actual);
      const b = asNumber(expected);
      return a !== void 0 && b !== void 0 && a > b;
    }
    case "less_than": {
      const a = asNumber(actual);
      const b = asNumber(expected);
      return a !== void 0 && b !== void 0 && a < b;
    }
    case "greater_than_or_equal": {
      const a = asNumber(actual);
      const b = asNumber(expected);
      return a !== void 0 && b !== void 0 && a >= b;
    }
    case "less_than_or_equal": {
      const a = asNumber(actual);
      const b = asNumber(expected);
      return a !== void 0 && b !== void 0 && a <= b;
    }
    case "contains":
      return asString(actual).toLowerCase().includes(asString(expected).toLowerCase());
    case "not_contains":
      return !asString(actual).toLowerCase().includes(asString(expected).toLowerCase());
    case "in":
      return Array.isArray(expected) && expected.some((item) => item === actual);
    case "not_in":
      return Array.isArray(expected) && !expected.some((item) => item === actual);
    default:
      return false;
  }
}
function isRuleGroup(value) {
  return "combinator" in value && "conditions" in value;
}
function evaluateRuleGroup(group, context) {
  if (!group || group.conditions.length === 0) return true;
  const results = group.conditions.map(
    (item) => isRuleGroup(item) ? evaluateRuleGroup(item, context) : evaluateCondition(item, context)
  );
  return group.combinator === "AND" ? results.every(Boolean) : results.some(Boolean);
}
function evaluateRules(rules, context) {
  const result = {
    includeClauseIds: /* @__PURE__ */ new Set(),
    excludeClauseIds: /* @__PURE__ */ new Set(),
    includeSectionIds: /* @__PURE__ */ new Set(),
    excludeSectionIds: /* @__PURE__ */ new Set(),
    recommendedTemplateIds: [],
    recommendedClauseIds: [],
    fieldOverrides: {}
  };
  for (const rule of rules) {
    if (!evaluateRuleGroup(rule.when, context)) continue;
    for (const action of rule.then) {
      switch (action.type) {
        case "include_clause":
          if (action.clauseId) result.includeClauseIds.add(action.clauseId);
          break;
        case "exclude_clause":
          if (action.clauseId) result.excludeClauseIds.add(action.clauseId);
          break;
        case "include_section":
          if (action.sectionId) result.includeSectionIds.add(action.sectionId);
          break;
        case "exclude_section":
          if (action.sectionId) result.excludeSectionIds.add(action.sectionId);
          break;
        case "recommend_template":
          if (action.templateId) result.recommendedTemplateIds.push(action.templateId);
          break;
        case "recommend_clause":
          if (action.clauseId) result.recommendedClauseIds.push(action.clauseId);
          break;
        case "set_field":
          if (action.field) result.fieldOverrides[action.field] = action.value;
          break;
      }
    }
  }
  return result;
}
function recommendDocumentType(input) {
  const { partyType, action, hasExistingEmploymentAgreement, historicalTemplateId, historicalReason } = input;
  const isClientParty = partyType === "client" || partyType === "company";
  if (partyType === "employee" && action === "promote" && hasExistingEmploymentAgreement) {
    return {
      templateId: "tpl_promotion_amended",
      reason: "An existing employment agreement exists and the employment relationship is being modified rather than recreated."
    };
  }
  if (partyType === "employee" && action === "change_salary" && hasExistingEmploymentAgreement) {
    return {
      templateId: "tpl_promotion_amended",
      reason: "Salary changes should amend the existing employment agreement."
    };
  }
  if (partyType === "employee" && action === "amend_agreement") {
    return {
      templateId: "tpl_promotion_amended",
      reason: "Amendments should reference and modify the original employment agreement."
    };
  }
  if (partyType === "employee" && action === "generate_nda") {
    return {
      templateId: "tpl_employment_standard",
      reason: "NDA language is available as approved clauses on the employment family."
    };
  }
  if (!isClientParty && historicalTemplateId) {
    return {
      templateId: historicalTemplateId,
      reason: historicalReason ?? "This person\u2019s historical agreement is the starting point."
    };
  }
  if (partyType === "employee" && (action === "hire" || action === "custom")) {
    return {
      templateId: "tpl_employment_standard",
      reason: "A new employment relationship should start from the approved Standard Employment Agreement."
    };
  }
  if (partyType === "contractor") {
    return {
      templateId: "tpl_employment_standard",
      reason: "Contractor engagements use the contractor clause set on the employment family until a dedicated contractor template is selected."
    };
  }
  if (isClientParty && action === "new_lead_generation") {
    return {
      templateId: "tpl_lead_generation",
      reason: "Most Amplify client work starts from the approved Lead Generation Agreement."
    };
  }
  if (isClientParty && action === "new_collaboration") {
    return {
      templateId: "tpl_collaboration",
      reason: "Inbound-call and affiliate partnerships use the approved Collaboration Agreement."
    };
  }
  if (isClientParty && action === "new_media_buying") {
    return {
      templateId: "tpl_media_buying",
      reason: "Paid media management is a distinct engagement from lead generation."
    };
  }
  if (isClientParty && action === "new_service_agreement") {
    return {
      templateId: "tpl_service_agreement",
      reason: "General client work that is not lead generation or media buying uses the Service Agreement."
    };
  }
  if (isClientParty && (action === "renew" || action === "amend_services" || action === "change_pricing" || action === "custom")) {
    if (historicalTemplateId) {
      return {
        templateId: historicalTemplateId,
        reason: historicalReason ?? "This client\u2019s historical agreement is the starting point."
      };
    }
    return {
      templateId: "tpl_lead_generation",
      reason: "Lead-generation and pricing terms are handled through the Lead Generation Agreement family."
    };
  }
  if (isClientParty) {
    if (historicalTemplateId) {
      return {
        templateId: historicalTemplateId,
        reason: historicalReason ?? "Client documents follow this client\u2019s historical agreement type."
      };
    }
    return {
      templateId: "tpl_lead_generation",
      reason: "Client documents default to the approved Lead Generation Agreement."
    };
  }
  return {
    templateId: "tpl_employment_standard",
    reason: "Defaulting to the Standard Employment Agreement based on selected party and action."
  };
}

// src/lib/render/interpolate.ts
function getByPath2(source3, path) {
  return path.split(".").reduce((acc, key) => {
    if (acc === null || acc === void 0) return void 0;
    if (typeof acc !== "object") return void 0;
    return acc[key];
  }, source3);
}
function formatValue(value) {
  if (value === null || value === void 0) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).join(", ");
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US").format(value);
  }
  return String(value);
}
function formatCurrency(amount, currency) {
  const n = typeof amount === "number" ? amount : Number(amount ?? 0);
  const code = typeof currency === "string" && currency ? currency : "PKR";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0
    }).format(n);
  } catch {
    return `${code} ${new Intl.NumberFormat("en-US").format(n)}`;
  }
}
function interpolate(template2, context) {
  return template2.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, raw) => {
    const expr = raw.trim();
    if (expr === "compensation.display") {
      const salary2 = getByPath2(context, "compensation.salary");
      if (!salary2) return "";
      return `${formatCurrency(salary2.amount, salary2.currency)} per ${salary2.frequency ?? "month"}`;
    }
    if (expr === "responsibilities.list") {
      const items = getByPath2(context, "responsibilities");
      if (!Array.isArray(items) || items.length === 0) return "";
      return `<ul>${items.map((item) => `<li>${escapeHtml(String(item))}</li>`).join("")}</ul>`;
    }
    if (expr === "schedule.summary") {
      const days = getByPath2(context, "workingSchedule.workingDays");
      const start = getByPath2(context, "workingSchedule.startTime");
      const end = getByPath2(context, "workingSchedule.endTime");
      const mode = getByPath2(context, "workingSchedule.workMode");
      const dayText = Array.isArray(days) ? days.join(", ") : "";
      return `${dayText}, ${String(start ?? "")}\u2013${String(end ?? "")} (${String(mode ?? "").replaceAll("_", " ")})`;
    }
    if (expr === "address.full") {
      const addr2 = getByPath2(context, "person.residentialAddress");
      if (!addr2) return "";
      return [addr2.line1, addr2.city, addr2.state, addr2.country].filter(Boolean).join(", ");
    }
    if (expr === "company.address") {
      const addr2 = getByPath2(context, "company.address");
      if (!addr2) return String(getByPath2(context, "company.primaryAddress.line1") ?? "");
      return [addr2.line1, addr2.city, addr2.state, addr2.country].filter(Boolean).join(", ");
    }
    const value = getByPath2(context, expr);
    if (typeof value === "string" && value.includes("<")) return value;
    return escapeHtml(formatValue(value));
  });
}
function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

// src/lib/render/assemble.ts
function clauseMap(clauses) {
  return new Map(clauses.map((clause) => [clause.id, clause]));
}
function versionForClause(clause, versions) {
  return versions.find((version) => version.id === clause.currentVersionId) ?? versions.filter((version) => version.clauseId === clause.id && version.status === "approved").sort((a, b) => b.version - a.version)[0];
}
function assembleDocument(input) {
  const {
    template: template2,
    templateVersion,
    clauses,
    clauseVersions,
    theme,
    company: company2,
    person: person2,
    client,
    variables,
    enabledOptionalClauseIds = [],
    disabledClauseIds = [],
    documentId,
    readableId,
    signatures,
    auditCertificate
  } = input;
  const context = {
    ...variables,
    document: {
      id: readableId ?? documentId ?? "DRAFT",
      name: template2.name,
      type: template2.documentType,
      effectiveDate: variables.startDate ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
    },
    company: {
      name: company2.legalName,
      legalName: company2.legalName,
      displayName: company2.displayName,
      address: company2.primaryAddress,
      phone: company2.phone,
      email: company2.email,
      website: company2.website,
      authorizedSignatory: company2.authorizedSignatory,
      authorizedSignatoryTitle: company2.authorizedSignatoryTitle,
      ntn: company2.ntn
    },
    person: person2 ?? {},
    client: client ?? {},
    employeeLevel: typeof variables.employeeLevel === "string" ? variables.employeeLevel : person2?.currentJobTitle?.toLowerCase().includes("chief") || person2?.currentJobTitle?.toLowerCase().includes("director") ? "executive" : "standard"
  };
  const evaluated = evaluateRules(templateVersion.rules, context);
  const clausesById = clauseMap(clauses);
  const includedSectionIds = [];
  const includedClauseIds = [];
  const usedClauseVersionIds = [];
  const sectionsHtml = [];
  let sectionNumber = 0;
  const sortedSections = [...templateVersion.sections].sort((a, b) => a.order - b.order);
  for (const section2 of sortedSections) {
    if (evaluated.excludeSectionIds.has(section2.id)) continue;
    if (section2.includeWhen && !evaluateRuleGroup(section2.includeWhen, context)) continue;
    if (section2.optional && !evaluated.includeSectionIds.has(section2.id) && !section2.required) {
      const hasForcedClause = section2.clauseIds.some((id) => evaluated.includeClauseIds.has(id));
      if (!hasForcedClause) continue;
    }
    const clauseHtml = [];
    for (const clauseId of section2.clauseIds) {
      if (disabledClauseIds.includes(clauseId)) continue;
      if (evaluated.excludeClauseIds.has(clauseId)) continue;
      const clause = clausesById.get(clauseId);
      if (!clause) continue;
      if (clause.status === "optional" && !enabledOptionalClauseIds.includes(clauseId) && !evaluated.includeClauseIds.has(clauseId)) {
        continue;
      }
      const version = versionForClause(clause, clauseVersions);
      if (!version || version.status === "archived") continue;
      if (version.conditions && !evaluateRuleGroup(version.conditions, context)) continue;
      includedClauseIds.push(clause.id);
      usedClauseVersionIds.push(version.id);
      clauseHtml.push(
        `<div class="clause" data-clause-id="${clause.id}" data-clause-version="${version.id}">${interpolate(version.legalText, context)}</div>`
      );
    }
    if (clauseHtml.length === 0 && !section2.required) continue;
    sectionNumber += 1;
    includedSectionIds.push(section2.id);
    const padded = String(sectionNumber).padStart(2, "0");
    const [leadClause, ...restClauses] = clauseHtml;
    sectionsHtml.push(`
      <section class="doc-section" id="${section2.id}">
        <div class="section-lead">
          <h2><span class="section-num">${padded}</span> ${section2.title}</h2>
          ${leadClause ?? ""}
        </div>
        ${restClauses.join("\n")}
      </section>
    `);
  }
  const bodyHtml = sectionsHtml.join("\n");
  const html = wrapDocumentHtml({
    theme,
    company: company2,
    template: template2,
    readableId: readableId ?? "DRAFT",
    partyName: person2?.fullLegalName ?? client?.legalName ?? "Party",
    partyKind: person2 ? "employee" : client ? "client" : "party",
    bodyHtml,
    signatures,
    auditCertificate
  });
  return {
    html,
    bodyHtml,
    includedSectionIds,
    includedClauseIds,
    clauseVersionIds: usedClauseVersionIds,
    context
  };
}
function wrapDocumentHtml(args) {
  const {
    theme,
    company: company2,
    template: template2,
    readableId,
    partyName,
    partyKind = "party",
    bodyHtml,
    signatures,
    auditCertificate
  } = args;
  const isDark = theme.background === "dark";
  const title = template2.name;
  const assets = brandingAssets(isDark);
  const signatureBlock = renderSignatures(
    theme,
    company2,
    partyName,
    partyKind,
    signatures,
    assets.signature,
    company2.sealPath || assets.seal
  );
  const certificate = auditCertificate ? renderAuditCertificate(auditCertificate, readableId, title, partyName) : "";
  const address2 = formatCompanyAddress(company2);
  const partyLabel = partyKind === "employee" ? "Employee" : partyKind === "client" ? "Client" : "Counterparty";
  const companyLabel = partyKind === "employee" ? "Employer" : "Service Provider";
  const host = websiteHost(company2.website);
  const footerBits = [company2.usPhone, company2.phone, company2.email, host].filter(Boolean);
  const footerText = footerBits.join(" \xB7 ");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title} \u2014 ${readableId}</title>
  <style>${documentCss(theme, isDark)}</style>
</head>
<body class="${isDark ? "theme-dark" : "theme-light"}"${theme.showFooter ? ` data-pdf-footer="${footerText}" data-pdf-accent="${theme.accentColor}"` : ""}>
  <div class="pdf-bleed" aria-hidden="true"></div>
  <div class="page">
    ${theme.showHeader ? `<header class="doc-header">
      <img class="brand-logo" src="${assets.logo}" alt="${company2.displayName}" />
      <div class="header-meta">
        <div class="doc-id">${readableId}</div>
      </div>
    </header>` : ""}
    <h1 class="doc-title">${title}</h1>
    <div class="parties">
      <div class="party">
        <div class="party-label">${companyLabel}</div>
        <div class="party-name">${company2.legalName}</div>
        <p>${company2.registrationDetails}</p>
        <p>${address2}</p>
        ${company2.ntn ? `<p>NTN: ${company2.ntn}</p>` : ""}
        <p>${company2.email} \xB7 ${host}</p>
      </div>
      <div class="party">
        <div class="party-label">${partyLabel}</div>
        <div class="party-name">${partyName}</div>
      </div>
    </div>
    ${bodyHtml}
    ${signatureBlock}
    ${theme.showFooter ? `<footer class="doc-footer">
      <span>${footerText}</span>
      ${theme.showPageNumbers ? `<span class="page-num"></span>` : ""}
    </footer>` : ""}
  </div>
  ${certificate}
</body>
</html>`;
}
function renderSignatures(theme, company2, partyName, partyKind, signatures, defaultCompanySignature, sealSrc) {
  const layout2 = theme.signatureLayout === "stacked" ? "stacked" : "side";
  const recipientSig = signatures?.recipient?.imageDataUrl ? `<img class="sig-img" src="${signatures.recipient.imageDataUrl}" alt="Recipient signature" />` : `<div class="sig-line"></div>`;
  const companyImage = signatures?.company?.imageDataUrl ?? defaultCompanySignature;
  const companySig = `<img class="sig-img" src="${companyImage}" alt="${company2.authorizedSignatory} signature" />`;
  const recipientLabel = partyKind === "employee" ? "Employee" : partyKind === "client" ? "Client" : "Recipient";
  return `
    <section class="doc-section signatures ${layout2}">
      <div class="section-lead">
        <h2>Signatures</h2>
        <p>IN WITNESS WHEREOF, the parties have executed this agreement as of the dates written below.</p>
      </div>
      <div class="sig-grid">
        <div class="sig-block">
          <div class="sig-label">${company2.legalName}</div>
          ${companySig}
          <div class="sig-by">By:</div>
          <div class="sig-name">Name: ${company2.authorizedSignatory}</div>
          <div class="sig-title">Title: ${company2.authorizedSignatoryTitle}</div>
          <div class="sig-date">${signatures?.company?.signedAt ? `Date: ${signatures.company.signedAt}` : ""}</div>
        </div>
        <div class="sig-block">
          <div class="sig-label">${recipientLabel}</div>
          ${recipientSig}
          <div class="sig-by">By:</div>
          <div class="sig-name">Name: ${partyName}</div>
          <div class="sig-date">${signatures?.recipient?.signedAt ? `Date: ${signatures.recipient.signedAt}` : "Date: ____________________"}</div>
        </div>
      </div>
      <img class="company-seal" src="${sealSrc}" alt="" />
    </section>
  `;
}
function renderAuditCertificate(cert2, readableId, title, partyName) {
  const rows = [
    ["Document ID", readableId],
    ["Document name", title],
    ["Created", cert2.createdAt],
    ["Sent", cert2.sentAt ?? "\u2014"],
    ["Recipient", `${partyName}${cert2.recipientEmail ? ` \xB7 ${cert2.recipientEmail}` : ""}`],
    ["Viewed", cert2.viewedAt ?? "\u2014"],
    ["Consent accepted", cert2.consentAt ?? "\u2014"],
    ["Recipient signed", cert2.recipientSignedAt ?? "\u2014"],
    ["Company signed", cert2.companySignedAt ?? "\u2014"],
    ["Finalized", cert2.finalizedAt ?? "\u2014"],
    ["SHA-256", cert2.sha256 ?? "Pending finalization"]
  ];
  return `
    <div class="page certificate">
      <h1>Audit Certificate</h1>
      <p class="doc-lede">This certificate records the signing lifecycle for the agreement. It does not replace the signed document.</p>
      <table class="cert-table">
        ${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}
      </table>
    </div>
  `;
}
function documentCss(theme, isDark) {
  const palette = theme.id === "amplify_harbor_night" ? { bg: "#07131a", fg: "#e8f4f2", muted: "#8aa8a4", line: "rgba(94,234,212,0.22)" } : theme.id === "amplify_ember_brief" ? { bg: "#1a120c", fg: "#f4ebe3", muted: "#b09a88", line: "rgba(232,160,106,0.22)" } : isDark ? { bg: "#0c0d0b", fg: "#f4f6ef", muted: "#a3aa9a", line: "rgba(212, 255, 74, 0.18)" } : { bg: "#ffffff", fg: "#161616", muted: "#5c5c5c", line: "rgba(22,22,22,0.12)" };
  const { bg, fg, muted, line } = palette;
  const accent = theme.accentColor;
  const heading = theme.headingFont;
  const body = theme.bodyFont;
  return `
    @page { size: ${theme.pageSize}; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      background: ${bg};
      color: ${fg};
      font-family: ${body}, "IBM Plex Sans", "Helvetica Neue", sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body { font-size: 12.5px; line-height: 1.65; }
    .pdf-bleed { display: none; }
    .page { position: relative; max-width: 820px; margin: 0 auto; padding: 36px 48px 64px; background: ${bg}; }
    @media print {
      html, body { width: 100%; background: ${bg}; }
      .page {
        max-width: none;
        width: auto;
        margin: 0;
        padding: ${theme.margins.top} ${theme.margins.right} ${theme.margins.bottom} ${theme.margins.left};
        background: ${bg};
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
      }
      .certificate { break-before: page; }
      .doc-footer {
        display: flex;
        position: fixed;
        left: ${theme.margins.left};
        right: ${theme.margins.right};
        bottom: 7mm;
        margin: 0;
        padding-top: 8px;
        background: ${bg};
      }
    }
    .doc-header { position: relative; display: flex; flex-direction: column; align-items: center; padding: 0 0 8px; margin-bottom: 18px; }
    .brand-logo { height: 58px; width: auto; max-width: 280px; object-fit: contain; }
    .header-meta { position: absolute; right: 0; top: 0; text-align: right; }
    .doc-id { font-variant-numeric: tabular-nums; letter-spacing: 0.04em; color: ${muted}; font-size: 10px; }
    .doc-title {
      font-family: ${heading}, sans-serif;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.02em;
      text-align: center;
      text-transform: uppercase;
      color: ${accent};
      margin: 0 0 22px;
    }
    .parties { display: grid; gap: 16px; margin: 0 0 28px; }
    .party-label { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: ${muted}; margin-bottom: 4px; }
    .party-name { color: ${accent}; font-size: 15px; font-weight: 600; margin-bottom: 4px; }
    .party p { margin: 0 0 2px; color: ${fg}; }
    .doc-lede { color: ${muted}; margin: 0 0 32px; }
    .doc-section { margin: 0 0 28px; }
    .section-lead { break-inside: avoid; page-break-inside: avoid; }
    .doc-section h2 {
      font-family: ${heading}, sans-serif;
      font-size: 13px;
      font-weight: 560;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      display: flex;
      gap: 12px;
      align-items: baseline;
      border-bottom: 1px solid ${line};
      padding-bottom: 8px;
      margin: 0 0 12px;
      break-after: avoid;
      page-break-after: avoid;
    }
    .section-num { color: ${accent}; font-variant-numeric: tabular-nums; }
    .clause { margin: 0 0 12px; }
    .clause p { margin: 0 0 10px; orphans: 3; widows: 3; }
    .clause ul { margin: 0 0 10px; padding-left: 18px; }
    .signatures { position: relative; }
    .signatures, .sig-grid, .sig-block { break-inside: avoid; page-break-inside: avoid; }
    .sig-grid { display: grid; grid-template-columns: ${theme.signatureLayout === "stacked" ? "1fr" : "1fr 1fr"}; gap: 32px; margin-top: 16px; padding-right: 96px; }
    .sig-block { min-height: 168px; }
    .sig-label { font-size: 11px; letter-spacing: 0.04em; color: ${accent}; font-weight: 600; margin-bottom: 8px; }
    .sig-line { border-bottom: 1px solid ${line}; height: 72px; margin-bottom: 8px; }
    .sig-img { height: 72px; width: auto; max-width: 180px; object-fit: contain; object-position: left bottom; margin: 4px 0 8px; }
    .sig-by { font-size: 12px; margin-bottom: 2px; }
    .sig-name { font-weight: 600; }
    .sig-title, .sig-org, .sig-date { color: ${muted}; font-size: 11px; }
    .company-seal { position: absolute; right: 0; bottom: 0; width: 78px; height: auto; opacity: 0.85; pointer-events: none; }
    .doc-footer { display: flex; justify-content: space-between; color: ${muted}; font-size: 10px; border-top: 2px solid ${accent}; padding-top: 10px; margin-top: 48px; }
    @media screen {
      .page { min-height: 100vh; display: flex; flex-direction: column; }
      .doc-footer { margin-top: auto; }
    }
    .certificate h1 { font-size: 24px; }
    .cert-table { width: 100%; border-collapse: collapse; }
    .cert-table th, .cert-table td { text-align: left; padding: 10px 8px; border-bottom: 1px solid ${line}; vertical-align: top; }
    .cert-table th { width: 34%; color: ${muted}; font-weight: 500; }
  `;
}

// src/lib/services/document-service.ts
init_themes();

// src/lib/validation/schemas.ts
var import_zod = require("zod");
var isoDateSchema = import_zod.z.string().datetime({ offset: true }).or(import_zod.z.string().date());
var timestampSchema = import_zod.z.object({
  seconds: import_zod.z.number().optional(),
  nanoseconds: import_zod.z.number().optional(),
  iso: import_zod.z.string()
});
var actorSchema = import_zod.z.object({
  userId: import_zod.z.string(),
  email: import_zod.z.string().email(),
  displayName: import_zod.z.string(),
  role: import_zod.z.enum(USER_ROLES)
});
var addressSchema = import_zod.z.object({
  line1: import_zod.z.string().default(""),
  line2: import_zod.z.string().default(""),
  city: import_zod.z.string().default(""),
  state: import_zod.z.string().default(""),
  postalCode: import_zod.z.string().default(""),
  country: import_zod.z.string().default("")
});
var salarySchema = import_zod.z.object({
  amount: import_zod.z.number().nonnegative().default(0),
  currency: import_zod.z.string().default("PKR"),
  frequency: import_zod.z.enum(SALARY_FREQUENCIES).default("monthly"),
  paymentTiming: import_zod.z.string().default("monthly in arrears")
});
var bonusSchema = import_zod.z.object({
  enabled: import_zod.z.boolean().default(false),
  type: import_zod.z.enum(BONUS_TYPES).optional(),
  amount: import_zod.z.number().nonnegative().optional(),
  percentage: import_zod.z.number().min(0).max(100).optional(),
  description: import_zod.z.string().optional()
});
var commissionSchema = import_zod.z.object({
  enabled: import_zod.z.boolean().default(false),
  structure: import_zod.z.string().default("")
});
var benefitsSchema = import_zod.z.object({
  enabled: import_zod.z.boolean().default(false),
  items: import_zod.z.array(import_zod.z.string()).default([])
});
var probationSchema = import_zod.z.object({
  enabled: import_zod.z.boolean().default(true),
  duration: import_zod.z.number().int().positive().default(30),
  unit: import_zod.z.enum(["days", "working_days", "months"]).default("days"),
  paid: import_zod.z.boolean().default(true)
});
var compensationSchema = import_zod.z.object({
  salary: salarySchema,
  bonus: bonusSchema,
  commission: commissionSchema,
  benefits: benefitsSchema,
  salaryDeductionClause: import_zod.z.object({ enabled: import_zod.z.boolean().default(false) }).default({
    enabled: false
  })
});
var workingScheduleSchema = import_zod.z.object({
  workingDays: import_zod.z.array(import_zod.z.string()).default(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
  shiftType: import_zod.z.enum(SHIFT_TYPES).default("standard"),
  startTime: import_zod.z.string().default("09:00"),
  endTime: import_zod.z.string().default("18:00"),
  breakStart: import_zod.z.string().default("13:00"),
  breakEnd: import_zod.z.string().default("14:00"),
  timezone: import_zod.z.string().default("Asia/Karachi"),
  workMode: import_zod.z.enum(WORK_MODES).default("on_site"),
  flexibleSchedule: import_zod.z.boolean().default(false),
  urgentAvailability: import_zod.z.boolean().default(false)
});
var ruleGroupSchema = import_zod.z.lazy(
  () => import_zod.z.object({
    combinator: import_zod.z.enum(RULE_COMBINATORS),
    conditions: import_zod.z.array(import_zod.z.union([ruleConditionSchema, ruleGroupSchema]))
  })
);
var ruleConditionSchema = import_zod.z.object({
  field: import_zod.z.string().min(1),
  operator: import_zod.z.enum(RULE_OPERATORS),
  value: import_zod.z.unknown().optional()
});
var ruleActionSchema = import_zod.z.object({
  type: import_zod.z.enum(RULE_ACTION_TYPES),
  clauseId: import_zod.z.string().optional(),
  sectionId: import_zod.z.string().optional(),
  templateId: import_zod.z.string().optional(),
  field: import_zod.z.string().optional(),
  value: import_zod.z.unknown().optional()
});
var ruleSchema = import_zod.z.object({
  id: import_zod.z.string(),
  name: import_zod.z.string(),
  when: ruleGroupSchema,
  then: import_zod.z.array(ruleActionSchema)
});
var orgUserSchema = import_zod.z.object({
  id: import_zod.z.string(),
  email: import_zod.z.string().email(),
  displayName: import_zod.z.string(),
  role: import_zod.z.enum(USER_ROLES),
  active: import_zod.z.boolean().default(true),
  passwordHash: import_zod.z.string().optional(),
  createdAt: import_zod.z.string(),
  lastLoginAt: import_zod.z.string().optional()
});
var personSchema = import_zod.z.object({
  id: import_zod.z.string(),
  firstName: import_zod.z.string().min(1),
  middleName: import_zod.z.string().default(""),
  lastName: import_zod.z.string().min(1),
  fullLegalName: import_zod.z.string().min(1),
  fatherName: import_zod.z.string().default(""),
  identityNumber: import_zod.z.string().default(""),
  dateOfBirth: import_zod.z.string().default(""),
  email: import_zod.z.string().email(),
  phone: import_zod.z.string().default(""),
  residentialAddress: addressSchema.default({
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: ""
  }),
  permanentAddress: addressSchema.default({
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: ""
  }),
  city: import_zod.z.string().default(""),
  province: import_zod.z.string().default(""),
  country: import_zod.z.string().default("Pakistan"),
  employeeId: import_zod.z.string().default(""),
  type: import_zod.z.enum(PERSON_TYPES).default("employee"),
  currentJobTitle: import_zod.z.string().default(""),
  department: import_zod.z.string().default(""),
  reportingManager: import_zod.z.string().default(""),
  employmentStatus: import_zod.z.enum(EMPLOYMENT_STATUSES).default("active"),
  employmentStartDate: import_zod.z.string().default(""),
  currentSalary: import_zod.z.number().nonnegative().default(0),
  salaryCurrency: import_zod.z.string().default("PKR"),
  salaryFrequency: import_zod.z.enum(SALARY_FREQUENCIES).default("monthly"),
  notes: import_zod.z.string().default(""),
  createdAt: import_zod.z.string(),
  updatedAt: import_zod.z.string(),
  createdBy: import_zod.z.string()
});
var companyRecordSchema = import_zod.z.object({
  id: import_zod.z.string(),
  legalName: import_zod.z.string().min(1),
  displayName: import_zod.z.string().min(1),
  companyType: import_zod.z.string().default("LLC"),
  primaryContact: import_zod.z.string().default(""),
  contactTitle: import_zod.z.string().default(""),
  email: import_zod.z.string().email(),
  phone: import_zod.z.string().default(""),
  website: import_zod.z.string().default(""),
  billingAddress: addressSchema,
  businessAddress: addressSchema,
  city: import_zod.z.string().default(""),
  state: import_zod.z.string().default(""),
  postalCode: import_zod.z.string().default(""),
  country: import_zod.z.string().default("United States"),
  jurisdiction: import_zod.z.string().default(""),
  relationshipStatus: import_zod.z.enum(["prospect", "active", "paused", "churned"]).default("active"),
  notes: import_zod.z.string().default(""),
  createdAt: import_zod.z.string(),
  updatedAt: import_zod.z.string(),
  createdBy: import_zod.z.string()
});
var fieldDefinitionSchema = import_zod.z.object({
  key: import_zod.z.string(),
  label: import_zod.z.string(),
  type: import_zod.z.enum([
    "string",
    "number",
    "boolean",
    "date",
    "select",
    "multiselect",
    "textarea",
    "currency",
    "group"
  ]),
  required: import_zod.z.boolean().default(false),
  options: import_zod.z.array(import_zod.z.object({ value: import_zod.z.string(), label: import_zod.z.string() })).optional(),
  visibleWhen: ruleGroupSchema.optional(),
  helpText: import_zod.z.string().optional(),
  placeholder: import_zod.z.string().optional()
});
var templateSectionSchema = import_zod.z.object({
  id: import_zod.z.string(),
  order: import_zod.z.number().int(),
  title: import_zod.z.string(),
  required: import_zod.z.boolean().default(true),
  optional: import_zod.z.boolean().default(false),
  clauseIds: import_zod.z.array(import_zod.z.string()).default([]),
  includeWhen: ruleGroupSchema.optional()
});
var signatureConfigSchema = import_zod.z.object({
  order: import_zod.z.enum(SIGNING_ORDERS).default("recipient_first"),
  requireOtp: import_zod.z.boolean().default(false),
  requireManagerApproval: import_zod.z.boolean().default(false),
  allowDraftDownload: import_zod.z.boolean().default(true),
  expiryDays: import_zod.z.number().int().positive().default(7),
  reminderSchedule: import_zod.z.array(import_zod.z.enum(["24h", "3d", "7d"])).default(["24h", "3d"])
});
var templateSchema = import_zod.z.object({
  id: import_zod.z.string(),
  name: import_zod.z.string(),
  category: import_zod.z.enum(DOCUMENT_FAMILIES),
  documentType: import_zod.z.enum(DOCUMENT_TYPE_CODES),
  description: import_zod.z.string().default(""),
  currentVersionId: import_zod.z.string(),
  currentVersion: import_zod.z.number().int(),
  status: import_zod.z.enum(TEMPLATE_STATUSES).default("active"),
  themeId: import_zod.z.enum(THEME_IDS).default("amplify_modern_dark"),
  createdBy: import_zod.z.string(),
  approvedBy: import_zod.z.string().optional(),
  createdAt: import_zod.z.string(),
  updatedAt: import_zod.z.string(),
  effectiveDate: import_zod.z.string().optional()
});
var templateVersionSchema = import_zod.z.object({
  id: import_zod.z.string(),
  templateId: import_zod.z.string(),
  version: import_zod.z.number().int().positive(),
  name: import_zod.z.string(),
  status: import_zod.z.enum(["draft", "approved", "archived"]).default("approved"),
  themeId: import_zod.z.enum(THEME_IDS),
  requiredFields: import_zod.z.array(fieldDefinitionSchema),
  optionalFields: import_zod.z.array(fieldDefinitionSchema),
  sections: import_zod.z.array(templateSectionSchema),
  rules: import_zod.z.array(ruleSchema),
  signatureConfig: signatureConfigSchema,
  jurisdiction: import_zod.z.string().default("Pakistan"),
  createdBy: import_zod.z.string(),
  approvedBy: import_zod.z.string().optional(),
  createdAt: import_zod.z.string(),
  effectiveDate: import_zod.z.string()
});
var clauseSchema = import_zod.z.object({
  id: import_zod.z.string(),
  title: import_zod.z.string(),
  category: import_zod.z.string(),
  description: import_zod.z.string().default(""),
  currentVersionId: import_zod.z.string(),
  currentVersion: import_zod.z.number().int(),
  status: import_zod.z.enum(CLAUSE_STATUSES).default("approved"),
  tags: import_zod.z.array(import_zod.z.string()).default([]),
  applicableDocumentTypes: import_zod.z.array(import_zod.z.enum(DOCUMENT_TYPE_CODES)).default([]),
  applicableRoles: import_zod.z.array(import_zod.z.string()).default([]),
  applicableJurisdictions: import_zod.z.array(import_zod.z.string()).default([]),
  createdBy: import_zod.z.string(),
  approvedBy: import_zod.z.string().optional(),
  createdAt: import_zod.z.string(),
  updatedAt: import_zod.z.string(),
  effectiveDate: import_zod.z.string().optional()
});
var clauseVersionSchema = import_zod.z.object({
  id: import_zod.z.string(),
  clauseId: import_zod.z.string(),
  version: import_zod.z.number().int().positive(),
  status: import_zod.z.enum(["draft", "approved", "archived"]).default("approved"),
  legalText: import_zod.z.string().min(1),
  conditions: ruleGroupSchema.optional(),
  createdBy: import_zod.z.string(),
  approvedBy: import_zod.z.string().optional(),
  createdAt: import_zod.z.string(),
  effectiveDate: import_zod.z.string(),
  changeNotes: import_zod.z.string().default("")
});
var roleProfileSchema = import_zod.z.object({
  id: import_zod.z.string(),
  name: import_zod.z.string(),
  department: import_zod.z.string().default(""),
  suggestedResponsibilities: import_zod.z.array(import_zod.z.string()),
  suggestedClauseIds: import_zod.z.array(import_zod.z.string()).default([]),
  createdAt: import_zod.z.string(),
  updatedAt: import_zod.z.string()
});
var documentTypeSchema = import_zod.z.object({
  id: import_zod.z.string(),
  code: import_zod.z.enum(DOCUMENT_TYPE_CODES),
  name: import_zod.z.string(),
  family: import_zod.z.enum(DOCUMENT_FAMILIES),
  defaultTemplateId: import_zod.z.string().optional(),
  idPrefix: import_zod.z.string()
});
var documentRelationshipSchema = import_zod.z.object({
  id: import_zod.z.string(),
  fromDocumentId: import_zod.z.string(),
  toDocumentId: import_zod.z.string(),
  type: import_zod.z.enum(RELATIONSHIP_TYPES),
  createdAt: import_zod.z.string(),
  createdBy: import_zod.z.string()
});
var personSnapshotSchema = personSchema.pick({
  id: true,
  firstName: true,
  middleName: true,
  lastName: true,
  fullLegalName: true,
  email: true,
  phone: true,
  identityNumber: true,
  fatherName: true,
  residentialAddress: true,
  city: true,
  province: true,
  country: true,
  employeeId: true,
  type: true,
  currentJobTitle: true
});
var companySnapshotSchema = import_zod.z.object({
  legalName: import_zod.z.string(),
  displayName: import_zod.z.string(),
  address: addressSchema,
  phone: import_zod.z.string(),
  email: import_zod.z.string(),
  website: import_zod.z.string(),
  authorizedSignatory: import_zod.z.string(),
  authorizedSignatoryTitle: import_zod.z.string(),
  ntn: import_zod.z.string().default(""),
  jurisdiction: import_zod.z.string().default("")
});
var documentSnapshotSchema = import_zod.z.object({
  resolvedVariables: import_zod.z.record(import_zod.z.string(), import_zod.z.unknown()),
  personSnapshot: personSnapshotSchema.optional(),
  clientSnapshot: companyRecordSchema.partial().optional(),
  companySnapshot: companySnapshotSchema,
  templateId: import_zod.z.string(),
  templateVersionId: import_zod.z.string(),
  templateVersion: import_zod.z.number(),
  clauseVersionIds: import_zod.z.array(import_zod.z.string()),
  includedSectionIds: import_zod.z.array(import_zod.z.string()),
  includedClauseIds: import_zod.z.array(import_zod.z.string()),
  renderedHtml: import_zod.z.string(),
  jurisdiction: import_zod.z.string(),
  generatedAt: import_zod.z.string(),
  generatedBy: import_zod.z.string()
});
var contractDocumentSchema = import_zod.z.object({
  id: import_zod.z.string(),
  readableId: import_zod.z.string(),
  name: import_zod.z.string(),
  documentType: import_zod.z.enum(DOCUMENT_TYPE_CODES),
  family: import_zod.z.enum(DOCUMENT_FAMILIES),
  status: import_zod.z.enum(DOCUMENT_STATUSES),
  partyType: import_zod.z.enum(PARTY_TYPES),
  personId: import_zod.z.string().optional(),
  companyId: import_zod.z.string().optional(),
  partyName: import_zod.z.string(),
  templateId: import_zod.z.string(),
  templateVersionId: import_zod.z.string(),
  currentVersionId: import_zod.z.string(),
  themeId: import_zod.z.enum(THEME_IDS),
  action: import_zod.z.enum(DOCUMENT_ACTIONS),
  relatedDocumentId: import_zod.z.string().optional(),
  draftPdfPath: import_zod.z.string().optional(),
  finalPdfPath: import_zod.z.string().optional(),
  sha256: import_zod.z.string().optional(),
  ownerId: import_zod.z.string(),
  ownerName: import_zod.z.string(),
  createdAt: import_zod.z.string(),
  updatedAt: import_zod.z.string(),
  lastActivityAt: import_zod.z.string(),
  approvedAt: import_zod.z.string().optional(),
  approvedBy: import_zod.z.string().optional(),
  sentAt: import_zod.z.string().optional(),
  signedAt: import_zod.z.string().optional(),
  finalizedAt: import_zod.z.string().optional(),
  voidedAt: import_zod.z.string().optional(),
  voidReason: import_zod.z.string().optional(),
  generationLock: import_zod.z.string().optional()
});
var documentVersionSchema = import_zod.z.object({
  id: import_zod.z.string(),
  documentId: import_zod.z.string(),
  version: import_zod.z.number().int().positive(),
  status: import_zod.z.enum(DOCUMENT_STATUSES),
  snapshot: documentSnapshotSchema,
  createdAt: import_zod.z.string(),
  createdBy: import_zod.z.string()
});
var signingRequestSchema = import_zod.z.object({
  id: import_zod.z.string(),
  documentId: import_zod.z.string(),
  tokenHash: import_zod.z.string(),
  tokenHint: import_zod.z.string(),
  token: import_zod.z.string().optional(),
  recipientName: import_zod.z.string(),
  recipientEmail: import_zod.z.string().email(),
  status: import_zod.z.enum([
    "pending",
    "viewed",
    "partially_signed",
    "completed",
    "expired",
    "revoked"
  ]),
  order: import_zod.z.enum(SIGNING_ORDERS),
  requireOtp: import_zod.z.boolean().default(false),
  otpHash: import_zod.z.string().optional(),
  otpExpiresAt: import_zod.z.string().optional(),
  expiresAt: import_zod.z.string(),
  recipientSignedAt: import_zod.z.string().optional(),
  companySignedAt: import_zod.z.string().optional(),
  consentAcceptedAt: import_zod.z.string().optional(),
  lastReminderAt: import_zod.z.string().optional(),
  reminderCount: import_zod.z.number().int().default(0),
  createdAt: import_zod.z.string(),
  createdBy: import_zod.z.string()
});
var signatureEventSchema = import_zod.z.object({
  id: import_zod.z.string(),
  signingRequestId: import_zod.z.string(),
  documentId: import_zod.z.string(),
  type: import_zod.z.enum(SIGNATURE_EVENT_TYPES),
  timestamp: import_zod.z.string(),
  ipAddress: import_zod.z.string().optional(),
  userAgent: import_zod.z.string().optional(),
  signerIdentity: import_zod.z.string(),
  metadata: import_zod.z.record(import_zod.z.string(), import_zod.z.unknown()).default({})
});
var storedSignatureSchema = import_zod.z.object({
  id: import_zod.z.string(),
  signingRequestId: import_zod.z.string(),
  documentId: import_zod.z.string(),
  signerRole: import_zod.z.enum(["recipient", "company"]),
  signerName: import_zod.z.string(),
  signerEmail: import_zod.z.string(),
  method: import_zod.z.enum(SIGNATURE_METHODS),
  imagePath: import_zod.z.string(),
  typedText: import_zod.z.string().optional(),
  signedAt: import_zod.z.string()
});
var auditEventSchema = import_zod.z.object({
  id: import_zod.z.string(),
  type: import_zod.z.enum(AUDIT_EVENT_TYPES),
  timestamp: import_zod.z.string(),
  actorUserId: import_zod.z.string().optional(),
  actorEmail: import_zod.z.string().optional(),
  actorName: import_zod.z.string().optional(),
  entityType: import_zod.z.string(),
  entityId: import_zod.z.string(),
  summary: import_zod.z.string(),
  metadata: import_zod.z.record(import_zod.z.string(), import_zod.z.unknown()).default({}),
  ipAddress: import_zod.z.string().optional()
});
var sourceDocumentSchema = import_zod.z.object({
  id: import_zod.z.string(),
  fileName: import_zod.z.string(),
  contentType: import_zod.z.string(),
  storagePath: import_zod.z.string(),
  uploadedAt: import_zod.z.string(),
  uploadedBy: import_zod.z.string(),
  analysisStatus: import_zod.z.enum(SOURCE_DOCUMENT_STATES),
  knowledgeStatus: import_zod.z.enum(["pending", "reviewed", "approved", "ignored"]).default("pending"),
  detectedType: import_zod.z.string().optional(),
  analysisJson: import_zod.z.record(import_zod.z.string(), import_zod.z.unknown()).optional(),
  analysisConfidence: import_zod.z.number().min(0).max(1).optional()
});
var knowledgeFindingSchema = import_zod.z.object({
  id: import_zod.z.string(),
  sourceDocumentId: import_zod.z.string().optional(),
  sourceDocumentIds: import_zod.z.array(import_zod.z.string()).default([]),
  title: import_zod.z.string(),
  category: import_zod.z.string(),
  occurrenceCount: import_zod.z.number().int().default(1),
  sampleText: import_zod.z.string().default(""),
  suggestedClauseId: import_zod.z.string().optional(),
  decision: import_zod.z.enum(KNOWLEDGE_DECISIONS).optional(),
  status: import_zod.z.enum(["pending", "resolved"]).default("pending"),
  createdAt: import_zod.z.string()
});
var documentPackSchema = import_zod.z.object({
  id: import_zod.z.string(),
  name: import_zod.z.string(),
  description: import_zod.z.string().default(""),
  templateIds: import_zod.z.array(import_zod.z.string()),
  createdAt: import_zod.z.string(),
  updatedAt: import_zod.z.string()
});
var themeSchema = import_zod.z.object({
  id: import_zod.z.enum(THEME_IDS),
  name: import_zod.z.string(),
  logoPath: import_zod.z.string().optional(),
  primaryColor: import_zod.z.string(),
  accentColor: import_zod.z.string(),
  headingFont: import_zod.z.string(),
  bodyFont: import_zod.z.string(),
  background: import_zod.z.enum(["dark", "light"]),
  margins: import_zod.z.object({
    top: import_zod.z.string(),
    right: import_zod.z.string(),
    bottom: import_zod.z.string(),
    left: import_zod.z.string()
  }),
  pageSize: import_zod.z.enum(["A4", "Letter"]).default("A4"),
  showHeader: import_zod.z.boolean().default(true),
  showFooter: import_zod.z.boolean().default(true),
  showPageNumbers: import_zod.z.boolean().default(true),
  contactFooter: import_zod.z.boolean().default(true),
  signatureLayout: import_zod.z.enum(["side_by_side", "stacked"]).default("side_by_side")
});
var companySettingsSchema = import_zod.z.object({
  legalName: import_zod.z.string(),
  displayName: import_zod.z.string(),
  companyType: import_zod.z.string().default("Private Limited"),
  registrationDetails: import_zod.z.string().default(""),
  ntn: import_zod.z.string().default(""),
  primaryAddress: addressSchema,
  secondaryAddress: addressSchema.optional(),
  phone: import_zod.z.string(),
  usPhone: import_zod.z.string().optional(),
  email: import_zod.z.string().email(),
  website: import_zod.z.string(),
  authorizedSignatory: import_zod.z.string(),
  authorizedSignatoryTitle: import_zod.z.string(),
  logoPath: import_zod.z.string().optional(),
  signaturePath: import_zod.z.string().optional(),
  sealPath: import_zod.z.string().optional(),
  defaultThemeId: import_zod.z.enum(THEME_IDS).default("amplify_modern_dark"),
  defaultJurisdiction: import_zod.z.string().default("Pakistan"),
  defaultNoticePeriodDays: import_zod.z.number().int().positive().default(30),
  defaultCurrency: import_zod.z.string().default("PKR"),
  defaultProbationDays: import_zod.z.number().int().positive().default(30),
  defaultWorkMode: import_zod.z.enum(WORK_MODES).default("hybrid"),
  defaultPageSize: import_zod.z.enum(["A4", "Letter"]).default("A4")
});
var aiSettingsSchema = import_zod.z.object({
  enabled: import_zod.z.boolean().default(false),
  analyzeUploads: import_zod.z.boolean().default(true),
  recommendTemplates: import_zod.z.boolean().default(true),
  recommendClauses: import_zod.z.boolean().default(true),
  recommendThemes: import_zod.z.boolean().default(true),
  extractFields: import_zod.z.boolean().default(true),
  compareDocuments: import_zod.z.boolean().default(true),
  generateSummaries: import_zod.z.boolean().default(true),
  dashboardInsights: import_zod.z.boolean().default(true),
  draftNewClauses: import_zod.z.boolean().default(false),
  monthlySpendingWarningUsd: import_zod.z.number().nonnegative().default(50),
  hardSpendingLimitUsd: import_zod.z.number().nonnegative().default(150)
});
var aiUsageSchema = import_zod.z.object({
  month: import_zod.z.string(),
  inputTokens: import_zod.z.number().int().default(0),
  outputTokens: import_zod.z.number().int().default(0),
  estimatedCostUsd: import_zod.z.number().default(0),
  requests: import_zod.z.number().int().default(0)
});
var signingSettingsSchema = import_zod.z.object({
  defaultExpiryDays: import_zod.z.number().int().positive().default(7),
  defaultOrder: import_zod.z.enum(SIGNING_ORDERS).default("recipient_first"),
  requireOtpForClientAgreements: import_zod.z.boolean().default(true),
  allowDraftDownload: import_zod.z.boolean().default(true)
});
var emailSettingsSchema = import_zod.z.object({
  fromName: import_zod.z.string().default("ContractOS"),
  fromAddress: import_zod.z.string().default("").refine((value) => !value || value.includes("@"), "Enter a valid from address"),
  replyTo: import_zod.z.string().default("").refine((value) => !value || value.includes("@"), "Enter a valid reply-to address"),
  notifyInternalOnSign: import_zod.z.boolean().default(true),
  notifyRecipientOnComplete: import_zod.z.boolean().default(true),
  sendReminders: import_zod.z.boolean().default(true)
});
var securitySettingsSchema = import_zod.z.object({
  sessionDays: import_zod.z.number().int().min(1).max(90).default(14),
  minPasswordLength: import_zod.z.number().int().min(8).max(128).default(8),
  requireMixedCase: import_zod.z.boolean().default(false),
  requireDigit: import_zod.z.boolean().default(false),
  requireSymbol: import_zod.z.boolean().default(false)
});
var notificationSchema = import_zod.z.object({
  id: import_zod.z.string(),
  userId: import_zod.z.string(),
  title: import_zod.z.string(),
  body: import_zod.z.string(),
  href: import_zod.z.string().optional(),
  read: import_zod.z.boolean().default(false),
  createdAt: import_zod.z.string(),
  type: import_zod.z.string()
});
var generateDocumentInputSchema = import_zod.z.object({
  partyType: import_zod.z.enum(PARTY_TYPES),
  personId: import_zod.z.string().optional(),
  companyId: import_zod.z.string().optional(),
  action: import_zod.z.enum(DOCUMENT_ACTIONS),
  templateId: import_zod.z.string(),
  relatedDocumentId: import_zod.z.string().optional(),
  variables: import_zod.z.record(import_zod.z.string(), import_zod.z.unknown()),
  enabledOptionalClauseIds: import_zod.z.array(import_zod.z.string()).default([]),
  disabledClauseIds: import_zod.z.array(import_zod.z.string()).default([]),
  themeId: import_zod.z.enum(THEME_IDS).optional()
});
var employmentVariablesSchema = import_zod.z.object({
  jobTitle: import_zod.z.string().min(1),
  department: import_zod.z.string().default(""),
  reportingManager: import_zod.z.string().default(""),
  roleProfileId: import_zod.z.string().optional(),
  responsibilities: import_zod.z.array(import_zod.z.string()).default([]),
  startDate: import_zod.z.string().min(1),
  compensation: compensationSchema,
  probation: probationSchema,
  workingSchedule: workingScheduleSchema,
  noticePeriodDays: import_zod.z.number().int().positive().default(30),
  clientProtectionMonths: import_zod.z.number().int().nonnegative().default(12),
  jurisdiction: import_zod.z.string().default("Pakistan"),
  remoteWork: import_zod.z.boolean().default(false)
});
var serviceVariablesSchema = import_zod.z.object({
  services: import_zod.z.array(import_zod.z.string()).default([]),
  serviceFee: import_zod.z.number().nonnegative().default(0),
  feeCurrency: import_zod.z.string().default("USD"),
  feeFrequency: import_zod.z.enum(["monthly", "one_time", "quarterly"]).default("monthly"),
  termMonths: import_zod.z.number().int().positive().default(12),
  adSpendPaidSeparately: import_zod.z.boolean().default(true),
  noSalesGuarantee: import_zod.z.boolean().default(true),
  clientOwnsLeads: import_zod.z.boolean().default(true),
  startDate: import_zod.z.string().min(1),
  jurisdiction: import_zod.z.string().default("United States")
});
var createPersonSchema = personSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true
});
var createCompanySchema = companyRecordSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true
});

// src/lib/services/document-service.ts
async function loadGenerationContext(store, templateId) {
  const template2 = await store.getDoc("templates", templateId);
  if (!template2) throw new Error("Template not found");
  const templateVersion = await store.getDoc(
    "templateVersions",
    template2.currentVersionId
  );
  if (!templateVersion) throw new Error("Template version not found");
  const clauses = await store.listDocs("clauses");
  const clauseVersions = await store.listDocs("clauseVersions");
  const themes = await store.listDocs("themes");
  const company2 = await store.getSettings("company");
  return { template: template2, templateVersion, clauses, clauseVersions, themes, company: company2 };
}
async function previewFromInput(store, input) {
  const parsed = generateDocumentInputSchema.parse(input);
  const ctx = await loadGenerationContext(store, parsed.templateId);
  const person2 = parsed.personId ? await store.getDoc("people", parsed.personId) : null;
  const client = parsed.companyId ? await store.getDoc("companies", parsed.companyId) : null;
  const themeLookupId = resolveThemeId(
    parsed.themeId ?? ctx.company.defaultThemeId ?? ctx.template.themeId
  );
  const theme = ctx.themes.find((item) => item.id === themeLookupId) ?? themeById(themeLookupId) ?? ctx.themes[0];
  const assembled = assembleDocument({
    template: ctx.template,
    templateVersion: ctx.templateVersion,
    clauses: ctx.clauses,
    clauseVersions: ctx.clauseVersions,
    theme,
    company: ctx.company,
    person: person2,
    client,
    variables: parsed.variables,
    enabledOptionalClauseIds: parsed.enabledOptionalClauseIds,
    disabledClauseIds: parsed.disabledClauseIds
  });
  return {
    html: assembled.html,
    includedSectionIds: assembled.includedSectionIds,
    includedClauseIds: assembled.includedClauseIds,
    clauseVersionIds: assembled.clauseVersionIds,
    template: ctx.template,
    templateVersion: ctx.templateVersion
  };
}
async function generateDocument(store, actor5, input) {
  const parsed = generateDocumentInputSchema.parse(input);
  return store.transact(async (tx) => {
    const preview = await previewFromInput(tx, parsed);
    const person2 = parsed.personId ? await tx.getDoc("people", parsed.personId) : null;
    const client = parsed.companyId ? await tx.getDoc("companies", parsed.companyId) : null;
    const company2 = await tx.getSettings("company");
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    const prefix = preview.template.documentType;
    const sequences = await tx.getSettings("sequences");
    const seqKey = `${year}-${prefix}`;
    const next = (sequences[seqKey] ?? 0) + 1;
    sequences[seqKey] = next;
    await tx.setSettings("sequences", sequences);
    const readableId = nextReadableId({
      documentType: preview.template.documentType,
      year,
      sequence: next
    });
    const documentId = newId("doc");
    const versionId = newId("dv");
    const now = nowIso();
    const partyName = person2?.fullLegalName ?? client?.legalName ?? "Party";
    const family = preview.template.category;
    const needsReview = preview.templateVersion.signatureConfig.requireManagerApproval;
    const generatedThemeId = resolveThemeId(
      parsed.themeId ?? company2.defaultThemeId ?? preview.template.themeId
    );
    const themeList = await tx.listDocs("themes");
    const assembled = assembleDocument({
      template: preview.template,
      templateVersion: preview.templateVersion,
      clauses: await tx.listDocs("clauses"),
      clauseVersions: await tx.listDocs("clauseVersions"),
      theme: themeList.find((item) => item.id === generatedThemeId) ?? themeById(generatedThemeId) ?? themeList[0],
      company: company2,
      person: person2,
      client,
      variables: parsed.variables,
      enabledOptionalClauseIds: parsed.enabledOptionalClauseIds,
      disabledClauseIds: parsed.disabledClauseIds,
      documentId,
      readableId
    });
    const document = {
      id: documentId,
      readableId,
      name: `${preview.template.name} \u2014 ${partyName}`,
      documentType: preview.template.documentType,
      family,
      status: needsReview ? "REVIEW_REQUIRED" : "APPROVED",
      partyType: parsed.partyType,
      personId: parsed.personId,
      companyId: parsed.companyId,
      partyName,
      templateId: preview.template.id,
      templateVersionId: preview.templateVersion.id,
      currentVersionId: versionId,
      themeId: generatedThemeId,
      action: parsed.action,
      relatedDocumentId: parsed.relatedDocumentId,
      ownerId: actor5.userId,
      ownerName: actor5.displayName,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      generationLock: `${documentId}:${now}`,
      approvedAt: needsReview ? void 0 : now,
      approvedBy: needsReview ? void 0 : actor5.userId
    };
    const version = {
      id: versionId,
      documentId,
      version: 1,
      status: document.status,
      createdAt: now,
      createdBy: actor5.userId,
      snapshot: {
        resolvedVariables: parsed.variables,
        personSnapshot: person2 ? {
          id: person2.id,
          firstName: person2.firstName,
          middleName: person2.middleName,
          lastName: person2.lastName,
          fullLegalName: person2.fullLegalName,
          email: person2.email,
          phone: person2.phone,
          identityNumber: person2.identityNumber,
          fatherName: person2.fatherName,
          residentialAddress: person2.residentialAddress,
          city: person2.city,
          province: person2.province,
          country: person2.country,
          employeeId: person2.employeeId,
          type: person2.type,
          currentJobTitle: person2.currentJobTitle
        } : void 0,
        clientSnapshot: client ?? void 0,
        companySnapshot: {
          legalName: company2.legalName,
          displayName: company2.displayName,
          address: company2.primaryAddress,
          phone: company2.phone,
          email: company2.email,
          website: company2.website,
          authorizedSignatory: company2.authorizedSignatory,
          authorizedSignatoryTitle: company2.authorizedSignatoryTitle,
          ntn: company2.ntn,
          jurisdiction: company2.defaultJurisdiction
        },
        templateId: preview.template.id,
        templateVersionId: preview.templateVersion.id,
        templateVersion: preview.templateVersion.version,
        clauseVersionIds: assembled.clauseVersionIds,
        includedSectionIds: assembled.includedSectionIds,
        includedClauseIds: assembled.includedClauseIds,
        renderedHtml: assembled.html,
        jurisdiction: String(parsed.variables.jurisdiction ?? company2.defaultJurisdiction),
        generatedAt: now,
        generatedBy: actor5.userId
      }
    };
    await tx.setDoc("documents", document);
    await tx.setDoc("documentVersions", version);
    if (parsed.relatedDocumentId) {
      await tx.setDoc("documentRelationships", {
        id: newId("rel"),
        fromDocumentId: documentId,
        toDocumentId: parsed.relatedDocumentId,
        type: parsed.action === "renew" ? "renews" : parsed.action === "terminate" ? "terminates" : "amends",
        createdAt: now,
        createdBy: actor5.userId
      });
    }
    await writeAudit(tx, {
      type: "DOCUMENT_GENERATED",
      actor: actor5,
      entityType: "document",
      entityId: documentId,
      summary: `Generated ${readableId} from template ${preview.template.name} v${preview.templateVersion.version}.`,
      metadata: {
        templateVersionId: preview.templateVersion.id,
        clauseVersionIds: assembled.clauseVersionIds
      }
    });
    return document;
  });
}
async function approveDocument(store, actor5, documentId) {
  const document = await store.getDoc("documents", documentId);
  if (!document) throw new Error("Document not found");
  if (document.status === "FINALIZED" || document.status === "VOIDED") {
    throw new Error("Finalized or voided documents cannot be approved again");
  }
  const now = nowIso();
  const next = {
    ...document,
    status: "APPROVED",
    approvedAt: now,
    approvedBy: actor5.userId,
    updatedAt: now,
    lastActivityAt: now
  };
  await store.setDoc("documents", next);
  await writeAudit(store, {
    type: "DOCUMENT_APPROVED",
    actor: actor5,
    entityType: "document",
    entityId: documentId,
    summary: `${document.readableId} approved.`
  });
  return next;
}
async function voidDocument(store, actor5, documentId, reason) {
  const document = await store.getDoc("documents", documentId);
  if (!document) throw new Error("Document not found");
  if (document.status === "FINALIZED") throw new Error("Finalized documents cannot be voided");
  const now = nowIso();
  const next = {
    ...document,
    status: "VOIDED",
    voidedAt: now,
    voidReason: reason,
    updatedAt: now,
    lastActivityAt: now
  };
  await store.setDoc("documents", next);
  await writeAudit(store, {
    type: "DOCUMENT_VOIDED",
    actor: actor5,
    entityType: "document",
    entityId: documentId,
    summary: `${document.readableId} voided. Reason: ${reason}`,
    metadata: { reason }
  });
  return next;
}
function bytesToDataUrl(bytes, contentType) {
  return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
}
async function assembleCurrentHtml(store, documentId, options) {
  const document = await store.getDoc("documents", documentId);
  if (!document) throw new Error("Document not found");
  const version = await store.getDoc("documentVersions", document.currentVersionId);
  if (!version) throw new Error("Document version not found");
  const company2 = await store.getSettings("company");
  const template2 = await store.getDoc("templates", document.templateId);
  const templateVersion = await store.getDoc(
    "templateVersions",
    document.templateVersionId
  );
  if (!template2 || !templateVersion) throw new Error("Template not found");
  const themeId = resolveThemeId(document.themeId);
  const theme = (await store.listDocs("themes")).find((item) => item.id === themeId) ?? themeById(themeId) ?? (await store.listDocs("themes"))[0];
  const person2 = version.snapshot.personSnapshot ?? (document.personId ? await store.getDoc("people", document.personId) : null);
  const client = version.snapshot.clientSnapshot ?? (document.companyId ? await store.getDoc("companies", document.companyId) : null);
  const signatures = await store.queryDocs(
    "storedSignatures",
    (item) => item.documentId === documentId
  );
  const recipient = signatures.find((item) => item.signerRole === "recipient");
  const companySig = signatures.find((item) => item.signerRole === "company");
  const recipientImage = recipient ? await store.getFile(recipient.imagePath) : null;
  const companyImage = companySig ? await store.getFile(companySig.imagePath) : null;
  const finalizedAt = options?.finalizedAt ?? document.finalizedAt;
  return assembleDocument({
    template: template2,
    templateVersion,
    clauses: await store.listDocs("clauses"),
    clauseVersions: await store.listDocs("clauseVersions"),
    theme,
    company: company2,
    person: person2,
    client,
    variables: version.snapshot.resolvedVariables,
    enabledOptionalClauseIds: version.snapshot.includedClauseIds,
    documentId: document.id,
    readableId: document.readableId,
    signatures: recipient || companySig ? {
      recipient: recipient ? {
        name: recipient.signerName,
        imageDataUrl: recipientImage ? bytesToDataUrl(recipientImage.bytes, recipientImage.contentType) : void 0,
        signedAt: recipient.signedAt.slice(0, 10)
      } : void 0,
      company: companySig ? {
        name: company2.authorizedSignatory,
        imageDataUrl: companyImage ? bytesToDataUrl(companyImage.bytes, companyImage.contentType) : void 0,
        signedAt: companySig.signedAt.slice(0, 10)
      } : void 0
    } : void 0,
    auditCertificate: finalizedAt ? {
      createdAt: document.createdAt,
      sentAt: document.sentAt,
      recipientSignedAt: recipient?.signedAt,
      companySignedAt: companySig?.signedAt,
      finalizedAt,
      sha256: document.sha256,
      recipientName: recipient?.signerName,
      recipientEmail: recipient?.signerEmail
    } : void 0
  }).html;
}

// src/lib/services/signing-service.ts
var import_node_crypto3 = require("node:crypto");
init_config();

// src/lib/services/email-service.ts
init_config();
var ConsoleEmailProvider = class {
  name = "console";
  async send(message) {
    console.info("[email]", {
      to: message.to,
      from: message.from,
      replyTo: message.replyTo,
      subject: message.subject,
      preview: message.text ?? message.html.replace(/<[^>]+>/g, " ").slice(0, 180)
    });
  }
};
var ResendEmailProvider = class {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }
  name = "resend";
  async send(message) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: message.from ?? envEmailFrom(),
        reply_to: message.replyTo || void 0,
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text
      })
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend error ${res.status}: ${detail.slice(0, 240) || res.statusText}`);
    }
  }
};
function envEmailFrom() {
  return process.env.EMAIL_FROM ?? "ContractOS <onboarding@resend.dev>";
}
function formatEmailFrom(settings) {
  const address2 = settings?.fromAddress?.trim();
  if (address2?.includes("@")) {
    const name = settings?.fromName?.trim();
    return name ? `${name} <${address2}>` : address2;
  }
  return envEmailFrom();
}
function getEmailProvider() {
  const key = process.env.EMAIL_API_KEY?.trim();
  const driver = (process.env.EMAIL_PROVIDER ?? (key ? "resend" : "console")).toLowerCase();
  if (driver === "resend" && key) return new ResendEmailProvider(key);
  return new ConsoleEmailProvider();
}
function emailTransportStatus(settings) {
  const provider = getEmailProvider();
  return {
    configured: provider.name === "resend",
    provider: provider.name,
    from: formatEmailFrom(settings)
  };
}
async function loadEmailSettings(store) {
  const stored = await store.getSettings("email");
  return {
    fromName: stored?.fromName ?? "ContractOS",
    fromAddress: stored?.fromAddress ?? "",
    replyTo: stored?.replyTo ?? "",
    notifyInternalOnSign: stored?.notifyInternalOnSign ?? true,
    notifyRecipientOnComplete: stored?.notifyRecipientOnComplete ?? true,
    sendReminders: stored?.sendReminders ?? true
  };
}
async function emailIdentityFromStore(store) {
  const settings = await loadEmailSettings(store);
  return {
    from: formatEmailFrom(settings),
    replyTo: settings.replyTo?.trim() || void 0
  };
}
var TEMPLATES = {
  document_sent: (data) => ({
    to: data.recipientEmail ?? "",
    subject: `${data.companyName}: ${data.documentName} is ready to sign`,
    html: layout(
      data,
      `<p>Hello ${data.recipientName},</p>
       <p>${data.companyName} has sent <strong>${data.documentName}</strong> for your review and electronic signature.</p>
       <p><a class="btn" href="${data.signUrl}">Review and sign</a></p>
       <p class="muted">This link expires on ${data.expiresAt}.</p>`
    )
  }),
  signing_reminder: (data) => ({
    to: data.recipientEmail ?? "",
    subject: `Reminder: ${data.documentName} is waiting for your signature`,
    html: layout(
      data,
      `<p>Hello ${data.recipientName},</p>
       <p>This is a reminder to review and sign <strong>${data.documentName}</strong>.</p>
       <p><a class="btn" href="${data.signUrl}">Continue signing</a></p>`
    )
  }),
  recipient_signed: (data) => ({
    to: data.to,
    subject: `${data.recipientName} signed ${data.documentName}`,
    html: layout(data, `<p>${data.recipientName} has signed ${data.documentName}.</p>`)
  }),
  company_signature_required: (data) => ({
    to: data.to,
    subject: `Countersignature required: ${data.documentName}`,
    html: layout(
      data,
      `<p>${data.recipientName} has signed ${data.documentName}. An authorized Amplify representative should countersign to finalize.</p>
       <p><a class="btn" href="${data.signaturesUrl ?? `${appUrl()}/signatures`}">Open signatures</a></p>`
    )
  }),
  agreement_completed: (data) => ({
    to: data.to,
    subject: `Completed: ${data.documentName}`,
    html: layout(
      data,
      `<p>Hello ${data.recipientName},</p>
       <p>${data.documentName} is complete. All required signatures have been collected.</p>
       <p><a class="btn" href="${data.downloadUrl ?? appUrl()}">View agreement</a></p>`
    )
  }),
  signing_expired: (data) => ({
    to: data.to,
    subject: `Signing link expired: ${data.documentName}`,
    html: layout(data, `<p>The signing link for ${data.documentName} has expired.</p>`)
  }),
  test_message: (data) => ({
    to: data.to,
    subject: "Amplify ContractOS email test",
    html: layout(
      data,
      `<p>This is a test message from Amplify ContractOS.</p>
       <p class="muted">If you received this, Resend delivery is working for ${data.companyName ?? "Amplify"}.</p>`
    )
  })
};
function layout(data, body) {
  const company2 = data.companyName ?? "Amplify Media Technologies";
  return `<!DOCTYPE html>
  <html><body style="font-family:Inter,Arial,sans-serif;background:#0c0d0b;color:#f4f6ef;padding:32px">
    <div style="max-width:560px;margin:0 auto;background:#141511;border:1px solid rgba(212,255,74,.15);border-radius:16px;padding:28px">
      <div style="letter-spacing:.28em;font-size:12px;color:#D4FF4A">AMPLIFY CONTRACTOS</div>
      <div style="color:#a3aa9a;margin:6px 0 24px">${company2}</div>
      ${body}
      <p style="color:#a3aa9a;font-size:12px;margin-top:32px">This message was sent by Amplify ContractOS. Branding is controlled by company settings, not by the email transport.</p>
    </div>
    <style>.btn{display:inline-block;background:#D4FF4A;color:#111;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:600}.muted{color:#a3aa9a}</style>
  </body></html>`;
}
async function sendTemplatedEmail(args) {
  const provider = getEmailProvider();
  const identity = args.store ? await emailIdentityFromStore(args.store) : { from: args.from ?? envEmailFrom(), replyTo: args.replyTo };
  const built = TEMPLATES[args.template]({ ...args.data, to: args.to, recipientEmail: args.to });
  await provider.send({
    ...built,
    to: args.to,
    from: args.from ?? identity.from,
    replyTo: args.replyTo ?? identity.replyTo
  });
  return { delivered: provider.name === "resend", provider: provider.name };
}

// src/lib/services/pdf-service.ts
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
var DEFAULT_MARGINS = { top: "18mm", right: "16mm", bottom: "18mm", left: "16mm" };
function parseMargins(html) {
  const padded = html.match(
    /@media print[\s\S]*?padding:\s*([0-9.]+(?:mm|in|px))\s+([0-9.]+(?:mm|in|px))\s+([0-9.]+(?:mm|in|px))\s+([0-9.]+(?:mm|in|px))/
  );
  if (padded) {
    return { top: padded[1], right: padded[2], bottom: padded[3], left: padded[4] };
  }
  const pageMargin = html.match(/@page\s*\{[^}]*margin:\s*([^;}]+)/);
  if (pageMargin) {
    const parts = pageMargin[1].trim().split(/\s+/);
    if (parts.length === 4) {
      if (parts.every((part) => /^0(?:mm|px|in)?$/.test(part))) return DEFAULT_MARGINS;
      return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
    }
    if (parts.length === 2) return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
    if (parts.length === 1 && parts[0] !== "0") {
      return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
    }
  }
  return DEFAULT_MARGINS;
}
function inlinePublicAssets(html) {
  return html.replace(/src="(\/(?:branding)\/[^"]+)"/g, (full, path) => {
    const file = (0, import_node_path2.join)(process.cwd(), "public", path);
    if (!(0, import_node_fs2.existsSync)(file)) return full;
    const bytes = (0, import_node_fs2.readFileSync)(file);
    const mime = path.endsWith(".jpg") || path.endsWith(".jpeg") ? "image/jpeg" : "image/png";
    return `src="data:${mime};base64,${bytes.toString("base64")}"`;
  });
}
function prepareHtmlForPdf(html) {
  const format = /size:\s*Letter/i.test(html) ? "Letter" : "A4";
  const dark = /theme-dark/.test(html) || /background:\s*#0c0d0b/i.test(html);
  const background = dark ? "#0c0d0b" : "#ffffff";
  const margins = parseMargins(html);
  const stripped = html.replace(/@page\s*\{[^}]*\}/g, "");
  const css = `
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: ${background} !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .pdf-bleed { display: none !important; }
    .page {
      max-width: none !important;
      width: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: ${margins.top} ${margins.right} ${margins.bottom} ${margins.left} !important;
      background: ${background} !important;
      box-decoration-break: clone !important;
      -webkit-box-decoration-break: clone !important;
    }
    .doc-footer {
      display: flex !important;
      position: fixed !important;
      left: ${margins.left} !important;
      right: ${margins.right} !important;
      bottom: 7mm !important;
      margin: 0 !important;
      background: ${background} !important;
    }
    .certificate { break-before: page; }
    .section-lead, .signatures, .sig-grid, .sig-block {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .doc-section h2 {
      break-after: avoid !important;
      page-break-after: avoid !important;
    }
    .clause p, .clause li {
      orphans: 3;
      widows: 3;
    }
  `;
  const prepared = stripped.includes("</head>") ? stripped.replace("</head>", `<style data-pdf-bleed="true">${css}</style></head>`) : `<style data-pdf-bleed="true">${css}</style>${stripped}`;
  return { html: inlinePublicAssets(prepared), format };
}
async function renderPdf(html) {
  try {
    const { chromium } = await import("playwright");
    const prepared = prepareHtmlForPdf(html);
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ media: "print" });
      await page.setContent(prepared.html, { waitUntil: "load" });
      const pdf = await page.pdf({
        width: prepared.format === "Letter" ? "8.5in" : "210mm",
        height: prepared.format === "Letter" ? "11in" : "297mm",
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: false,
        margin: { top: "0", right: "0", bottom: "0", left: "0" }
      });
      return new Uint8Array(pdf);
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.warn("[pdf] Playwright unavailable, storing HTML fallback", error);
    return new TextEncoder().encode(html);
  }
}

// src/lib/services/signing-service.ts
async function recordEvent(store, args) {
  const event = {
    id: newId("sev"),
    signingRequestId: args.request.id,
    documentId: args.request.documentId,
    type: args.type,
    timestamp: nowIso(),
    ipAddress: args.ip,
    userAgent: args.ua,
    signerIdentity: args.identity,
    metadata: args.metadata ?? {}
  };
  await store.setDoc("signatureEvents", event);
  return event;
}
async function sendForSignature(store, actor5, documentId, recipient, options) {
  const document = await store.getDoc("documents", documentId);
  if (!document) throw new Error("Document not found");
  if (document.status === "VOIDED" || document.status === "FINALIZED") {
    throw new Error("This document cannot be sent for signature");
  }
  const sendable = ["APPROVED", "READY_TO_SEND", "SENT", "VIEWED"];
  if (!sendable.includes(document.status)) {
    throw new Error("Document must be approved before sending");
  }
  const existing = await store.queryDocs(
    "signingRequests",
    (item) => item.documentId === documentId && item.status !== "revoked" && item.status !== "completed"
  );
  for (const prior of existing) {
    await store.setDoc("signingRequests", { ...prior, status: "revoked" });
  }
  const templateVersion = await store.getDoc(
    "templateVersions",
    document.templateVersionId
  );
  const signing = await store.getSettings("signing");
  const expiryDays = signing.defaultExpiryDays ?? templateVersion?.signatureConfig.expiryDays ?? 7;
  const order = signing.defaultOrder ?? templateVersion?.signatureConfig.order ?? "recipient_first";
  const requireOtp = templateVersion?.signatureConfig.requireOtp === true || document.family === "CLIENT" && Boolean(signing.requireOtpForClientAgreements);
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const now = nowIso();
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1e3).toISOString();
  const request = {
    id: newId("sig"),
    documentId,
    tokenHash,
    tokenHint: token.slice(0, 6),
    token,
    recipientName: recipient.name,
    recipientEmail: recipient.email,
    status: "pending",
    order,
    requireOtp,
    expiresAt,
    reminderCount: 0,
    createdAt: now,
    createdBy: actor5.userId
  };
  await store.setDoc("signingRequests", request);
  const next = {
    ...document,
    status: "SENT",
    sentAt: now,
    updatedAt: now,
    lastActivityAt: now
  };
  await store.setDoc("documents", next);
  await recordEvent(store, {
    request,
    type: "document_sent",
    identity: actor5.email
  });
  await writeAudit(store, {
    type: "DOCUMENT_SENT",
    actor: actor5,
    entityType: "document",
    entityId: documentId,
    summary: `${document.readableId} sent for signature to ${recipient.email}.`
  });
  const origin = options?.appUrl ?? await requestAppUrl();
  const url = `${origin}/sign/${token}`;
  const company2 = await store.getSettings("company");
  const delivery = await sendTemplatedEmail({
    store,
    to: recipient.email,
    template: "document_sent",
    data: {
      recipientName: recipient.name,
      documentName: document.name,
      companyName: company2.legalName,
      signUrl: url,
      expiresAt
    }
  });
  return {
    url,
    recipientEmail: recipient.email,
    recipientName: recipient.name,
    emailDelivered: delivery.delivered,
    emailProvider: delivery.provider
  };
}
async function getActiveSigningLink(store, documentId, options) {
  const requests = (await store.queryDocs(
    "signingRequests",
    (item) => item.documentId === documentId && item.status !== "revoked" && item.status !== "completed"
  )).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const request = requests[0];
  if (!request?.token) return null;
  if (new Date(request.expiresAt).getTime() < Date.now()) return null;
  const origin = options?.appUrl ?? await requestAppUrl();
  return {
    url: `${origin}/sign/${request.token}`,
    recipientEmail: request.recipientEmail,
    recipientName: request.recipientName,
    emailDelivered: false,
    emailProvider: "console"
  };
}
async function getSigningByToken(store, token) {
  const tokenHash = await sha256Hex(token);
  const requests = await store.queryDocs(
    "signingRequests",
    (item) => item.tokenHash === tokenHash
  );
  const request = requests[0];
  if (!request) return null;
  if (request.status === "revoked") return null;
  if (new Date(request.expiresAt).getTime() < Date.now()) return null;
  const document = await store.getDoc("documents", request.documentId);
  const version = document ? await store.getDoc("documentVersions", document.currentVersionId) : null;
  if (!document || !version) return null;
  return { request, document, version };
}
async function markOpened(store, request, ip, ua) {
  if (request.status === "pending") {
    await store.setDoc("signingRequests", { ...request, status: "viewed" });
  }
  const document = await store.getDoc("documents", request.documentId);
  if (document && (document.status === "SENT" || document.status === "VIEWED")) {
    await store.setDoc("documents", {
      ...document,
      status: "VIEWED",
      updatedAt: nowIso(),
      lastActivityAt: nowIso()
    });
  }
  await recordEvent(store, {
    request,
    type: "document_opened",
    identity: request.recipientEmail,
    ip,
    ua
  });
}
async function acceptConsent(store, request, ip, ua) {
  const now = nowIso();
  await store.setDoc("signingRequests", { ...request, consentAcceptedAt: now });
  await recordEvent(store, {
    request,
    type: "consent_accepted",
    identity: request.recipientEmail,
    ip,
    ua
  });
}
async function applyRecipientSignature(store, request, args) {
  return store.transact(async (tx) => {
    const current = await tx.getDoc("signingRequests", request.id);
    if (!current) throw new Error("Signing request not found");
    if (current.recipientSignedAt) throw new Error("This party has already signed");
    if (current.status === "revoked") throw new Error("This signing link has been revoked");
    if (new Date(current.expiresAt).getTime() < Date.now()) throw new Error("This signing link has expired");
    const now = nowIso();
    const path = `organizations/${tx.orgId}/documents/${current.documentId}/signatures/${current.id}-recipient.png`;
    const bytes = dataUrlToBytes(args.imageDataUrl);
    await tx.putFile(path, bytes, "image/png");
    const signature = {
      id: newId("ssig"),
      signingRequestId: current.id,
      documentId: current.documentId,
      signerRole: "recipient",
      signerName: current.recipientName,
      signerEmail: current.recipientEmail,
      method: args.method,
      imagePath: path,
      typedText: args.typedText,
      signedAt: now
    };
    await tx.setDoc("storedSignatures", signature);
    await tx.setDoc("signingRequests", {
      ...current,
      recipientSignedAt: now,
      status: "partially_signed"
    });
    const document = await tx.getDoc("documents", current.documentId);
    if (document) {
      await tx.setDoc("documents", {
        ...document,
        status: "PARTIALLY_SIGNED",
        updatedAt: now,
        lastActivityAt: now
      });
    }
    await recordEvent(tx, {
      request: current,
      type: "signature_completed",
      identity: current.recipientEmail,
      ip: args.ip,
      ua: args.ua
    });
    await writeAudit(tx, {
      type: "DOCUMENT_SIGNED",
      entityType: "document",
      entityId: current.documentId,
      summary: `${current.recipientName} signed ${document?.readableId ?? current.documentId}.`
    });
    const company2 = await tx.getSettings("company");
    const emailSettings = await loadEmailSettings(tx);
    if (emailSettings.notifyInternalOnSign && company2.email) {
      const origin = await requestAppUrl();
      await sendTemplatedEmail({
        store: tx,
        to: company2.email,
        template: "company_signature_required",
        data: {
          documentName: document?.name ?? "Agreement",
          recipientName: current.recipientName,
          companyName: company2.legalName,
          signaturesUrl: `${origin}/signatures`
        }
      });
    }
    return signature;
  });
}
async function applyCompanySignature(store, actor5, documentId, args) {
  return store.transact(async (tx) => {
    const requests = await tx.queryDocs(
      "signingRequests",
      (item) => item.documentId === documentId && item.status !== "revoked"
    );
    const request = requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!request) throw new Error("No signing request found");
    if (request.companySignedAt) throw new Error("Company has already signed");
    if (!request.recipientSignedAt && request.order === "recipient_first") {
      throw new Error("Recipient must sign first");
    }
    const now = nowIso();
    const path = `organizations/${tx.orgId}/documents/${documentId}/signatures/${request.id}-company.png`;
    await tx.putFile(path, dataUrlToBytes(args.imageDataUrl), "image/png");
    const signature = {
      id: newId("ssig"),
      signingRequestId: request.id,
      documentId,
      signerRole: "company",
      signerName: actor5.displayName,
      signerEmail: actor5.email,
      method: args.method,
      imagePath: path,
      typedText: args.typedText,
      signedAt: now
    };
    await tx.setDoc("storedSignatures", signature);
    await tx.setDoc("signingRequests", {
      ...request,
      companySignedAt: now,
      status: "completed"
    });
    await writeAudit(tx, {
      type: "DOCUMENT_COUNTERSIGNED",
      actor: actor5,
      entityType: "document",
      entityId: documentId,
      summary: `Company countersigned document.`
    });
    await finalizeDocument(tx, actor5, documentId);
    return signature;
  });
}
async function finalizeDocument(store, actor5, documentId) {
  const document = await store.getDoc("documents", documentId);
  if (!document) throw new Error("Document not found");
  if (document.status === "FINALIZED") return document;
  const version = await store.getDoc("documentVersions", document.currentVersionId);
  if (!version) throw new Error("Missing document version");
  const company2 = await store.getSettings("company");
  const now = nowIso();
  const html = await assembleCurrentHtml(store, documentId, { finalizedAt: now });
  const pdf = await renderPdf(html);
  const hash = (0, import_node_crypto3.createHash)("sha256").update(pdf).digest("hex");
  const path = `organizations/${store.orgId}/documents/${documentId}/final/final.pdf`;
  await store.putFile(path, pdf, "application/pdf");
  const next = {
    ...document,
    status: "FINALIZED",
    finalPdfPath: path,
    sha256: hash,
    signedAt: now,
    finalizedAt: now,
    updatedAt: now,
    lastActivityAt: now
  };
  await store.setDoc("documents", next);
  await store.setDoc("documentVersions", {
    ...version,
    status: "FINALIZED",
    snapshot: { ...version.snapshot, renderedHtml: html }
  });
  await writeAudit(store, {
    type: "DOCUMENT_FINALIZED",
    actor: actor5,
    entityType: "document",
    entityId: documentId,
    summary: `${document.readableId} finalized. SHA-256 recorded.`,
    metadata: { sha256: hash }
  });
  const request = (await store.queryDocs("signingRequests", (item) => item.documentId === documentId))[0];
  if (request) {
    const emailSettings = await loadEmailSettings(store);
    if (emailSettings.notifyRecipientOnComplete) {
      await sendTemplatedEmail({
        store,
        to: request.recipientEmail,
        template: "agreement_completed",
        data: {
          recipientName: request.recipientName,
          documentName: document.name,
          companyName: company2.legalName,
          downloadUrl: `${await requestAppUrl()}/sign/${request.tokenHint}/complete`
        }
      });
    }
  }
  return next;
}
function dataUrlToBytes(dataUrl) {
  const match = dataUrl.match(/^data:.*?;base64,(.+)$/);
  const b64 = match ? match[1] : dataUrl;
  return new Uint8Array(Buffer.from(b64, "base64"));
}

// src/lib/knowledge/library.ts
var TYPE_LABELS = {
  lead_generation_agreement: "Lead generation",
  collaboration_agreement: "Collaboration",
  marketing_agreement: "Media buying",
  service_agreement: "Service agreement",
  employment_standard: "Employment",
  employment_appointment_setter: "Appointment setter",
  employment_executive: "Executive employment",
  internship_agreement: "Internship",
  promotion_amended_employment: "Promotion amendment",
  salary_amendment: "Salary amendment"
};
var TYPE_TO_TEMPLATE = {
  lead_generation_agreement: "tpl_lead_generation",
  collaboration_agreement: "tpl_collaboration",
  marketing_agreement: "tpl_media_buying",
  service_agreement: "tpl_service_agreement",
  employment_standard: "tpl_employment_standard",
  employment_appointment_setter: "tpl_employment_appointment_setter",
  employment_executive: "tpl_employment_standard",
  internship_agreement: "tpl_employment_standard",
  promotion_amended_employment: "tpl_promotion_amended",
  salary_amendment: "tpl_promotion_amended"
};
function readSourceAnalysis(doc) {
  const raw = doc.analysisJson;
  if (!raw) return null;
  const family = raw.family === "EMPLOYMENT" || typeof raw.personId === "string" ? "EMPLOYMENT" : "CLIENT";
  const compensation = String(raw.compensation ?? raw.monthlyFee ?? "");
  return {
    family,
    companyId: typeof raw.companyId === "string" ? raw.companyId : void 0,
    personId: typeof raw.personId === "string" ? raw.personId : void 0,
    title: String(raw.title ?? TYPE_LABELS[doc.detectedType ?? ""] ?? "Agreement"),
    partyName: String(raw.partyName ?? raw.clientName ?? ""),
    summary: String(raw.summary ?? ""),
    monthlyFee: compensation,
    verticals: Array.isArray(raw.verticals) ? raw.verticals.map(String) : [],
    role: typeof raw.role === "string" ? raw.role : void 0,
    recommendedTemplateId: String(raw.recommendedTemplateId ?? TYPE_TO_TEMPLATE[doc.detectedType ?? ""] ?? ""),
    recommendedAction: String(raw.recommendedAction ?? "hire"),
    patterns: Array.isArray(raw.patterns) ? raw.patterns.map(String) : []
  };
}
function sourcesForCompany(sources, companyId) {
  return sources.filter((item) => readSourceAnalysis(item)?.companyId === companyId).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}
function sourcesForPerson(sources, personId) {
  return sources.filter((item) => readSourceAnalysis(item)?.personId === personId).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}
function recommendFromClientHistory(sources, companyId) {
  const latest = sourcesForCompany(sources, companyId)[0];
  if (!latest) return null;
  const analysis = readSourceAnalysis(latest);
  if (!analysis) return null;
  return {
    templateId: analysis.recommendedTemplateId,
    action: analysis.recommendedAction,
    reason: `This client\u2019s historical ${analysis.title.toLowerCase()} is the starting point for a new agreement.`,
    source: latest,
    analysis
  };
}
function recommendFromPersonHistory(sources, personId) {
  const latest = sourcesForPerson(sources, personId)[0];
  if (!latest) return null;
  const analysis = readSourceAnalysis(latest);
  if (!analysis) return null;
  return {
    templateId: analysis.recommendedTemplateId || "tpl_employment_standard",
    action: analysis.recommendedAction || "hire",
    reason: `This person\u2019s historical ${analysis.title.toLowerCase()} is the starting point.`,
    source: latest,
    analysis
  };
}

// src/app.ts
init_themes();
init_themes();

// src/lib/dashboard/insights.ts
function ruleDashboardInsights(snapshot) {
  const insights = [];
  if (snapshot.attentionCount > 0) {
    const lead = snapshot.attention[0];
    insights.push({
      id: "blocked",
      title: `${snapshot.attentionCount} agreement${snapshot.attentionCount === 1 ? "" : "s"} blocked`,
      detail: lead ? `${lead.partyName} (${lead.readableId}) is ${lead.status.replaceAll("_", " ").toLowerCase()} \u2014 clear review or signing first.` : "Clear review, send, or signature queues before generating more volume.",
      tone: "urgent",
      href: "/documents"
    });
  }
  if (snapshot.expiring > 0) {
    insights.push({
      id: "expiring",
      title: `${snapshot.expiring} signing link${snapshot.expiring === 1 ? "" : "s"} expire in 3 days`,
      detail: "Nudge recipients or regenerate links before they go stale.",
      tone: "urgent",
      href: "/signatures"
    });
  }
  if (snapshot.awaitingAmplify > 0) {
    insights.push({
      id: "countersign",
      title: "Amplify countersignature waiting",
      detail: `${snapshot.awaitingAmplify} document${snapshot.awaitingAmplify === 1 ? "" : "s"} need company signature to finalize.`,
      tone: "watch",
      href: "/signatures"
    });
  } else if (snapshot.awaitingRecipient > 0) {
    insights.push({
      id: "recipient",
      title: "Waiting on recipient signatures",
      detail: `${snapshot.awaitingRecipient} open send${snapshot.awaitingRecipient === 1 ? "" : "s"} \u2014 follow up if viewed but unsigned.`,
      tone: "watch",
      href: "/signatures"
    });
  }
  if (snapshot.pending > 0) {
    insights.push({
      id: "offers",
      title: `${snapshot.pending} offer${snapshot.pending === 1 ? "" : "s"} pending`,
      detail: "Generate employment packets before start dates slip.",
      tone: "watch",
      href: "/people"
    });
  } else if (snapshot.probation > 0) {
    insights.push({
      id: "probation",
      title: `${snapshot.probation} on probation`,
      detail: "Watch trial end dates \u2014 promotions and amendments usually follow.",
      tone: "watch",
      href: "/people"
    });
  }
  if (snapshot.monthDelta < 0) {
    insights.push({
      id: "volume",
      title: "Generation volume softer than last month",
      detail: `${Math.abs(snapshot.monthDelta)} fewer documents so far \u2014 check whether hiring or client pipeline slowed.`,
      tone: "watch",
      href: "/generate"
    });
  } else if (snapshot.completionRate >= 70 && snapshot.attentionCount === 0) {
    insights.push({
      id: "healthy",
      title: "Pipeline looks healthy",
      detail: `${snapshot.completionRate}% finalized overall with nothing currently blocked.`,
      tone: "ok",
      href: "/documents"
    });
  }
  if (snapshot.prospects > 0 && insights.length < 4) {
    insights.push({
      id: "prospects",
      title: `${snapshot.prospects} client prospect${snapshot.prospects === 1 ? "" : "s"}`,
      detail: "Service or lead-gen packs can convert active pipeline.",
      tone: "ok",
      href: "/companies"
    });
  }
  if (insights.length === 0) {
    insights.push({
      id: "quiet",
      title: "Quiet board",
      detail: "No blocked agreements or expiring links. Generate when the next hire or client deal is ready.",
      tone: "ok",
      href: "/generate"
    });
  }
  const urgent = insights.filter((item) => item.tone === "urgent").length;
  return {
    source: "rules",
    headline: urgent > 0 ? "Priority work is sitting in the queue" : snapshot.attentionCount === 0 ? "Workspace is clear enough to plan ahead" : "Operational pulse for Amplify",
    insights: insights.slice(0, 4)
  };
}

// src/lib/users-public.ts
function toPublicUser(user) {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

// src/app.ts
var import_zod2 = require("zod");
function tokenFromRequest(c) {
  return sessionFromAuthHeader(c.req.header("authorization")) ?? (0, import_cookie.getCookie)(c, SESSION_COOKIE) ?? null;
}
async function authed(c, permission) {
  return requirePermissionFromToken(c.get("token"), permission);
}
function createApp() {
  const app2 = new import_hono.Hono();
  app2.use("*", (0, import_cors.cors)({
    origin: corsOrigins(),
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Disposition"]
  }));
  app2.use("*", async (c, next) => {
    const token = tokenFromRequest(c);
    c.set("token", token);
    c.set("session", token ? await readSessionToken(token) : null);
    await next();
  });
  app2.onError((err, c) => {
    if (err instanceof AuthzError) return c.json({ error: err.message }, 401);
    const message = err instanceof Error ? err.message : "Request failed";
    const status = message.toLowerCase().includes("not found") ? 404 : 400;
    return c.json({ error: message }, status);
  });
  app2.get("/health", (c) => c.json({ ok: true, service: "amplify-contractos-api" }));
  app2.post("/auth/login", async (c) => {
    const body = await c.req.json();
    const session = await loginWithPassword(String(body.email ?? ""), String(body.password ?? ""));
    const security = await loadSecuritySettings();
    const token = await createSessionToken(session, { sessionDays: security.sessionDays });
    (0, import_cookie.setCookie)(c, SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: security.sessionDays * 24 * 60 * 60
    });
    return c.json({ token, user: session });
  });
  app2.post("/auth/logout", (c) => {
    (0, import_cookie.deleteCookie)(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });
  app2.get("/auth/me", async (c) => {
    const session = c.get("session");
    if (!session) return c.json({ error: "Authentication required" }, 401);
    return c.json({ user: session });
  });
  app2.get("/people", async (c) => {
    const actor5 = await authed(c, "people.read");
    const store = await getStore(actor5.orgId);
    const people = await store.listDocs("people");
    return c.json({ people });
  });
  app2.get("/people/:id", async (c) => {
    const actor5 = await authed(c, "people.read");
    const store = await getStore(actor5.orgId);
    const person2 = await store.getDoc("people", c.req.param("id"));
    if (!person2) return c.json({ error: "Not found" }, 404);
    const documents = await store.queryDocs("documents", (item) => item.personId === person2.id);
    const sources = await store.queryDocs(
      "sourceDocuments",
      (item) => item.personId === person2.id || String(item.analysisJson?.personId ?? "") === person2.id
    );
    return c.json({ person: person2, documents, sources });
  });
  app2.post("/people", async (c) => {
    const actor5 = await authed(c, "people.write");
    const store = await getStore(actor5.orgId);
    const parsed = createPersonSchema.parse(await c.req.json());
    const now = nowIso();
    const person2 = {
      ...parsed,
      id: newId("person"),
      fullLegalName: parsed.fullLegalName || `${parsed.firstName} ${parsed.lastName}`.trim(),
      createdAt: now,
      updatedAt: now,
      createdBy: actor5.userId
    };
    await store.setDoc("people", person2);
    await writeAudit(store, {
      type: "PERSON_CREATED",
      actor: actor5,
      entityType: "person",
      entityId: person2.id,
      summary: `Created person ${person2.fullLegalName}.`
    });
    return c.json({ person: person2 });
  });
  app2.patch("/people/:id", async (c) => {
    const actor5 = await authed(c, "people.write");
    const store = await getStore(actor5.orgId);
    const existing = await store.getDoc("people", c.req.param("id"));
    if (!existing) return c.json({ error: "Not found" }, 404);
    const patch = import_zod2.z.object({
      firstName: import_zod2.z.string().optional(),
      lastName: import_zod2.z.string().optional(),
      email: import_zod2.z.string().optional(),
      phone: import_zod2.z.string().optional(),
      type: import_zod2.z.enum(PERSON_TYPES).optional(),
      currentJobTitle: import_zod2.z.string().optional(),
      department: import_zod2.z.string().optional(),
      reportingManager: import_zod2.z.string().optional(),
      employmentStatus: import_zod2.z.enum(EMPLOYMENT_STATUSES).optional(),
      employmentStartDate: import_zod2.z.string().optional(),
      currentSalary: import_zod2.z.number().optional(),
      salaryCurrency: import_zod2.z.string().optional(),
      employeeId: import_zod2.z.string().optional(),
      city: import_zod2.z.string().optional(),
      notes: import_zod2.z.string().optional()
    }).parse(await c.req.json());
    const person2 = {
      ...existing,
      ...patch,
      fullLegalName: `${patch.firstName ?? existing.firstName} ${patch.lastName ?? existing.lastName}`.trim(),
      updatedAt: nowIso()
    };
    await store.setDoc("people", person2);
    await writeAudit(store, {
      type: "PERSON_UPDATED",
      actor: actor5,
      entityType: "person",
      entityId: person2.id,
      summary: `Updated ${person2.fullLegalName}.${patch.employmentStatus && patch.employmentStatus !== existing.employmentStatus ? ` Status ${existing.employmentStatus} \u2192 ${patch.employmentStatus}.` : ""}`
    });
    return c.json({ person: person2 });
  });
  app2.get("/companies", async (c) => {
    const actor5 = await authed(c, "companies.read");
    const store = await getStore(actor5.orgId);
    return c.json({ companies: await store.listDocs("companies") });
  });
  app2.get("/companies/:id", async (c) => {
    const actor5 = await authed(c, "companies.read");
    const store = await getStore(actor5.orgId);
    const company2 = await store.getDoc("companies", c.req.param("id"));
    if (!company2) return c.json({ error: "Not found" }, 404);
    const documents = await store.queryDocs("documents", (item) => item.companyId === company2.id);
    const sources = await store.queryDocs(
      "sourceDocuments",
      (item) => item.companyId === company2.id || String(item.analysisJson?.companyId ?? "") === company2.id
    );
    return c.json({ company: company2, documents, sources });
  });
  app2.post("/companies", async (c) => {
    const actor5 = await authed(c, "companies.write");
    const store = await getStore(actor5.orgId);
    const parsed = createCompanySchema.parse(await c.req.json());
    const now = nowIso();
    const company2 = {
      ...parsed,
      id: newId("company"),
      createdAt: now,
      updatedAt: now,
      createdBy: actor5.userId
    };
    await store.setDoc("companies", company2);
    await writeAudit(store, {
      type: "COMPANY_CREATED",
      actor: actor5,
      entityType: "company",
      entityId: company2.id,
      summary: `Created company ${company2.displayName}.`
    });
    return c.json({ company: company2 });
  });
  app2.get("/documents", async (c) => {
    const actor5 = await authed(c, "documents.read");
    const store = await getStore(actor5.orgId);
    return c.json({ documents: await store.listDocs("documents") });
  });
  app2.get("/documents/:id", async (c) => {
    const actor5 = await authed(c, "documents.read");
    const store = await getStore(actor5.orgId);
    const id = c.req.param("id");
    const document = await store.getDoc("documents", id);
    if (!document) return c.json({ error: "Not found" }, 404);
    const [version, relationships, audits, signing, ai, html] = await Promise.all([
      store.getDoc("documentVersions", document.currentVersionId),
      store.queryDocs(
        "documentRelationships",
        (item) => item.fromDocumentId === id || item.toDocumentId === id
      ),
      store.queryDocs("auditEvents", (item) => item.entityId === id),
      store.queryDocs("signingRequests", (item) => item.documentId === id),
      store.getSettings("ai"),
      assembleCurrentHtml(store, id)
    ]);
    const relatedIds = relationships.flatMap((item) => [item.fromDocumentId, item.toDocumentId]);
    const relatedDocs = await store.queryDocs("documents", (item) => relatedIds.includes(item.id));
    return c.json({
      document,
      version,
      relationships,
      audits,
      signing,
      relatedDocs,
      html,
      ai,
      aiThemeEnabled: Boolean(geminiEnabled() && ai?.enabled && (ai.recommendThemes ?? true)),
      canEditTheme: true
    });
  });
  app2.get("/documents/:id/pdf", async (c) => {
    const actor5 = await authed(c, "documents.read");
    const store = await getStore(actor5.orgId);
    const document = await store.getDoc("documents", c.req.param("id"));
    if (!document) return c.json({ error: "Not found" }, 404);
    const html = await assembleCurrentHtml(store, document.id);
    const pdf = await renderPdf(html);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${document.readableId}.pdf"`
      }
    });
  });
  app2.get("/documents/:id/sync", async (c) => {
    const actor5 = await authed(c, "documents.read");
    const store = await getStore(actor5.orgId);
    const document = await store.getDoc("documents", c.req.param("id"));
    if (!document) return c.json({ error: "Not found" }, 404);
    const signing = await store.queryDocs("signingRequests", (item) => item.documentId === document.id);
    const active = signing.filter((item) => item.status !== "revoked").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return c.json({
      status: document.status,
      signingStatus: active?.status ?? null,
      recipientSignedAt: active?.recipientSignedAt ?? null,
      lastActivityAt: document.lastActivityAt ?? document.updatedAt
    });
  });
  app2.patch("/documents/:id/theme", async (c) => {
    const actor5 = await authed(c, "documents.edit");
    const store = await getStore(actor5.orgId);
    const document = await store.getDoc("documents", c.req.param("id"));
    if (!document) return c.json({ error: "Not found" }, 404);
    if (document.status === "VOIDED") throw new Error("Voided documents cannot change design");
    const { themeId } = import_zod2.z.object({ themeId: import_zod2.z.enum(THEME_IDS) }).parse(await c.req.json());
    const themes = await store.listDocs("themes");
    if (!themes.some((theme) => theme.id === themeId)) throw new Error("Unknown document design");
    const now = nowIso();
    const next = { ...document, themeId, updatedAt: now, lastActivityAt: now };
    await store.setDoc("documents", next);
    await writeAudit(store, {
      type: "SETTINGS_UPDATED",
      actor: actor5,
      entityType: "document",
      entityId: document.id,
      summary: `${document.readableId} PDF design set to ${themeId.replaceAll("_", " ")}.`,
      metadata: { themeId }
    });
    return c.json({ document: next });
  });
  app2.post("/documents/:id/theme/recommend", async (c) => {
    const actor5 = await authed(c, "documents.edit");
    const store = await getStore(actor5.orgId);
    const document = await store.getDoc("documents", c.req.param("id"));
    if (!document) return c.json({ error: "Not found" }, 404);
    const fallback = () => {
      let themeId = "amplify_modern_dark";
      let reason = "Signal Dark fits most digital Amplify sends.";
      if (document.family === "EMPLOYMENT") {
        themeId = "amplify_classic_white";
        reason = "Employment packets fit the single Paper White letterhead.";
      } else if (document.documentType.includes("lead") || document.documentType.includes("service")) {
        themeId = "amplify_harbor_night";
        reason = "Client service packs fit Harbor Night.";
      } else if (document.action === "amend_agreement" || document.action === "promote") {
        themeId = "amplify_ember_brief";
        reason = "Short amendments fit Ember Brief on Letter.";
      }
      return { themeId, reason, source: "rules" };
    };
    try {
      const { requireAiCapability: requireAiCapability2 } = await Promise.resolve().then(() => (init_ai_service(), ai_service_exports));
      const ai = await requireAiCapability2(store, "recommendThemes");
      const catalog = BRANDING_TYPE_META.map((meta) => {
        const theme = AMPLIFY_DOCUMENT_THEMES.find((item) => item.id === meta.id);
        return {
          id: meta.id,
          name: theme.name,
          background: theme.background,
          pageSize: theme.pageSize,
          useFor: meta.useFor
        };
      });
      const rec = await ai.recommendTheme({
        family: document.family,
        documentType: document.documentType,
        partyType: document.partyType,
        partyName: document.partyName,
        action: document.action,
        currentThemeId: document.themeId,
        themes: catalog
      });
      const themeId = THEME_IDS.includes(rec.themeId) ? rec.themeId : fallback().themeId;
      return c.json({
        themeId,
        reason: rec.reason,
        source: "ai",
        label: BRANDING_TYPE_META.find((item) => item.id === themeId)?.label ?? themeId
      });
    } catch {
      const rules = fallback();
      return c.json({
        ...rules,
        label: BRANDING_TYPE_META.find((item) => item.id === rules.themeId)?.label ?? rules.themeId
      });
    }
  });
  app2.post("/documents/:id/approve", async (c) => {
    const actor5 = await authed(c, "documents.approve");
    const store = await getStore(actor5.orgId);
    await approveDocument(store, actor5, c.req.param("id"));
    return c.json({ ok: true });
  });
  app2.post("/documents/:id/void", async (c) => {
    const actor5 = await authed(c, "documents.void");
    const store = await getStore(actor5.orgId);
    const { reason } = import_zod2.z.object({ reason: import_zod2.z.string().min(1) }).parse(await c.req.json());
    await voidDocument(store, actor5, c.req.param("id"), reason);
    return c.json({ ok: true });
  });
  app2.post("/documents/:id/send", async (c) => {
    const actor5 = await authed(c, "documents.send");
    const store = await getStore(actor5.orgId);
    const raw = await c.req.json().catch(() => ({}));
    const body = import_zod2.z.object({ name: import_zod2.z.string().min(1).optional(), email: import_zod2.z.string().email().optional() }).parse(raw);
    const document = await store.getDoc("documents", c.req.param("id"));
    if (!document) return c.json({ error: "Not found" }, 404);
    let name = body.name;
    let email = body.email;
    if (!name || !email) {
      if (document.personId) {
        const person2 = await store.getDoc("people", document.personId);
        name = name || person2?.fullLegalName || document.partyName;
        email = email || person2?.email;
      } else if (document.companyId) {
        const company2 = await store.getDoc("companies", document.companyId);
        name = name || company2?.legalName || document.partyName;
        email = email || company2?.email;
      } else {
        name = name || document.partyName;
      }
    }
    if (!name || !email) throw new Error("Recipient name and email are required");
    const host = c.req.header("x-frontend-host") ?? c.req.header("x-forwarded-host") ?? c.req.header("host");
    const proto = c.req.header("x-forwarded-proto");
    const result = await sendForSignature(store, actor5, c.req.param("id"), { name, email }, {
      appUrl: resolveAppUrl(host, proto)
    });
    return c.json(result);
  });
  app2.get("/documents/:id/signing-link", async (c) => {
    const actor5 = await authed(c, "documents.send");
    const store = await getStore(actor5.orgId);
    const host = c.req.header("x-frontend-host") ?? c.req.header("x-forwarded-host") ?? c.req.header("host");
    const proto = c.req.header("x-forwarded-proto");
    const link = await getActiveSigningLink(store, c.req.param("id"), {
      appUrl: resolveAppUrl(host, proto)
    });
    return c.json({ link });
  });
  app2.post("/documents/:id/countersign", async (c) => {
    const actor5 = await authed(c, "documents.countersign");
    const store = await getStore(actor5.orgId);
    const body = import_zod2.z.object({ imageDataUrl: import_zod2.z.string().min(1), method: import_zod2.z.enum(["draw", "type"]) }).parse(await c.req.json());
    await applyCompanySignature(store, actor5, c.req.param("id"), body);
    return c.json({ ok: true });
  });
  app2.get("/generate/catalog", async (c) => {
    const actor5 = await authed(c, "documents.create");
    const store = await getStore(actor5.orgId);
    const [
      templates,
      templateVersions,
      clauses,
      clauseVersions,
      people,
      companies,
      themes,
      roleProfiles,
      company2,
      sources,
      documents
    ] = await Promise.all([
      store.listDocs("templates"),
      store.listDocs("templateVersions"),
      store.listDocs("clauses"),
      store.listDocs("clauseVersions"),
      store.listDocs("people"),
      store.listDocs("companies"),
      store.listDocs("themes"),
      store.listDocs("roleProfiles"),
      store.getSettings("company"),
      store.listDocs("sourceDocuments"),
      store.listDocs("documents")
    ]);
    return c.json({
      templates,
      templateVersions,
      clauses,
      clauseVersions,
      people,
      companies,
      themes,
      roleProfiles,
      company: company2,
      sources,
      documents
    });
  });
  app2.post("/generate/preview", async (c) => {
    const actor5 = await authed(c, "documents.create");
    const store = await getStore(actor5.orgId);
    const input = generateDocumentInputSchema.parse(await c.req.json());
    const preview = await previewFromInput(store, input);
    return c.json(preview);
  });
  app2.post("/generate", async (c) => {
    const actor5 = await authed(c, "documents.create");
    const store = await getStore(actor5.orgId);
    const input = generateDocumentInputSchema.parse(await c.req.json());
    const document = await generateDocument(store, actor5, input);
    return c.json({ document });
  });
  app2.post("/generate/recommend", async (c) => {
    const actor5 = await authed(c, "documents.create");
    const store = await getStore(actor5.orgId);
    const input = await c.req.json();
    const sources = await store.listDocs("sourceDocuments");
    const history = input.partyType === "client" && input.companyId ? recommendFromClientHistory(sources, input.companyId) : input.personId ? recommendFromPersonHistory(sources, input.personId) : null;
    const docs = await store.listDocs("documents");
    const hasExisting = Boolean(
      input.personId && docs.some((d) => d.personId === input.personId && d.family === "EMPLOYMENT")
    );
    const deterministic = recommendDocumentType({
      partyType: input.partyType,
      action: input.action,
      hasExistingEmploymentAgreement: hasExisting,
      jobTitle: input.jobTitle,
      preferredTemplateId: history?.templateId
    });
    const aiSettings = await store.getSettings("ai");
    if (aiSettings.enabled && aiSettings.recommendTemplates) {
      try {
        const { requireAiCapability: requireAiCapability2 } = await Promise.resolve().then(() => (init_ai_service(), ai_service_exports));
        const ai = await requireAiCapability2(store, "recommendTemplates");
        const rec = await ai.recommendTemplate({
          partyType: input.partyType,
          action: input.action,
          hasExistingEmploymentAgreement: hasExisting,
          jobTitle: input.jobTitle
        });
        return c.json({ ...deterministic, ai: rec, history });
      } catch {
      }
    }
    return c.json({ ...deterministic, history });
  });
  app2.get("/sign/:token", async (c) => {
    const store = await getStore();
    const found = await getSigningByToken(store, c.req.param("token"));
    if (!found) return c.json(null);
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
    const ua = c.req.header("user-agent") ?? void 0;
    await markOpened(store, found.request, ip, ua);
    const signing = await store.getSettings("signing");
    return c.json({
      documentName: found.document.name,
      readableId: found.document.readableId,
      recipientName: found.request.recipientName,
      html: found.version.snapshot.renderedHtml,
      allowDraftDownload: signing.allowDraftDownload ?? true,
      status: found.document.status,
      requireOtp: found.request.requireOtp,
      consentAcceptedAt: found.request.consentAcceptedAt,
      recipientSignedAt: found.request.recipientSignedAt,
      finalized: found.document.status === "FINALIZED",
      sha256: found.document.sha256,
      signedAt: found.document.signedAt,
      partyName: found.document.partyName
    });
  });
  app2.post("/sign/:token/consent", async (c) => {
    const store = await getStore();
    const found = await getSigningByToken(store, c.req.param("token"));
    if (!found) throw new Error("Invalid or expired signing link");
    await acceptConsent(
      store,
      found.request,
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim(),
      c.req.header("user-agent") ?? void 0
    );
    return c.json({ ok: true });
  });
  app2.post("/sign/:token/sign", async (c) => {
    const store = await getStore();
    const found = await getSigningByToken(store, c.req.param("token"));
    if (!found) throw new Error("Invalid or expired signing link");
    if (!found.request.consentAcceptedAt) throw new Error("Consent is required before signing");
    const body = import_zod2.z.object({ imageDataUrl: import_zod2.z.string().min(1), method: import_zod2.z.enum(["draw", "type"]) }).parse(await c.req.json());
    await applyRecipientSignature(store, found.request, {
      method: body.method,
      imageDataUrl: body.imageDataUrl,
      ip: c.req.header("x-forwarded-for")?.split(",")[0]?.trim(),
      ua: c.req.header("user-agent") ?? void 0
    });
    return c.json({ ok: true, documentId: found.document.id });
  });
  app2.get("/templates", async (c) => {
    const actor5 = await authed(c, "templates.read");
    const store = await getStore(actor5.orgId);
    return c.json({ templates: await store.listDocs("templates") });
  });
  app2.get("/templates/:id", async (c) => {
    const actor5 = await authed(c, "templates.read");
    const store = await getStore(actor5.orgId);
    const template2 = await store.getDoc("templates", c.req.param("id"));
    if (!template2) return c.json({ error: "Not found" }, 404);
    const versions = await store.queryDocs("templateVersions", (item) => item.templateId === template2.id);
    return c.json({ template: template2, versions });
  });
  app2.get("/clauses", async (c) => {
    const actor5 = await authed(c, "clauses.read");
    const store = await getStore(actor5.orgId);
    const [clauses, templates, templateVersions] = await Promise.all([
      store.listDocs("clauses"),
      store.listDocs("templates"),
      store.listDocs("templateVersions")
    ]);
    return c.json({ clauses, templates, templateVersions });
  });
  app2.get("/clauses/:id", async (c) => {
    const actor5 = await authed(c, "clauses.read");
    const store = await getStore(actor5.orgId);
    const clause = await store.getDoc("clauses", c.req.param("id"));
    if (!clause) return c.json({ error: "Not found" }, 404);
    const versions = await store.queryDocs("clauseVersions", (item) => item.clauseId === clause.id);
    const templates = await store.listDocs("templates");
    const templateVersions = await store.listDocs("templateVersions");
    return c.json({ clause, versions, templates, templateVersions });
  });
  app2.get("/packs", async (c) => {
    const actor5 = await authed(c, "packs.read");
    const store = await getStore(actor5.orgId);
    return c.json({
      packs: await store.listDocs("documentPacks"),
      templates: await store.listDocs("templates")
    });
  });
  app2.get("/knowledge", async (c) => {
    const actor5 = await authed(c, "knowledge.read");
    const store = await getStore(actor5.orgId);
    return c.json({
      sources: await store.listDocs("sourceDocuments"),
      findings: await store.listDocs("knowledgeFindings"),
      people: await store.listDocs("people"),
      companies: await store.listDocs("companies")
    });
  });
  app2.get("/knowledge/:id/pdf", async (c) => {
    const actor5 = await authed(c, "knowledge.read");
    const store = await getStore(actor5.orgId);
    const source3 = await store.getDoc("sourceDocuments", c.req.param("id"));
    if (!source3) return c.json({ error: "Not found" }, 404);
    const file = await store.getFile(source3.storagePath);
    if (!file) return c.json({ error: "File missing" }, 404);
    return new Response(Buffer.from(file.bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="${source3.fileName}"`
      }
    });
  });
  app2.get("/signatures", async (c) => {
    const actor5 = await authed(c, "signing.manage");
    const store = await getStore(actor5.orgId);
    return c.json({
      requests: await store.listDocs("signingRequests"),
      documents: await store.listDocs("documents")
    });
  });
  app2.get("/approvals", async (c) => {
    const actor5 = await authed(c, "documents.approve");
    const store = await getStore(actor5.orgId);
    const documents = await store.queryDocs(
      "documents",
      (item) => item.status === "REVIEW_REQUIRED"
    );
    return c.json({ documents });
  });
  app2.get("/audit", async (c) => {
    const actor5 = await authed(c, "audit.read");
    const store = await getStore(actor5.orgId);
    return c.json({ events: await store.listDocs("auditEvents") });
  });
  app2.get("/dashboard", async (c) => {
    const actor5 = await authed(c, "documents.read");
    const store = await getStore(actor5.orgId);
    const [documents, requests, people, companies, sources, findings, ai] = await Promise.all([
      store.listDocs("documents"),
      store.listDocs("signingRequests"),
      store.listDocs("people"),
      store.listDocs("companies"),
      store.listDocs("sourceDocuments"),
      store.listDocs("knowledgeFindings"),
      store.getSettings("ai")
    ]);
    return c.json({
      documents,
      requests,
      people,
      companies,
      sources,
      findings,
      ai,
      aiInsightsEnabled: Boolean(geminiEnabled() && ai?.enabled && (ai.dashboardInsights ?? true))
    });
  });
  app2.post("/dashboard/insights", async (c) => {
    const actor5 = await authed(c, "documents.read");
    const store = await getStore(actor5.orgId);
    const snapshot = await c.req.json();
    const rules = ruleDashboardInsights(snapshot);
    try {
      const { requireAiCapability: requireAiCapability2 } = await Promise.resolve().then(() => (init_ai_service(), ai_service_exports));
      const ai = await requireAiCapability2(store, "dashboardInsights");
      const rec = await ai.dashboardInsights({ snapshot });
      if (!rec.insights.length) return c.json(rules);
      return c.json({
        source: "ai",
        headline: rec.headline,
        insights: rec.insights.map((item, index) => ({
          id: `ai-${index}`,
          title: item.title,
          detail: item.detail,
          tone: item.tone,
          href: item.href
        }))
      });
    } catch {
      return c.json(rules);
    }
  });
  app2.get("/compare", async (c) => {
    const actor5 = await authed(c, "documents.read");
    const store = await getStore(actor5.orgId);
    return c.json({ documents: await store.listDocs("documents") });
  });
  app2.get("/compare/versions", async (c) => {
    const actor5 = await authed(c, "documents.read");
    const store = await getStore(actor5.orgId);
    const leftId = c.req.query("left");
    const rightId = c.req.query("right");
    if (!leftId || !rightId) return c.json({ error: "left and right required" }, 400);
    const [leftDoc, rightDoc] = await Promise.all([
      store.getDoc("documents", leftId),
      store.getDoc("documents", rightId)
    ]);
    if (!leftDoc || !rightDoc) return c.json({ error: "Document not found" }, 404);
    const [leftVersion, rightVersion] = await Promise.all([
      store.getDoc("documentVersions", leftDoc.currentVersionId),
      store.getDoc("documentVersions", rightDoc.currentVersionId)
    ]);
    return c.json({ leftDoc, rightDoc, leftVersion, rightVersion });
  });
  app2.get("/settings", async (c) => {
    const actor5 = await authed(c, "settings.read");
    const store = await getStore(actor5.orgId);
    const [company2, ai, aiUsage, signing, themes, users] = await Promise.all([
      store.getSettings("company"),
      store.getSettings("ai"),
      store.getSettings("aiUsage"),
      store.getSettings("signing"),
      store.listDocs("themes"),
      store.listDocs("users")
    ]);
    const email = await loadEmailSettings(store);
    const security = await loadSecuritySettings(store);
    return c.json({
      company: company2,
      ai,
      aiUsage,
      signing,
      themes,
      email,
      security,
      emailTransport: emailTransportStatus(),
      securityStatus: securityStatus(),
      aiConfigured: geminiEnabled(),
      users: users.map(toPublicUser),
      canManageUsers: true,
      actor: actor5
    });
  });
  app2.put("/settings/company", async (c) => {
    const actor5 = await authed(c, "settings.write");
    const store = await getStore(actor5.orgId);
    const parsed = await c.req.json();
    await store.setSettings("company", parsed);
    await writeAudit(store, {
      type: "SETTINGS_UPDATED",
      actor: actor5,
      entityType: "settings",
      entityId: "company",
      summary: "Company settings updated."
    });
    return c.json({ ok: true });
  });
  app2.put("/settings/ai", async (c) => {
    const actor5 = await authed(c, "settings.write");
    const store = await getStore(actor5.orgId);
    const parsed = aiSettingsSchema.parse({ ...await c.req.json(), draftNewClauses: false });
    await store.setSettings("ai", parsed);
    await writeAudit(store, {
      type: "SETTINGS_UPDATED",
      actor: actor5,
      entityType: "settings",
      entityId: "ai",
      summary: "AI settings updated."
    });
    return c.json(parsed);
  });
  app2.put("/settings/signing", async (c) => {
    const actor5 = await authed(c, "settings.write");
    const store = await getStore(actor5.orgId);
    const parsed = signingSettingsSchema.parse(await c.req.json());
    await store.setSettings("signing", parsed);
    return c.json(parsed);
  });
  app2.put("/settings/email", async (c) => {
    const actor5 = await authed(c, "settings.write");
    const store = await getStore(actor5.orgId);
    const parsed = emailSettingsSchema.parse(await c.req.json());
    await store.setSettings("email", parsed);
    return c.json(parsed);
  });
  app2.put("/settings/security", async (c) => {
    const actor5 = await authed(c, "settings.write");
    const store = await getStore(actor5.orgId);
    const parsed = securitySettingsSchema.parse(await c.req.json());
    await store.setSettings("security", parsed);
    return c.json(parsed);
  });
  app2.post("/settings/email/test", async (c) => {
    const actor5 = await authed(c, "settings.write");
    const store = await getStore(actor5.orgId);
    const { to } = import_zod2.z.object({ to: import_zod2.z.string().email() }).parse(await c.req.json());
    await sendTemplatedEmail({
      to,
      template: "test_message",
      data: { actor: actor5.displayName },
      store
    });
    const transport = emailTransportStatus();
    return c.json({ ok: true, delivered: transport.configured, provider: transport.provider });
  });
  app2.get("/users", async (c) => {
    const actor5 = await authed(c, "users.manage");
    const store = await getStore(actor5.orgId);
    const users = await store.listDocs("users");
    return c.json({ users: users.map(toPublicUser) });
  });
  app2.post("/users", async (c) => {
    const actor5 = await authed(c, "users.manage");
    const store = await getStore(actor5.orgId);
    const body = import_zod2.z.object({
      email: import_zod2.z.string().email(),
      displayName: import_zod2.z.string().min(1),
      role: import_zod2.z.enum(USER_ROLES),
      password: import_zod2.z.string().min(8),
      active: import_zod2.z.boolean().optional()
    }).parse(await c.req.json());
    const security = await loadSecuritySettings(store);
    assertPasswordPolicy(body.password, security);
    const users = await store.listDocs("users");
    if (users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
      throw new Error("A user with that email already exists");
    }
    const user = {
      id: newId("user"),
      email: body.email.toLowerCase(),
      displayName: body.displayName,
      role: body.role,
      active: body.active ?? true,
      passwordHash: hashPassword(body.password),
      createdAt: nowIso()
    };
    await store.setDoc("users", user);
    return c.json({ user: toPublicUser(user) });
  });
  app2.patch("/users/:id", async (c) => {
    const actor5 = await authed(c, "users.manage");
    const store = await getStore(actor5.orgId);
    const existing = await store.getDoc("users", c.req.param("id"));
    if (!existing) return c.json({ error: "Not found" }, 404);
    const body = import_zod2.z.object({
      email: import_zod2.z.string().email().optional(),
      displayName: import_zod2.z.string().min(1).optional(),
      role: import_zod2.z.enum(USER_ROLES).optional(),
      password: import_zod2.z.string().min(8).optional(),
      active: import_zod2.z.boolean().optional()
    }).parse(await c.req.json());
    if (body.password) {
      assertPasswordPolicy(body.password, await loadSecuritySettings(store));
    }
    const next = {
      ...existing,
      email: body.email?.toLowerCase() ?? existing.email,
      displayName: body.displayName ?? existing.displayName,
      role: body.role ?? existing.role,
      active: body.active ?? existing.active,
      passwordHash: body.password ? hashPassword(body.password) : existing.passwordHash
    };
    await store.setDoc("users", next);
    return c.json({ user: toPublicUser(next) });
  });
  void resolveThemeId;
  return app2;
}

// src/vercel.ts
var runtime = "nodejs";
var maxDuration = 60;
var vercel_default = (0, import_vercel.handle)(createApp());
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  maxDuration,
  runtime
});
