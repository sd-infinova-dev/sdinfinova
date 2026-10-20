/**
 * SD Infinova — Centralized Pricing Packages & Scoping Configuration
 * Currency: Nepalese Rupees (NPR)
 */

export interface PricingPackage {
  id: string;
  title: string;
  price: number;
  priceDisplay: string;
  isStartingFrom?: boolean;
  isRecommended?: boolean;
  targetCustomers: string;
  description: string;
  inclusions: string[];
  revisions: string;
  deliveryTime: string;
  excludes: string[];
  ctaText: string;
  projectTypeValue: string;
  budgetRangeValue: string;
}

export const PRICING_PACKAGES: PricingPackage[] = [
  {
    id: 'landing-page',
    title: 'Landing Page',
    price: 4999,
    priceDisplay: 'NPR 4,999',
    isStartingFrom: false,
    isRecommended: false,
    targetCustomers: 'Individuals, startups, and small businesses that need a simple online presence.',
    description: 'A focused, single-page responsive web showcase to present your services and collect leads.',
    inclusions: [
      'One-page responsive website',
      'Hero, about, services, and contact sections as appropriate',
      'WhatsApp and social media links',
      'Mobile, tablet, and desktop layouts',
      '1 revision round',
      'Target delivery: 3–5 working days (after content received)'
    ],
    revisions: '1 revision round',
    deliveryTime: '3–5 working days',
    excludes: [
      'Backend or database development',
      'Booking systems and admin dashboards',
      'Paid domain, hosting, premium assets, and third-party services',
      'Complex custom functionality'
    ],
    ctaText: 'Choose Landing Page',
    projectTypeValue: 'Landing Page Website (NPR 4,999)',
    budgetRangeValue: 'NPR 4,999 (Landing Page Package)'
  },
  {
    id: 'business-website',
    title: 'Business Website',
    price: 7500,
    priceDisplay: 'NPR 7,500',
    isStartingFrom: false,
    isRecommended: true,
    targetCustomers: 'Dental clinics, cafés, salons, photography businesses, and other local service businesses in Nepal.',
    description: 'Our most popular package for local businesses seeking a credible, multi-page web presence.',
    inclusions: [
      'Up to 4 standard pages (Home, About, Services, Contact)',
      'Custom responsive website design tailored to business requirements',
      'Interactive contact inquiry form with backend persistence',
      'Google Maps location embed and social media links',
      '2 revision rounds',
      'Target delivery: 5–8 working days (after content received)'
    ],
    revisions: '2 revision rounds',
    deliveryTime: '5–8 working days',
    excludes: [
      'Complex backend systems',
      'Custom booking and appointment management',
      'Admin dashboards and database-backed features',
      'Automated payment gateway integration',
      'Domain, hosting, and other third-party costs'
    ],
    ctaText: 'Start Your Website',
    projectTypeValue: 'Business Website (NPR 7,500)',
    budgetRangeValue: 'NPR 7,500 (Business Website - Recommended)'
  },
  {
    id: 'professional-website',
    title: 'Professional Website',
    price: 12500,
    priceDisplay: 'NPR 12,500',
    isStartingFrom: false,
    isRecommended: false,
    targetCustomers: 'Businesses that need more pages and a more tailored presentation.',
    description: 'Comprehensive multi-page presentation with custom brand typography and photo gallery.',
    inclusions: [
      'Up to 6 standard pages',
      'More customized UI, layouts, and studio branding',
      'Responsive mobile, tablet, and desktop layouts',
      'Gallery and lead-generation inquiry form',
      'Basic on-page SEO setup & meta tags',
      '2 revision rounds',
      'Target delivery: 7–12 working days (after content received)'
    ],
    revisions: '2 revision rounds',
    deliveryTime: '7–12 working days',
    excludes: [
      'Complex custom applications',
      'Advanced booking systems',
      'Admin dashboards and custom database functionality',
      'Payment gateway integration unless separately quoted',
      'Domain, hosting, and third-party costs'
    ],
    ctaText: 'Choose Professional',
    projectTypeValue: 'Professional Website (NPR 12,500)',
    budgetRangeValue: 'NPR 12,500 (Professional Website Package)'
  },
  {
    id: 'ecommerce-custom',
    title: 'E-commerce & Custom Systems',
    price: 15000,
    priceDisplay: 'From NPR 15,000',
    isStartingFrom: true,
    isRecommended: false,
    targetCustomers: 'Brands needing online stores, order processing, catalogs, or custom digital applications.',
    description: 'Starting from NPR 15,000 — Request a Quote. The final fee depends on scope, product catalogue, backend, admin dashboard, inventory, order handling, and payment requirements.',
    inclusions: [
      'Starting from NPR 15,000 — Request a Quote',
      'Architectural scoping session and confirmed written quotation before work begins',
      'Product catalog or custom data architecture',
      'Inquiry-based order placement or custom workflow',
      'Responsive design across mobile and desktop devices',
      'Milestone-based delivery timeline tailored to scope'
    ],
    revisions: 'Milestone-based revisions',
    deliveryTime: 'Scope-dependent (quoted prior to kickoff)',
    excludes: [
      'Complete production-ready e-commerce or automated eSewa/Khalti/Fonepay integration is NOT included in the NPR 15,000 base fee',
      'Payment gateway integration requires custom scoping and API merchant keys',
      'Domain, hosting, SMS gateway, and third-party service fees'
    ],
    ctaText: 'Request a Quote',
    projectTypeValue: 'E-commerce & Custom Systems (From NPR 15,000)',
    budgetRangeValue: 'From NPR 15,000 (E-commerce / Custom Systems)'
  }
];

export const PRICING_DISCLAIMER =
  'Prices are introductory starting prices for projects within the listed scope. Domain, hosting, paid third-party services, and additional features are charged separately where applicable. Final pricing and delivery timelines are confirmed after discussing your requirements.';

export const DELIVERY_TIMELINE_NOTE =
  'Delivery estimates begin after the required content, assets, and approvals are received.';

/**
 * Helper to format NPR amounts
 */
export function formatNPR(amount: number): string {
  return `NPR ${amount.toLocaleString('en-IN')}`;
}
