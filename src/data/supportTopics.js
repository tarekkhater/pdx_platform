/**
 * Support knowledge base.
 *
 * This is a scripted assistant, not a language model: curated answers keyed to
 * the questions this platform actually generates. That is what the first tier
 * of support looks like at Binance, Revolut and OKX — deterministic answers
 * for the common cases, with a clear route to a human for everything else.
 *
 * Answers deliberately point at real screens in this app, so the client is
 * told where to go rather than given generic advice. A broker edits the copy
 * and the `followUps` graph here; the chat component needs no changes.
 */

export const TOPICS = {
  depositMissing: {
    icon: 'wallet',
    answer: [
      'Card deposits normally credit within a few minutes. Bank transfers can take 1–3 business days depending on your bank, and crypto deposits credit after the required network confirmations.',
      'You can check the current state of every payment under Transactions History — anything still processing shows as Pending there.',
    ],
    followUps: ['depositPending', 'depositWrongAmount', 'agent'],
  },
  depositPending: {
    icon: 'clock',
    answer: [
      'A deposit stays Pending until the payment provider confirms settlement. Nothing is required from you while it is in that state.',
      'If a card deposit has been pending for more than 2 hours, or a bank transfer for more than 3 business days, an agent can trace it with your payment reference.',
    ],
    followUps: ['agent'],
  },
  depositWrongAmount: {
    icon: 'alert',
    answer: [
      'If the credited amount differs from what you sent, the difference is usually the sending bank’s transfer fee or a currency conversion applied on their side.',
      'Send the payment confirmation from your bank to an agent and the account will be reconciled.',
    ],
    followUps: ['agent'],
  },
  withdrawalTime: {
    icon: 'wallet',
    answer: [
      'Withdrawals are processed back to the original funding method, as anti-money-laundering rules require. Requests submitted before the daily cut-off are reviewed the same business day.',
      'Once approved, card refunds take 3–5 business days to appear, bank transfers 1–3 business days, and crypto withdrawals are sent once the network confirms.',
    ],
    followUps: ['withdrawalRejected', 'kyc', 'agent'],
  },
  withdrawalRejected: {
    icon: 'alert',
    answer: [
      'Withdrawals are most often declined for one of three reasons: verification is incomplete, the destination does not match the original funding method, or open positions would leave the account below its margin requirement.',
      'Check Settings → KYC Verification first — an unverified account cannot withdraw.',
    ],
    followUps: ['kyc', 'agent'],
  },
  kyc: {
    icon: 'shield',
    answer: [
      'Verification needs a government ID, a proof of address dated within the last 3 months, and a selfie. Upload them under Settings → KYC Verification.',
      'Documents are usually reviewed within one business day. Rejections are almost always a cropped edge, glare on the document, or an address document that is too old.',
    ],
    followUps: ['kycRejected', 'agent'],
  },
  kycRejected: {
    icon: 'alert',
    answer: [
      'Re-upload using the Replace button on the rejected document. Photograph it flat, in daylight, with all four corners visible and no flash.',
      'Utility bills, bank statements and council tax letters are accepted as proof of address. Mobile phone bills and handwritten documents are not.',
    ],
    followUps: ['agent'],
  },
  marginCall: {
    icon: 'trending',
    answer: [
      'Positions are closed automatically when your margin level falls to the close-out threshold. This protects you from going into negative balance and happens without prior notice.',
      'You can reduce the risk by lowering position size, adding funds, or setting a Stop Loss that triggers before the close-out level is reached.',
    ],
    followUps: ['leverage', 'agent'],
  },
  leverage: {
    icon: 'trending',
    answer: [
      'Your account leverage is shown on the order ticket next to the estimated margin. Higher leverage lowers the margin per position but makes a close-out happen sooner.',
      'To apply for a higher tier, go to Settings → Documents → Leverage Increase Request. Requests are reviewed against your trading experience and account history.',
    ],
    followUps: ['marginCall', 'agent'],
  },
  charges: {
    icon: 'receipt',
    answer: [
      'Three costs apply: the spread (the difference between the buy and sell price), commission where the instrument charges one, and overnight financing on positions held past the daily rollover.',
      'Overnight financing can be positive or negative depending on direction and instrument, and it is the cost most often mistaken for an unexplained deduction.',
    ],
    followUps: ['agent'],
  },
  loginIssue: {
    icon: 'lock',
    answer: [
      'You can set a new password from Settings → My Profile → Change Password, or use Forgot password on the login screen.',
      'If you are not receiving the reset email, check your spam folder and confirm you are using the address the account was opened with.',
    ],
    followUps: ['agent'],
  },
};

/** Shown as chips under the greeting. */
export const SUGGESTED = [
  'depositMissing',
  'withdrawalTime',
  'kyc',
  'marginCall',
  'leverage',
  'charges',
  'loginIssue',
];

export const AGENT_TOPIC = 'agent';

// Roughly how long the assistant "types" before answering. Instant replies
// read as canned; this is long enough to feel considered, short enough not to
// waste the client's time.
export const TYPING_MS = 700;
