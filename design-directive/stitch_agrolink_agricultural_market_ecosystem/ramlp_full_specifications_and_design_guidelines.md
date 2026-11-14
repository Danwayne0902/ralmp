# AgroLink RAMLP (Rural Agricultural Market Linkage Platform)
## Complete Technical Specification & Design Guidelines Architecture

---

### 1. Executive Summary & Regulatory Framework
The Rural Agricultural Market Linkage Platform (RAMLP / AgroLink) is Nigeria's flagship institutional commodity trading, collateralized haulage, and tripartite escrow settlement infrastructure. Built under the regulatory oversight of the **Central Bank of Nigeria (CBN)**, **NIBSS (Nigeria Inter-Bank Settlement System)**, **Federal Ministry of Agriculture and Food Security (FMAFS)**, and the **Nigerian Stored Products Research Institute (NSPRI) / Standards Organisation of Nigeria (SON)**.

#### Core Value Architecture
- **Tripartite Custodial Escrow**: 100% pre-funded buyer capital held in Providus Bank Custodial Trust & Stanbic IBTC Guaranteed Buffer vaults under CBN Circular `FSR/DIR/GEN/07/041`.
- **Statutory Milestone Payout Pipeline**:
  - *Tranche 1 (10% - 30%)*: Outbound Farm Gate Verification & Origin Weighbridge Dispatch Advance.
  - *Tranche 2 (60% - 70%)*: Destination Weighbridge Gate-In Gross-Tare Reconciliation & Spectrometry Moisture/Aflatoxin Lab Pass.
  - *Tranche 3 (10% - 30%)*: Destination Mill Silo Offloading Discharge & Final Buyer Acceptance.
- **Cryptographic Chain of Custody**: SHA-256 digital stamps, ANPR camera weighbridge records, and GNSS corridor telematics.
- **Inclusive Financial Infrastructure**: Native smartphone portals paired with GSM SMS/USSD (`*347*44#`) transaction authorization and clearance confirmations for non-smartphone smallholders in rural belts (e.g., Saki, Gboko, Dawanau).

---

### 2. Design System & Visual Tokens (`AgroLink Continental`)

| Token Category | Specification | Hex / Value | Usage & Rationale |
|---|---|---|---|
| **Primary Brand** | Forest Green | `#176B3A` | Evokes agricultural vitality, institutional authority, CBN alignment |
| **Primary Container** | Pale Mint Leaf | `#EDF6E9` | Card backdrops, subtle badges, state indicators |
| **Secondary Accent** | Harvest Gold / Amber | `#F4B942` | Financial escrow locked states, in-transit telemetry, warnings |
| **Surface Base** | Natural Off-White | `#F8FAF6` / `#F3FCEF` | Reduces screen glare in outdoor daylight farmgate inspections |
| **Surface Container** | Pure Crisp White | `#FFFFFF` | Core content cards, elevation depth |
| **Text Primary** | Deep Jungle Charcoal | `#0F2417` | High contrast (14.2:1 WCAG AAA) readability in bright sunlight |
| **Text Muted** | Sage Muted Grey | `#52634F` | Metadata captions, secondary labels, reference IDs |
| **Dispute Alert** | Earth Terracotta / Red | `#BA1A1A` | Escrow freeze, moisture violation, legal arbitration triggers |
| **Typography** | Manrope Variable | Sans-serif (300-800) | Geometric legibility, tabular numerals for currency (`₦`) & metric tons (`MT`) |
| **Border Radius** | ROUND_EIGHT | `8px` - `16px` | Modern, trustworthy, enterprise fintech balance |

---

### 3. Screen Inventory & Flow Relationships
1. **Public Marketing & Spot Index**: `{{DATA:SCREEN:SCREEN_17}}` (Desktop)
2. **Unified Role Authentication**: `{{DATA:SCREEN:SCREEN_15}}` (Desktop)
3. **Producer Smartphone Suite**:
   - Market Hub & Weather Telematics: `{{DATA:SCREEN:SCREEN_20}}`
   - Active Produce Inventory: `{{DATA:SCREEN:SCREEN_8}}`
   - Add Produce Harvest Modal: `{{DATA:SCREEN:SCREEN_10}}`
   - Sales & Disbursed Payouts: `{{DATA:SCREEN:SCREEN_7}}`
   - Orders & Waybill Tracking: `{{DATA:SCREEN:SCREEN_4}}`
   - NIBSS Interactive Receipt & QR Clearance: `{{DATA:SCREEN:SCREEN_6}}`
4. **Offline Smallholder Fallback**:
   - Rural USSD / Feature Phone Interactive Terminal (`*347*44#`) & SMS Push Clearance Gateway.
5. **Commercial Buyer & Procurement Suite**:
   - Wholesale Commodity Exchange: `{{DATA:SCREEN:SCREEN_19}}`
   - Multi-Lot Batch Negotiation Portal: `{{DATA:SCREEN:SCREEN_9}}`
   - Escrow Checkout & Milestone Funding: `{{DATA:SCREEN:SCREEN_18}}`
   - Buyer Settlement & Escrow Master Ledger: `{{DATA:SCREEN:SCREEN_2}}`
6. **Logistics & Telematics Suite**:
   - Desktop Fleet Management Portal: `{{DATA:SCREEN:SCREEN_16}}`
   - Mobile e-Waybill & Digital Gate-In Terminal: `{{DATA:SCREEN:SCREEN_12}}`
7. **Inspection & Quality Verification**:
   - Desktop Moisture Lab Sign-off: `{{DATA:SCREEN:SCREEN_14}}`
   - Mobile Inspector Terminal: `{{DATA:SCREEN:SCREEN_11}}`
8. **Dispute & Legal Governance**:
   - Admin Dispute & Escrow Freeze Review: `{{DATA:SCREEN:SCREEN_13}}`
   - High Court Arbitrator Escrow Release Certificate & Final Enforcement Award (Desktop).

---

### 4. Technical Integration Protocols
- **NIBSS Instant Payment (NIP)**: Direct webhook settlement upon dual-signatory escrow release.
- **IoT Weighbridge ANPR Engine**: Automated gross-tare differential calculation (`Origin Gross - Dest Gross <= 1.0%`).
- **NIRS Moisture Spectrometry**: Automated grade mapping (`Grade A <= 12.5%`, `Grade B <= 14.0%`).
- **SMS Gateway**: GSM Short Code `34744` with Hausa, Yoruba, Igbo, and Nigerian Pidgin localization strings.
