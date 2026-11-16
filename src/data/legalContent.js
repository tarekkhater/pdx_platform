/**
 * Placeholder legal + company copy.
 *
 * This is the file to edit when a broker supplies their own documents — the
 * UI renders whatever is here, so nothing in the components needs touching.
 * Each document is a list of { heading, body } sections; `body` may be a
 * string or an array of strings (rendered as separate paragraphs).
 */

import { BRAND } from '@/config/brand';

export const COMPANY = {
  name: BRAND.name,
  legalName: 'Hitomorrow Securities Ltd',
  registration: 'Company No. H326383',
  address: '1 Example Street, Floor 10, City, Country',
  email: 'Info@Hitomorrow.app',
  phone: '+35770223363',
  website: 'bim.hitomorrow.app',
  websiteUrl: 'https://bim.hitomorrow.app/',
};

export const ABOUT = {
  tagline: 'Institutional-grade execution, built for everyone.',
  intro: [
    `BeinMarkets is an authorized representative of Hitomorrow, registered in Cyprus under number 326383. is a multi-asset brokerage providing access to global markets through a single, transparent trading account. We combine deep liquidity, competitive pricing and a platform designed to stay out of your way.`,
    'Our clients trade foreign exchange, indices, commodities, equities and digital assets from one interface, on desktop and mobile, with the same pricing and the same execution logic across both.',
  ],
  values: [
    {
      title: 'Transparent pricing',
      body: 'Spreads, swaps and commissions are published up front. There are no hidden markups applied at execution.',
    },
    {
      title: 'Client funds held separately',
      body: 'Client money is held in segregated accounts with tier-one banking partners and is never used for company operations.',
    },
    {
      title: 'Execution you can audit',
      body: 'Every fill is timestamped and available in your trade history, so you can review exactly how and when an order was executed.',
    },
    {
      title: 'Support that answers',
      body: 'A dedicated account team is available during market hours in multiple languages, by chat, email and phone.',
    },
  ],
  regulatory:
    'Trading leveraged products carries a high level of risk and may not be suitable for all investors. You may lose more than your initial deposit. Please ensure you fully understand the risks involved and seek independent advice where necessary.',
};

export const LEGAL_DOCUMENTS = [
  {
    id: 'terms',
    title: 'Terms of Service',
    updated: '2026-01-15',
    sections: [
      {
        heading: '1. Agreement',
        body: [
          `These Terms of Service ("Terms") govern your access to and use of the trading platform, websites and related services provided by ${COMPANY.legalName} ("the Company", "we", "us").`,
          'By opening an account, funding it, or placing an order, you confirm that you have read, understood and accepted these Terms in full.',
        ],
      },
      {
        heading: '2. Eligibility',
        body: 'You must be at least 18 years of age and legally capable of entering into a binding contract in your jurisdiction. The Company does not offer services to residents of restricted territories and reserves the right to decline or close any account at its discretion.',
      },
      {
        heading: '3. Account and security',
        body: 'You are responsible for maintaining the confidentiality of your credentials and for all activity that occurs under your account. Notify us immediately of any unauthorised access. We may suspend access where we reasonably suspect a security compromise.',
      },
      {
        heading: '4. Orders and execution',
        body: [
          'Orders are executed on a best-efforts basis according to prevailing market conditions. Quoted prices are indicative and may move between the time an order is submitted and the time it is filled.',
          'The Company is not liable for losses arising from latency, connectivity interruptions, or market gaps outside of its reasonable control.',
        ],
      },
      {
        heading: '5. Fees and charges',
        body: 'Applicable spreads, commissions, overnight financing and withdrawal fees are published in the platform and may be amended with reasonable notice. Fees are deducted automatically from the trading account.',
      },
      {
        heading: '6. Suspension and termination',
        body: 'We may suspend or terminate an account where required by law, where these Terms are breached, or where account activity is consistent with market abuse, fraud, or money laundering. Remaining client funds will be returned subject to applicable checks.',
      },
      {
        heading: '7. Governing law',
        body: 'These Terms are governed by the laws of the jurisdiction in which the Company is incorporated. Disputes shall be subject to the exclusive jurisdiction of its competent courts.',
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    updated: '2026-01-15',
    sections: [
      {
        heading: '1. Data we collect',
        body: 'We collect identification data (name, date of birth, nationality), contact data, financial and suitability information, identity documents submitted for verification, and technical data such as IP address, device identifiers and platform activity logs.',
      },
      {
        heading: '2. Why we process it',
        body: [
          'To open and operate your account, execute and settle transactions, and provide support.',
          'To meet legal obligations, including identity verification, sanctions screening, transaction monitoring and record keeping.',
          'To improve platform reliability, detect fraud, and — where you have consented — to send service and marketing communications.',
        ],
      },
      {
        heading: '3. Sharing',
        body: 'Data may be shared with liquidity and payment providers, identity verification partners, auditors, and competent regulatory or law enforcement authorities. We do not sell personal data to third parties.',
      },
      {
        heading: '4. Retention',
        body: 'Records are retained for the period required by applicable financial regulation — typically a minimum of five years following the closure of an account — after which they are deleted or anonymised.',
      },
      {
        heading: '5. Your rights',
        body: `Subject to applicable law you may request access to, correction of, or deletion of your personal data, object to certain processing, and request portability. Requests can be sent to ${COMPANY.email}.`,
      },
    ],
  },
  {
    id: 'risk',
    title: 'Risk Disclosure',
    updated: '2026-01-15',
    sections: [
      {
        heading: '1. Leverage',
        body: 'Leveraged trading magnifies both gains and losses. A relatively small market movement against your position may result in a loss exceeding the margin you deposited. You should not trade with capital you cannot afford to lose.',
      },
      {
        heading: '2. Market risk',
        body: 'Prices are influenced by factors outside the control of any participant, including economic data, monetary policy, geopolitical events and liquidity conditions. Past performance is not an indicator of future results.',
      },
      {
        heading: '3. Margin and liquidation',
        body: 'You are responsible for maintaining sufficient margin at all times. Where the margin level falls below the required threshold, open positions may be closed automatically and without prior notice.',
      },
      {
        heading: '4. Digital assets',
        body: 'Digital asset markets can be highly volatile, may trade continuously without scheduled closes, and may experience sharp liquidity withdrawal. Exposure to these instruments carries elevated risk.',
      },
      {
        heading: '5. Technology',
        body: 'Online trading is subject to risks including connectivity failure, hardware faults and latency. The Company maintains redundancy but cannot guarantee uninterrupted platform availability.',
      },
    ],
  },
  {
    id: 'aml',
    title: 'AML & KYC Policy',
    updated: '2026-01-15',
    sections: [
      {
        heading: '1. Commitment',
        body: 'The Company operates a risk-based anti-money-laundering and counter-terrorist-financing programme in line with applicable regulation and FATF recommendations.',
      },
      {
        heading: '2. Customer due diligence',
        body: 'Before an account may trade or withdraw, we verify identity and address using official documentation, screen against sanctions and politically exposed person lists, and establish the source of funds where the risk profile requires it.',
      },
      {
        heading: '3. Ongoing monitoring',
        body: 'Account and transaction activity is monitored on an ongoing basis. Activity inconsistent with a client profile may trigger a request for further information and, where appropriate, a report to the relevant authority.',
      },
      {
        heading: '4. Prohibited activity',
        body: 'Third-party funding, anonymous payment methods, and the use of an account by anyone other than the verified holder are not permitted and will result in suspension.',
      },
      {
        heading: '5. Record keeping',
        body: 'Verification records and transaction data are retained for the statutory period and made available to regulators on lawful request.',
      },
    ],
  },
  {
    id: 'cookies',
    title: 'Cookie Policy',
    updated: '2026-01-15',
    sections: [
      {
        heading: '1. What cookies we use',
        body: 'Strictly necessary cookies keep you signed in and secure your session. Preference cookies remember settings such as language and theme. Analytics cookies help us understand aggregate platform usage.',
      },
      {
        heading: '2. Managing cookies',
        body: 'Non-essential cookies can be declined without affecting access to your account. Most browsers also allow you to block or delete cookies, though disabling strictly necessary cookies will prevent the platform from functioning.',
      },
      {
        heading: '3. Third parties',
        body: 'Some analytics and fraud-prevention cookies are set by processors acting on our behalf under contract. They are not permitted to use the data for their own purposes.',
      },
    ],
  },
];
