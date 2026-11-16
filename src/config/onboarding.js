/**
 * Account-opening questionnaire.
 *
 * Shape and wording live here so a broker can match their own regulator's
 * requirements without touching the wizard. Every `id` maps to a translation
 * key under `onboarding.fields.*`, and every option to
 * `onboarding.options.<optionSet>.<value>`.
 *
 * The financial and experience steps are not decoration: brokers offering
 * leveraged products generally have to assess whether the product is
 * appropriate for the client before opening the account.
 */

export const STEPS = [
  {
    id: 'personal',
    fields: [
      { id: 'firstName', type: 'text', required: true, autoComplete: 'given-name' },
      { id: 'lastName', type: 'text', required: true, autoComplete: 'family-name' },
      { id: 'dateOfBirth', type: 'date', required: true, autoComplete: 'bday' },
      { id: 'nationality', type: 'text', required: true, autoComplete: 'country-name' },
      { id: 'phone', type: 'tel', required: true, autoComplete: 'tel' },
    ],
  },
  {
    id: 'address',
    fields: [
      /**
       * Country and currency are `remote`: their options come from the
       * platform, not from OPTION_SETS. Which countries a broker may onboard
       * is a licensing question and changes without a front-end release, and
       * the account's base currency has to be one the platform actually
       * settles in.
       */
      { id: 'country', type: 'select', required: true, options: 'countries', remote: true },
      { id: 'currency', type: 'select', required: true, options: 'currencies', remote: true },
      { id: 'city', type: 'text', required: true, autoComplete: 'address-level2' },
      { id: 'street', type: 'text', required: true, autoComplete: 'street-address' },
      { id: 'postalCode', type: 'text', required: true, autoComplete: 'postal-code' },
    ],
  },
  {
    id: 'financial',
    fields: [
      { id: 'employment', type: 'select', required: true, options: 'employment' },
      { id: 'annualIncome', type: 'select', required: true, options: 'income' },
      { id: 'sourceOfFunds', type: 'select', required: true, options: 'funds' },
      { id: 'expectedDeposit', type: 'select', required: true, options: 'deposit' },
    ],
  },
  {
    id: 'experience',
    fields: [
      { id: 'tradingExperience', type: 'select', required: true, options: 'experience' },
      { id: 'tradingFrequency', type: 'select', required: true, options: 'frequency' },
      { id: 'riskTolerance', type: 'select', required: true, options: 'risk' },
      // Regulatory declarations. Either answered "yes" needs manual review
      // rather than a straight-through approval.
      { id: 'politicallyExposed', type: 'select', required: true, options: 'yesNo' },
      { id: 'usTaxResident', type: 'select', required: true, options: 'yesNo' },
    ],
  },
  { id: 'review', fields: [] },
];

export const OPTION_SETS = {
  employment: ['employed', 'selfEmployed', 'student', 'retired', 'unemployed'],
  income: ['under25k', 'from25to50k', 'from50to100k', 'from100to250k', 'over250k'],
  funds: ['salary', 'savings', 'investments', 'business', 'inheritance', 'other'],
  deposit: ['under1k', 'from1to5k', 'from5to25k', 'from25to100k', 'over100k'],
  experience: ['none', 'underOneYear', 'oneToThree', 'overThree'],
  frequency: ['never', 'occasionally', 'monthly', 'weekly', 'daily'],
  risk: ['low', 'medium', 'high'],
  yesNo: ['no', 'yes'],
};

export const emptyAnswers = () =>
  Object.fromEntries(STEPS.flatMap((s) => s.fields).map((f) => [f.id, '']));

/**
 * Answers that mean the application cannot be auto-approved. Shown on the
 * review step so the client is told up front rather than after submitting.
 */
export const needsManualReview = (answers) =>
  answers.politicallyExposed === 'yes' || answers.usTaxResident === 'yes';

/**
 * The questionnaire answers, as the registration endpoint expects them.
 *
 * The account is created here rather than on the sign-up form because the
 * endpoint needs the name, address and phone that only this wizard collects.
 * Submitting earlier would create an account with placeholder details that a
 * client could walk away from half-finished.
 */
export const toRegisterPayload = ({ answers, credentials, deskRef }) => ({
  name: answers.firstName,
  surname: answers.lastName,
  email: credentials.email,
  password: credentials.password,
  confirm_password: credentials.password,
  phone: answers.phone,
  country: answers.country,
  currency: answers.currency,
  postal: answers.postalCode,
  address: [answers.street, answers.city].filter(Boolean).join(', '),
  permanent_address: [answers.street, answers.city].filter(Boolean).join(', '),
  type_account: 1,
  ...(deskRef ? { desk_ref: deskRef } : {}),
});

/**
 * The suitability answers, which the registration endpoint has no fields for.
 * Sent straight after the account exists.
 */
export const toProfileExtras = (answers) => ({
  date_of_birth: answers.dateOfBirth,
  nationality: answers.nationality,
  employment: answers.employment,
  annual_income: answers.annualIncome,
  source_of_funds: answers.sourceOfFunds,
  expected_deposit: answers.expectedDeposit,
  trading_experience: answers.tradingExperience,
  trading_frequency: answers.tradingFrequency,
  risk_tolerance: answers.riskTolerance,
  politically_exposed: answers.politicallyExposed,
  us_tax_resident: answers.usTaxResident,
});
