---
name: AgroLink Continental
colors:
  surface: '#f3fcef'
  surface-dim: '#d4ddd0'
  surface-bright: '#f3fcef'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf6e9'
  surface-container: '#e8f0e4'
  surface-container-high: '#e2ebde'
  surface-container-highest: '#dce5d9'
  on-surface: '#161d16'
  on-surface-variant: '#404940'
  inverse-surface: '#2a322a'
  inverse-on-surface: '#eaf3e7'
  outline: '#707a6f'
  outline-variant: '#bfc9bd'
  surface-tint: '#196c3b'
  primary: '#005128'
  on-primary: '#ffffff'
  primary-container: '#176b3a'
  on-primary-container: '#98e9ab'
  inverse-primary: '#88d89c'
  secondary: '#306b19'
  on-secondary: '#ffffff'
  secondary-container: '#b0f491'
  on-secondary-container: '#36721f'
  tertiary: '#5d4100'
  on-tertiary: '#ffffff'
  tertiary-container: '#7b5700'
  on-tertiary-container: '#ffd07c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a3f5b6'
  primary-fixed-dim: '#88d89c'
  on-primary-fixed: '#00210d'
  on-primary-fixed-variant: '#005228'
  secondary-fixed: '#b0f491'
  secondary-fixed-dim: '#95d878'
  on-secondary-fixed: '#052100'
  on-secondary-fixed-variant: '#175200'
  tertiary-fixed: '#ffdea7'
  tertiary-fixed-dim: '#f8bd45'
  on-tertiary-fixed: '#271900'
  on-tertiary-fixed-variant: '#5e4200'
  background: '#f3fcef'
  on-background: '#161d16'
  surface-variant: '#dce5d9'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: 3.5rem
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Manrope
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: 2.5rem
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Manrope
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.75rem
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 1.625rem
    fontWeight: '700'
    lineHeight: 2rem
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
  headline-sm:
    fontFamily: Manrope
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
  label-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
  label-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.02em
  currency-display:
    fontFamily: Manrope
    fontSize: 2rem
    fontWeight: '800'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The brand targets smallholder farmers, aggregators, logistics operators, and commercial off-takers across the Nigerian agricultural value chain. The design system projects institutional credibility, operational resilience, and pan-African vitality. It balances institutional fintech reliability with high-accessibility field logistics.

The aesthetic fuses **Modern Functionalism** with **Tactile Field-Utility**:
- **High-legibility ergonomics**: Built for outdoor legibility under direct sunlight on low-to-mid tier Android screens.
- **Dignified warmth**: Rich, fertile greens coupled with crop-harvest gold, avoiding sterile corporate coldness.
- **Physical durability cues**: Clean structural lines, deliberate micro-contrasts, tactile card surfaces, and generous hitboxes to accommodate all handling conditions in field operations.

## Colors
The palette derives from the agrarian ecosystem, balancing lush growth tones with functional UI requirements:

- **Primary (`#176B3A`)**: Deep Savannah Forest Green. Serves as the primary brand anchor, key action buttons, and dominant header structures.
- **Secondary (`#69A84F`)**: Sprout Green. Used for supportive data visualizations, secondary actions, active category markers, and verification states.
- **Tertiary Accent (`#F4B942`)**: Ripe Harvest Gold. Applied strictly for key commercial highlights, pricing incentives, alerts, pending indicators, and primary callouts.
- **Neutral Core (`#202820`)**: Deep Charcoal Peat. Used for primary typography, icons, and structural divider elements to deliver superior contrast over pure black.
- **Canvas Base**: `#F8FAF6` provides an organic, low-strain off-white surface that mitigates glare under outdoor lighting.
- **Surface Elevation**: Pure `#FFFFFF` for data cards, sheets, and modular panels, bordered cleanly by `#E5EAE3`.

### Semantic Status Tokens
- **Pending**: Text `#9A6700`, Background `#FEF6E7`, Border `#F8D890`.
- **In Transit**: Text `#14532D`, Background `#EDF7EE`, Border `#C6E7C9`.
- **Delivered**: Text `#0C4A6E`, Background `#E0F2FE`, Border `#BAE6FD`.
- **Verified / Settled**: Text `#176B3A`, Background `#E8F4EC`, Border `#A4D9B6`.
- **Critical / Escrow Issue**: Text `#991B1B`, Background `#FEF2F2`, Border `#FCA5A5`.

## Typography
The system employs **Manrope** for expressive, sturdy headlines and **Inter** for dense transactional UI, ledger listings, and multi-tier forms.

### Currency & Metrics Hierarchy
- The Nigerian Naira symbol (`₦`) inherits the weight and line height of its parent font size, rendered with tabular numerals (`font-variant-numeric: tabular-nums`) to maintain alignment across settlement logs and weight scales (e.g., `₦1,450,000.00 / Ton`).
- Subtext notes and units of measurement (Bags, MT, Crates) remain paired with `label-sm` or `body-sm` in a secondary neutral tone (`#556353`).
- For mobile-first interfaces, display levels collapse smoothly to designated mobile alternatives, maintaining baseline alignment on 4-pixel grid increments.

## Layout & Spacing
A fluid 12-column layout on desktop converts into a 6-column framework on tablet and a single/double-column stacked system on mobile devices:

- **Mobile Viewports (<640px)**: 16px (`1rem`) outer margins and gutters. Single-column primary workflows maximize vertical thumb reach. Primary transactional CTAs anchor to fixed bottom action sheets with a minimum touch height of 48px to 56px.
- **Tablet Viewports (640px - 1024px)**: 24px (`1.5rem`) outer canvas padding. Split views display product catalog listings on the left and lot specification sheets on the right.
- **Desktop Viewports (>1024px)**: 40px (`2.5rem`) outer margin with a maximum container bounding width of `1280px`. Provides side-by-side transaction ledgers, route logistics mappings, and real-time escrow analytics.
- **Component Flow**: Structural card containers and field listing items utilize `space-md` (`1rem`) internally, while transactional groups and metric pairs rely on `space-sm` (`0.5rem`).

## Elevation & Depth
The design system avoids heavy, artificial dropshadows in favor of grounded structural borders and crisp environmental layering:

- **Base Layering**: Surfaces sit on `#F8FAF6`. Elevated elements utilize pure `#FFFFFF` bounded by crisp hairline borders (`1px solid #E5EAE3`).
- **Ambient Shadow System**: Used sparingly for overlays, modal dialogue panels, and sticky trade confirmation footers:
  - *Level 1 (Cards, Micro-surfaces)*: `box-shadow: 0 1px 3px rgba(32, 40, 32, 0.04), 0 1px 2px rgba(32, 40, 32, 0.02)`
  - *Level 2 (Hovered lots, Dropdowns)*: `box-shadow: 0 4px 8px -2px rgba(32, 40, 32, 0.06), 0 2px 4px -2px rgba(32, 40, 32, 0.04)`
  - *Level 3 (Modals, Off-canvas sheets)*: `box-shadow: 0 16px 32px -8px rgba(32, 40, 32, 0.12), 0 4px 12px rgba(32, 40, 32, 0.04)`
- **Interactive Depth**: Clickable inventory cards rely on a 1px border shift to `#176B3A` and a background shift to `#FFFFFF` rather than deep isometric z-height shifts.

## Shapes
The shape language uses balanced rounded geometry (`roundedness: 2` / base `0.5rem` / `8px`):

- **Buttons & Interactive Inputs**: `8px` radius (`0.5rem`). Promotes clean structural alignment while softening tactile boundaries for outdoor interactions.
- **Cards, Containers, & Modals**: `16px` radius (`1rem` / `rounded-lg`) creates friendly, self-contained transaction islands.
- **Status Badges, Filter Chips, & Quantity Pills**: Fully rounded pill shapes (`9999px`) provide clear differentiation between categorical metadata and actionable rectangular cards.
- **Produce & Freight Visual Thumbnails**: Standardized to `8px` radius to maintain strict geometric rhythm alongside data tables.

## Components

### Buttons
- **Primary CTA**: Background `#176B3A`, text `#FFFFFF`, height `48px` (desktop) / `52px` (mobile). Hover state darkens to `#11522C`. Focus rings use a 2px offset with `#69A84F`.
- **Secondary CTA**: Background `#FFFFFF`, border `1.5px solid #176B3A`, text `#176B3A`. Hover state shifts background to `#E8F4EC`.
- **Accent CTA (Instant Buy / Lock Deal)**: Background `#F4B942`, text `#202820`, font weight `600`.
- **Disabled State**: Background `#E5EAE3`, text `#8A9888`, zero shadow, cursor not-allowed.

### Input Fields & Search Bars
- Standard height `48px`, background `#FFFFFF`, border `1px solid #E5EAE3`, internal padding `12px 16px`.
- **Active / Focus**: Border shifts to `2px solid #176B3A` with no offset outline.
- **Affix Elements**: Dedicated currency affix `₦` rendered in static container with `#F8FAF6` background and border right `1px solid #E5EAE3`.
- **Search Inputs**: Prefixed with high-contrast search icon, including quick-clear capability for rapid aggregation filtering.

### Marketplace Cards & Commodity Tiles
- Built on pure `#FFFFFF` background with `1px solid #E5EAE3` border and `16px` inner padding.
- Displays produce thumbnail, commodity grading (e.g., Grade A White Maize), moisture content indicator, source LGA/State (e.g., Dawanau, Kano State), price per metric ton, and total available stock.
- Bottom card deck houses a two-button cluster: "Inspect Lot" and "Commit Escrow".

### Status Badges
- Pill-shaped (`rounded-full`), height `24px`, horizontal padding `10px`, font size `12px` (`label-sm`).
- **Verified**: `#E8F4EC` background, `#176B3A` text, prefixed with a verified shield checkmark.
- **Pending**: `#FEF6E7` background, `#9A6700` text, prefixed with a clock icon.
- **In Transit**: `#EDF7EE` background, `#14532D` text, prefixed with a truck logistics icon.
- **Delivered**: `#E0F2FE` background, `#0C4A6E` text, prefixed with a package drop icon.

### Checkboxes & Radio Selectors
- Touch target minimum `44px x 44px` enclosing a `20px x 20px` active control.
- Checkbox uses `4px` corner radius; radio uses circle. Unchecked: `1.5px solid #A4B2A2`. Checked: `#176B3A` fill with pure white tick/dot.

### Filter & Category Chips
- Height `36px`, padding `8px 16px`. Default state: `#FFFFFF` fill with `1px solid #E5EAE3` border and `#202820` text.
- Active selected state: `#176B3A` background with `#FFFFFF` text and zero border.

### Escrow & Price Breakdown Sheet (Agro-Specific)
- Clean, high-density ledger component separating Base Crop Value, Platform Escrow Fee, Logistics/Haulage, and Transit Insurance.
- Final payout total prominently anchored with `currency-display` token in `#176B3A`.