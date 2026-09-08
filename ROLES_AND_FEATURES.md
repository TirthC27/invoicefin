# InvoiceFi: Roles & Features Documentation

This document outlines the four primary user roles within the InvoiceFi platform, detailing their access levels, responsibilities, and specific features available in their respective portals.

---

## 1. Investor (Public User)
**Description:** Investors provide capital to fund invoice pools in exchange for yield. This is a public role that anyone can register for.

**Features & Pages:**
- **Investor Dashboard (`/investor/dashboard`):**
  - High-level overview of portfolio value, total yield earned, and available capital.
  - Quick access to trending or newly available invoice pools.
- **Browse Pools (`/investor/pools`):**
  - List of active invoice pools open for funding.
  - Filtering and sorting by yield, duration, and risk profile.
- **Pool Details & Investment (`/investor/pools/:id`):**
  - In-depth view of a specific invoice pool (exporter details, invoice amounts, maturity dates).
  - Yield calculator for potential returns.
  - Web3 Wallet integration to perform on-chain investments.
  - On-chain transaction verification.
- **Portfolio (`/investor/portfolio`):**
  - Detailed tracking of active and matured investments.
  - Historical transaction list and yield realized.
- **Recovery View (`/investor/recovery`):**
  - Read-only tracking of defaulted pools that the investor has capital in.
  - Visibility into recovery events and legal updates provided by Law Firms.

---

## 2. Exporter (Public User)
**Description:** Exporters are businesses that upload their invoices to receive early liquidity by creating investment pools. This is a public role that anyone can register for.

**Features & Pages:**
- **Exporter Dashboard (`/exporter/dashboard`):**
  - Overview of total financing received, upcoming maturities, and active invoices.
- **Upload Invoice (`/exporter/upload`):**
  - Form to upload new invoices (buyer details, amounts, due dates, and supporting documents).
- **Invoice Management (`/exporter/invoices`):**
  - List view of all uploaded invoices and their current platform status (Pending, Validated, Pooled, Matured, Defaulted).
- **Invoice Details & Pool Creation (`/exporter/invoices/:id`):**
  - Detailed view of a specific invoice.
  - Ability to convert a validated invoice into an **Invoice Pool** to open it up for investor funding.
  - Mark invoices as Matured (repaid by the buyer).

---

## 3. Administrator (Internal Role)
**Description:** Admins oversee the entire platform, manage internal user accounts (like Law Firms), and handle disputes or defaults.

**Features & Pages:**
- **Admin Dashboard (`/admin/dashboard`):**
  - Platform-wide statistics (total volume financed, active pools, user counts, default rates).
- **User Management (`/admin/users`):**
  - Directory of all registered users on the platform (Investors, Exporters, Law Firms).
- **Law Firm Management (`/admin/law-firms`):**
  - Create and register new Law Firm accounts (generates temporary passwords for them).
  - List and manage existing Law Firm profiles.
- **Recovery Cases (`/admin/recovery-cases`):**
  - View defaulted invoice pools.
  - Create formal Recovery Cases for defaulted pools.
  - Assign Recovery Cases to specific onboarded Law Firms for legal action.

---

## 4. Law Firm (Internal/Partner Role)
**Description:** Law Firms are specialized partners onboarded by Administrators to handle the legal recovery process of defaulted invoice pools.

**Features & Pages:**
- **Law Firm Dashboard (`/lawfirm/dashboard`):**
  - Overview of active legal cases assigned to the firm and upcoming deadlines.
- **Assigned Cases (`/lawfirm/cases`):**
  - List of all recovery cases specifically assigned to this law firm by the Admin.
- **Case Details & Management (`/lawfirm/cases/:id`):**
  - Detailed view of the defaulted pool, the exporter, and the investors involved.
  - **Upload Documents:** Upload legal notices, court filings, and settlement documents.
  - **Recovery Events:** Add timeline events (e.g., "Notice Sent", "Court Hearing Scheduled") to keep Admins and Investors updated on the recovery progress.
