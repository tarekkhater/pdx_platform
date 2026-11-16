import { COMPANY } from '@/data/legalContent';

/**
 * Client documents: what the trader reads, signs, applies for or declares.
 *
 * The English wording below is realistic placeholder copy for a leveraged
 * multi-asset broker — it is here to be replaced by the broker's own legal
 * team, not relied on. Swap `sections` and keep the shape and the UI follows.
 *
 * `kind` decides the interaction, which is the whole point of this file:
 *   sign        — read, tick, type your full name as an e-signature
 *   acknowledge — read and tick; no signature required
 *   leverage    — an application, not a signature: pick the leverage you want
 *   taxForm     — a declaration with fields the client fills in
 */

export const DOC_KINDS = {
  SIGN: 'sign',
  ACKNOWLEDGE: 'acknowledge',
  LEVERAGE: 'leverage',
  TAX: 'taxForm',
};

export const LEVERAGE_OPTIONS = [50, 100, 200, 400, 500];
export const DEFAULT_LEVERAGE = 20;

/**
 * Body copy for the two documents the profile payload names by `key`.
 * Status and the action live on the user object; this is only what they read.
 */
export const legalContentFor = (key) => {
  if (key === 'client_agreement') return AGREEMENTS.find((doc) => doc.id === 'clientAgreement') ?? null;
  if (key === 'risk_acknowledgement') return AGREEMENTS.find((doc) => doc.id === 'riskAcknowledgement') ?? null;
  return null;
};

export const AGREEMENTS = [
  {
    id: 'clientAgreement',
    kind: DOC_KINDS.SIGN,
    version: '2.1',
    updated: '2026-01-04',
    title: 'Client Agreement',
    summary: 'The contract between you and the broker. Must be signed before trading.',
    sections: [
      {
        heading: '1. Scope of this Agreement',
        body: [
          `This Agreement governs the relationship between ${COMPANY.legalName} ("the Company", "we", "us") and you ("the Client") in respect of every trading account you hold with us, and all orders placed through our platforms.`,
          'By signing you confirm that you have read this Agreement together with the Risk Disclosure, the Order Execution Policy and the Privacy Policy, and that you accept them in full.',
        ],
      },
      {
        heading: '2. Client classification',
        body: [
          'Unless we notify you otherwise in writing, you are categorised as a Retail Client. Retail classification affords the highest level of regulatory protection available, including negative balance protection and leverage limits.',
          'You may request a different categorisation. We are not obliged to accept such a request, and re-categorisation may reduce the protections available to you.',
        ],
      },
      {
        heading: '3. Orders and execution',
        body: [
          'We act as principal in all transactions. Orders are executed on a best-execution basis in line with our Order Execution Policy, taking into account price, cost, speed, likelihood of execution and settlement, size and nature of the order.',
          'Quoted prices are indicative. In fast-moving markets the execution price may differ from the price shown when the order was placed. We do not guarantee that a Stop Loss will execute at the requested level; a guaranteed stop, where offered, is subject to a separate premium.',
        ],
      },
      {
        heading: '4. Leverage and margin',
        body: [
          'Leverage is applied at account level and may be varied by instrument. You must maintain sufficient margin at all times. Margin requirements may be changed without prior notice where market conditions require it, including ahead of scheduled economic events, weekends and holidays.',
          'If your margin level falls to the close-out threshold, open positions may be closed automatically, in whole or in part, without further notice to you. Position closure follows the order set out in our Margin Policy.',
        ],
      },
      {
        heading: '5. Client money',
        body: [
          'Retail client funds are held in segregated accounts with regulated credit institutions, separately from the Company’s own funds. Segregation does not eliminate the risk of loss in the event of the failure of a credit institution.',
          'We do not pay interest on balances held unless expressly agreed in writing.',
        ],
      },
      {
        heading: '6. Costs and charges',
        body: [
          'Trading costs consist of the spread, any commission applicable to the instrument, and overnight financing (swap) on positions held past the daily rollover. Swap rates are published on the platform and may be positive or negative.',
          'Withdrawal, currency conversion and inactivity fees, where applicable, are set out in the published Fee Schedule, which forms part of this Agreement.',
        ],
      },
      {
        heading: '7. Conflicts of interest',
        body: [
          'We maintain a Conflicts of Interest Policy identifying circumstances that may give rise to a conflict, and the measures taken to manage it. A copy is available on request.',
        ],
      },
      {
        heading: '8. Term and termination',
        body: [
          'This Agreement takes effect on the date of signature and continues until terminated. You may terminate at any time by written notice once all positions are closed and all obligations settled. We may terminate immediately where required by law, regulation, or in the event of abusive trading, fraud, or breach of this Agreement.',
        ],
      },
      {
        heading: '9. Governing law',
        body: [
          `This Agreement is governed by the laws of the jurisdiction in which ${COMPANY.legalName} is licensed. Disputes are subject to the exclusive jurisdiction of its courts, without prejudice to any right of complaint to the competent regulator or ombudsman.`,
        ],
      },
    ],
  },
  {
    id: 'riskAcknowledgement',
    kind: DOC_KINDS.ACKNOWLEDGE,
    version: '1.8',
    updated: '2026-01-04',
    title: 'Risk Acknowledgement',
    summary: 'The specific risks of leveraged trading. Read and acknowledge.',
    highlight:
      'Contracts for Difference are complex instruments and carry a high risk of losing money rapidly due to leverage. 74–89% of retail investor accounts lose money when trading CFDs. You should consider whether you understand how CFDs work and whether you can afford to take the high risk of losing your money.',
    sections: [
      {
        heading: 'Leverage magnifies losses as well as gains',
        body: [
          'Leverage allows you to control a position considerably larger than the capital you commit. A small adverse movement in the underlying market produces a proportionally much larger loss on your account. At 1:100 leverage, a 1% move against your position eliminates 100% of the margin committed to it.',
        ],
      },
      {
        heading: 'Margin calls and automatic close-out',
        body: [
          'You are responsible for monitoring your margin level. If it falls below the close-out threshold, positions will be liquidated automatically and you may have no opportunity to add funds or manage the position first. Liquidation may occur at a materially worse price than the last price you observed.',
        ],
      },
      {
        heading: 'Gapping and slippage',
        body: [
          'Markets can gap — moving from one price to another with no trading in between — particularly at market open, around economic releases, and during periods of low liquidity. When this happens, Stop Loss orders execute at the next available price, which may be significantly worse than the level you set.',
        ],
      },
      {
        heading: 'Overnight financing',
        body: [
          'Positions held past the daily rollover incur a financing charge or credit. Holding leveraged positions over long periods can accumulate significant financing costs that erode returns independently of market direction.',
        ],
      },
      {
        heading: 'Technology and connectivity',
        body: [
          'Online trading carries risks arising from hardware failure, software faults and connectivity interruptions, on your side or ours. We are not liable for losses arising from circumstances beyond our reasonable control.',
        ],
      },
      {
        heading: 'No investment advice',
        body: [
          'We provide execution-only services. Nothing on the platform — including analysis, signals, news and educational material — constitutes investment advice or a personal recommendation. You trade on your own judgement and at your own risk.',
        ],
      },
    ],
  },
  {
    id: 'leverageRequest',
    kind: DOC_KINDS.LEVERAGE,
    version: '1.0',
    updated: '2026-01-04',
    title: 'Leverage Increase Request',
    summary: 'Apply for a higher leverage tier on your account.',
    highlight:
      'Higher leverage increases both potential profit and the speed at which losses accumulate. Approval is at the broker’s discretion and may require evidence of trading experience.',
    sections: [
      {
        heading: 'Before you apply',
        body: [
          'Increasing leverage does not increase your capital. It reduces the margin required per position, which means a smaller adverse move is enough to trigger a margin close-out.',
          'Requests are reviewed against your stated trading experience, account history and the appropriateness assessment completed at account opening. We may approve a tier lower than the one requested, or decline the request.',
        ],
      },
      {
        heading: 'If approved',
        body: [
          'The new limit applies to positions opened after approval. Existing open positions keep the leverage they were opened with. You may request a reduction back to a lower tier at any time, and reductions take effect immediately.',
        ],
      },
    ],
  },
  {
    id: 'taxResidency',
    kind: DOC_KINDS.TAX,
    version: '1.2',
    updated: '2026-01-04',
    title: 'Tax Residency Declaration',
    summary: 'Self-certification of tax residence under CRS and FATCA.',
    sections: [
      {
        heading: 'Why we ask',
        body: [
          'Under the OECD Common Reporting Standard (CRS) and the US Foreign Account Tax Compliance Act (FATCA), we are required to establish the tax residence of every account holder and to report account information to the relevant tax authorities where applicable.',
        ],
      },
      {
        heading: 'Your obligations',
        body: [
          'You must notify us within 30 days of any change in circumstances that affects your tax residence, and provide an updated declaration. Providing false information in a self-certification may carry penalties under the law of your jurisdiction.',
        ],
      },
    ],
  },
];

/**
 * Documents pushed from the CRM for this specific client — an account manager
 * sending an insurance cover note, a bespoke arrangement, a fee waiver. The
 * shape matches AGREEMENTS so the same viewer renders both; in production this
 * array is what the CRM endpoint returns.
 */
export const ADDITIONAL_DOCUMENTS = [
  {
    id: 'insuranceCover',
    kind: DOC_KINDS.SIGN,
    version: '1.0',
    updated: '2026-02-11',
    title: 'Account Protection Cover Note',
    summary: 'Optional insurance cover on eligible balances.',
    from: 'Account Manager',
    sections: [
      {
        heading: 'Cover provided',
        body: [
          'This cover note sets out supplementary protection offered on eligible cash balances held with the Company, underwritten by a third-party insurer, up to the limit stated in your account schedule.',
          'Cover applies to loss of client funds arising from insolvency of the Company or of a credit institution holding segregated client money. It does not cover trading losses of any kind, including losses resulting from market movement, leverage or margin close-out.',
        ],
      },
      {
        heading: 'Duration and cancellation',
        body: [
          'Cover runs for twelve months from the date of signature and renews automatically unless cancelled in writing by either party with 30 days’ notice. Cancellation does not affect claims arising before the cancellation date.',
        ],
      },
    ],
  },
  {
    id: 'spreadAdjustment',
    kind: DOC_KINDS.ACKNOWLEDGE,
    version: '1.0',
    updated: '2026-02-19',
    title: 'Negotiated Spread Schedule',
    summary: 'Revised pricing agreed with your account manager.',
    from: 'Account Manager',
    sections: [
      {
        heading: 'Revised pricing',
        body: [
          'Following review of your trading volume, a reduced spread schedule has been applied to your account on major FX pairs and index CFDs. The revised rates are shown on the platform at the point of trade.',
          'This schedule is reviewed quarterly against maintained volume. Should volume fall below the agreed threshold for two consecutive quarters, standard pricing will be reinstated with 30 days’ notice.',
        ],
      },
    ],
  },
];

// --- persistence ---------------------------------------------------------
// Submissions are kept locally so the panel survives a reload. When the CRM
// is wired in, replace these two functions and nothing in the UI changes.
const STORAGE_KEY = 'qp-documents';

export const readSubmissions = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const writeSubmissions = (next) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode — the record just will not survive a reload.
  }
};
