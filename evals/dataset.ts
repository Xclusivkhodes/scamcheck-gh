import type { Verdict } from "../lib/types";
import { MORE_CASES } from "./more-cases";

export interface EvalCase {
  id: string;
  text: string;
  expected: Verdict;
  /** A miss we already understand. It is counted in accuracy and listed as a known gap. */
  knownGap?: boolean;
  note?: string;
}

export const EVAL_CASES: EvalCase[] = [
  {
    id: "reversal-pin",
    expected: "scam",
    text: "MTN MoMo: You have received GHS 850.00 from KWAME MENSAH (0244123456). If this was a mistake, kindly reverse it now. Call our agent Ama on 0551988776 or approve the reversal with your PIN. Thank you.",
  },
  {
    id: "prize-link",
    expected: "scam",
    text: "Hello dear, this is the MTN Promo Team. Your number has won GHS 5,000 in the MoMo anniversary draw. Claim within 30 minutes at http://mtn-ghana-reward.support/claim or your prize will go to another person. Send a GHS 20 activation fee to 0593342211.",
  },
  {
    id: "gra-link",
    expected: "scam",
    text: "GHANA REVENUE AUTHORITY: Your tax clearance has a penalty of GHS 320. Pay now to avoid arrest: https://gra-tax-clearance.pay-gh.com/u/4412 . Reply with your Ghana Card number.",
  },
  {
    id: "real-receipt",
    expected: "looks_ok",
    text: "You have received GHS 120.00 from Ama Serwaa (0244987123). Current balance: GHS 245.50. Fee: GHS 0.00. Transaction ID: 18442219034. Available balance: GHS 245.50. Reference: school fees.",
  },
  {
    id: "uncle-hospital",
    expected: "scam",
    text: "Hi it's uncle Yaw. I changed my number. I am at the hospital with your mother and the doctor wants GHS 600 before they treat her. Please MoMo me now on 0277001122. I will explain later. Do not call the house.",
  },
  {
    id: "gcb-credit",
    expected: "looks_ok",
    text: "GCB Bank: GHS 2,000.00 credited to A/C ***4412. Bal: GHS 8,120.40. Transaction ID: 441298. If you did not authorise this, call the number on your card. Do not share your PIN or OTP.",
  },
  {
    id: "wallet-block-link",
    expected: "scam",
    text: "Your MoMo wallet will be blocked in 15 minutes. Update your details here: https://mtn-momo-secure-login.com/gh",
  },
  {
    id: "job-fee",
    expected: "scam",
    text: "MTN is hiring MoMo agents in Kumasi. Pay a GHS 150 registration fee to 0244009988 to start training tomorrow. Limited slots.",
  },
  {
    id: "market-errand",
    expected: "suspicious",
    text: "Auntie Efua: the tomatoes are GHS 40. Send it to the market woman on 0244111222 when you can.",
  },
  {
    id: "wedding-note",
    expected: "looks_ok",
    text: "Congratulations on your wedding. We at the church will bring the envelope next week. God bless you.",
  },
  {
    id: "twi-reversal",
    expected: "scam",
    text: "Mepa wo kyew, MTN MoMo. Yede GHS 500 ako wo account. Se enye wo a, fa wo PIN bre yen na yesan sika no. Fre 0555111222 seesei.",
  },
  {
    id: "telecel-prize",
    expected: "scam",
    text: "Telecel Cash: Your SIM won a Samsung phone and GHS 2,000. Click https://telecel-win-gh.promo/claim and enter your MoMo PIN to receive it.",
  },
  {
    id: "safety-sms",
    expected: "looks_ok",
    text: "MTN MoMo: Dial *170# to check your balance. MTN will never ask for your PIN. Dial 419 to report fraud.",
  },
  {
    id: "dstv-approve",
    expected: "suspicious",
    text: "Kindly approve the pending request in your MoMo app to complete your DStv payment. Merchant: DStv GH. Amount: GHS 150.",
  },
  {
    id: "absa-bitly",
    expected: "scam",
    text: "Absa Bank Ghana: your account has a problem. Verify now at https://bit.ly/absa-gh-secure or it will be suspended tonight.",
  },
  {
    id: "call-me",
    expected: "looks_ok",
    text: "Hi brother, call me when you are free. I want to ask you something about the weekend.",
  },
  {
    id: "news-warning",
    expected: "looks_ok",
    text: "Daily Graphic: Police warn that scammers are telling people to send MoMo reversals and share PINs. Do not do it.",
  },
  {
    id: "bog-never-pin-but-link",
    expected: "scam",
    text: "Hello, I am from Bank of Ghana. We will never ask for your PIN. Just pay the GHS 90 card renewal fee at https://bog-renewal-gh.com/pay before Friday so your Ghana Card stays valid.",
  },
  {
    id: "sent-receipt",
    expected: "looks_ok",
    text: "You have sent GHS 25.00 to Kofi's Waakye (0551234987). Fee: GHS 0.50. Current balance: GHS 80.20. Transaction ID: 992811003. Thank you for using MoMo.",
  },
  {
    id: "urgent-no-details",
    expected: "suspicious",
    knownGap: true,
    note: "Urgency without an amount, a number, a link, or a named organisation. The baseline looks for those hooks and calls this safe.",
    text: "Mama, I dey outside. Send the money now now. I go explain.",
  },
  {
    id: "soft-parcel",
    expected: "suspicious",
    knownGap: true,
    note: "Payment pressure with no amount, phone, or link. Easy for a person to feel, hard for the keyword baseline.",
    text: "Your parcel is waiting at the post office. Kindly pay the clearance today so we can release it.",
  },
  ...MORE_CASES,
];
