import type { Lang } from "./types";

export interface ExampleMessage {
  id: string;
  label: Record<Lang, string>;
  text: string;
}

export const EXAMPLES: ExampleMessage[] = [
  {
    id: "reversal",
    label: { en: "Sent by mistake", tw: "Wɔde amane" },
    text: "MTN MoMo: You have received GHS 850.00 from KWAME MENSAH (0244123456). If this was a mistake, kindly reverse it now. Call our agent Ama on 0551988776 or approve the reversal with your PIN. Thank you.",
  },
  {
    id: "prize",
    label: { en: "Promo prize", tw: "Akatua nnaadaa" },
    text: "Hello dear, this is the MTN Promo Team. Your number has won GHS 5,000 in the MoMo anniversary draw. Claim within 30 minutes at http://mtn-ghana-reward.support/claim or your prize will go to another person. Send a GHS 20 activation fee to 0593342211.",
  },
  {
    id: "tax",
    label: { en: "GRA tax", tw: "GRA tow" },
    text: "GHANA REVENUE AUTHORITY: Your tax clearance has a penalty of GHS 320. Pay now to avoid arrest: https://gra-tax-clearance.pay-gh.com/u/4412 . Reply with your Ghana Card number.",
  },
  {
    id: "receipt",
    label: { en: "Real MTN alert", tw: "MTN alert ankasa" },
    text: "You have received GHS 120.00 from Ama Serwaa (0244987123). Current balance: GHS 245.50. Fee: GHS 0.00. Transaction ID: 18442219034. Available balance: GHS 245.50. Reference: school fees.",
  },
  {
    id: "uncle",
    label: { en: "Uncle in hospital", tw: "Wɔfa a ɔwɔ ayaresabea" },
    text: "Hi it's uncle Yaw. I changed my number. I am at the hospital with your mother and the doctor wants GHS 600 before they treat her. Please MoMo me now on 0277001122. I will explain later. Do not call the house.",
  },
  {
    id: "dstv",
    label: { en: "DStv approval", tw: "DStv approval" },
    text: "Kindly approve the pending request in your MoMo app to complete your DStv payment. Merchant: DStv GH. Amount: GHS 150.",
  },
];

export const DEMO_SCREENSHOT_TEXT = EXAMPLES[0].text;

export function exampleById(id: string): ExampleMessage | undefined {
  return EXAMPLES.find((example) => example.id === id);
}
