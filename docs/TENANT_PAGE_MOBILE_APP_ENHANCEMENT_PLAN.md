# Tenant Page Enhancement Plan – Customer Mobile App (RifahMobile)

This document describes the **current state** of the tenant page in the customer mobile app, what is **missing** compared to the tenant’s “My Page” configuration, and a **plan** to enhance it (theme colors, sections, and parity with tenant dashboard).

---

## 1. Current Situation

### 1.1 Data flow

- **Screen:** `RifahMobile/src/screens/TenantScreen.tsx`
- **Entry:** User opens a tenant (from home list, search, or deep link) with `tenantId` and optionally `slug` or full `tenant` object.
- **API:** 
  - `GET /public/tenant/:tenantId/page-data` → `generalSettings` (sections, theme), `aboutUs`, `heroSliders`, `pageBanners`, `tenantInfo`
  - `GET /public/tenant/:tenantId/services`
  - `GET /public/tenant/:tenantId/products`
  - `GET /public/tenant/:tenantId/staff`

### 1.2 What the tenant configures (My Page – tenant dashboard)

| My Page tab / config | Stored in | Purpose |
|----------------------|-----------|---------|
| **General Settings** | `PublicPageData.generalSettings` | Template, **theme** (primaryColor, secondaryColor, helperColor), **sections** (heroSlider, services, products, callToAction), logo |
| **Section visibility** | `generalSettings.sections` | heroSlider, services, products, **callToAction**, plus backend adds reviews, about |
| **Hero Slider** | `PublicPageData.heroSliders` | Array of slides (image, title, link, etc.) |
| **Pages Banners** | `pageBanner_services`, `_products`, `_about`, `_contact` | Banner image per section |
| **About Us** | About Us fields | Story, missions, visions, values, facilities (text + **facilitiesImages**), **final word** (title, text, type, image/icon) |
| **Reviews** | (future) | Reviews tab visibility |

### 1.3 What the mobile app currently shows

| Area | Implemented? | Notes |
|------|----------------|------|
| **Theme / colors** | No | Uses app-wide `colors.primary` etc. from `theme/colors.ts`. Does not read or apply `generalSettings.theme` from page-data. |
| **Hero** | Partial | Single hero image only (first slider image or aboutUs heroImage or tenant logo). No carousel. |
| **Tabs** | Yes | Services, Products, Reviews, About – visibility driven by `generalSettings.sections`. |
| **Services tab** | Yes | List by category, service cards, “Book” → ServiceDetail/Booking. |
| **Products tab** | Yes | Grid, add to cart, ProductDetail. |
| **Reviews tab** | Placeholder | “No reviews yet” – no API or real data. |
| **About tab** | Partial | Story, missions, visions, values, facilities **text**, location, working hours, contact, social. **Missing:** facilitiesImages gallery, final word block. |
| **Page banners** | No | Fetched into `pageBanners` state but never rendered (no section headers/banners per tab). |
| **Call to action** | No | Tenant can toggle “callToAction” in General Settings but the app has no CTA section/tab. |
| **Public page logo** | No | generalSettings.logo is in API; app uses tenant.logo or hero image, not public page logo. |

---

## 2. Gaps (missing vs tenant My Page)

### 2.1 Theme colors

- **Backend:** Page-data returns `generalSettings.theme`: `primaryColor`, `secondaryColor`, `helperColor`.
- **App:** All accent/primary UI uses `colors.primary` (e.g. tabs, buttons, links, map CTA). Tenant theme is ignored.
- **Gap:** Tenant’s chosen brand colors are not applied on the tenant page (or in booking/product flows opened from it).

### 2.2 Sections not presented or underused

| Section / feature | In tenant My Page? | In mobile app? | Gap |
|-------------------|--------------------|----------------|-----|
| Hero **slider** (carousel) | Yes – multiple slides | No – single image only | Show full hero carousel when `heroSliders.length > 0`. |
| **Call to action** | Yes – toggle in General | No | Add CTA block (e.g. “Book now” / “Contact” / custom text+link) when `sections.callToAction === true`. |
| **Page banners** | Yes – per tab (services, products, about, contact) | Fetched but not used | Use banners as section headers above Services, Products, About, or inside About for contact. |
| **Reviews** | Tab visibility (reviews, about) | Placeholder only | Integrate reviews API when available; until then keep placeholder or hide tab when empty. |
| **About – facilities images** | Yes – gallery | No – only facilities text | Render `aboutUs.facilitiesImages` as a small gallery. |
| **About – final word** | Yes – title, text, type (image/icon), image URL | No | Add final word block at end of About (image or icon + title + text). |
| **Public page logo** | Yes – in generalSettings | No | Prefer `generalSettings.logo` for header or hero when set. |

### 2.3 Other UX gaps

- **Rating / “Open now”:** Hero shows hardcoded “5.0 (120+)” and “Open Now • Closes 10 PM”. Should use real rating/review count and real opening hours (or remove if not available).
- **Template:** Tenant can choose template1/2/3 in dashboard; mobile does not vary layout by template (could be a later enhancement).

---

## 3. Enhancement Plan (prioritized)

### Phase 1 – Theme colors and one missing section

1. **Apply tenant theme colors on TenantScreen (and downstream flows)**  
   - From page-data: `data.generalSettings.theme` → `primaryColor`, `secondaryColor`, `helperColor`.  
   - Store in state or context for the tenant (e.g. `tenantTheme`).  
   - Use these colors for: tab underline, active tab text, primary buttons, “Add to cart” / “Book”, links, map CTA, service price, product price.  
   - Fallback to current `colors.primary` (and secondary/helper) when theme is missing.  
   - Optionally: pass `tenantTheme` into BookingFlow and ProductDetail so the whole “tenant journey” is themed.

2. **Call to action section**  
   - If `generalSettings.sections.callToAction === true`, show a CTA block (e.g. after hero or after tabs).  
   - Content: can start with a generic “Book now” / “Contact us” (link to booking or contact). Later: support optional CTA text/link from tenant config if added to PublicPageData.

### Phase 2 – Hero and banners

3. **Hero slider carousel**  
   - If `heroSliders.length > 0`, render a horizontal carousel (e.g. FlatList horizontal with paging) instead of a single image.  
   - Use first slide as fallback when heroSliders is empty (current behavior).  
   - Optional: tap to open link if slide has URL.

4. **Page banners**  
   - Use `pageBanners.services` / `pageBanners.products` as banner images above the Services and Products tab content.  
   - Use `pageBanners.about` and `pageBanners.contact` in About tab (e.g. above “About” and above “Contact” or “Location”).

### Phase 3 – About tab completion and reviews

5. **About – facilities images**  
   - In About tab, after facilities text, render `aboutUs.facilitiesImages` as a horizontal or grid image gallery (with `getImageUrl`).

6. **About – final word**  
   - Add a final block: `finalWordTitle`, `finalWordText`, and either `finalWordImageUrl` (if type image) or icon (`finalWordIconName`). Respect EN/AR.

7. **Public page logo**  
   - When `generalSettings.logo` is set, use it in hero (e.g. overlay on hero image) or as small logo in header.

8. **Reviews**  
   - When backend exposes reviews for tenant, replace placeholder with list and rating.  
   - If reviews are empty and section is visible, keep “No reviews yet” or hide the tab depending on product decision.

### Phase 4 – Polish and optional (implemented)

9. **Rating and open status**  
   - **Done:** Open/Closed and Closes/Opens from working hours. Rating placeholder until reviews API. Removed: “Open Now” with real data (reviews aggregate, working hours) when APIs exist.

10. **Template**  
   - **Done:** Hero height (300/260/220) and tab order per template. Contact banner above Contact in About.

---

## 4. Technical Notes

### 4.1 API (already in place)

- `GET /public/tenant/:tenantId/page-data` returns:
  - `data.generalSettings.theme` (primaryColor, secondaryColor, helperColor)
  - `data.generalSettings.sections` (heroSlider, services, products, callToAction, reviews, about)
  - `data.generalSettings.logo`
  - `data.heroSliders`, `data.pageBanners`, `data.aboutUs` (including facilitiesImages, finalWord*)
  - `data.tenantInfo`

No backend changes required for Phase 1–3; only mobile app changes.

### 4.2 Mobile app – suggested changes

- **TenantScreen:**  
  - Add state for `theme` from page-data (e.g. `tenantTheme`).  
  - Pass `tenantTheme` to child components or a small TenantThemeContext for this tenant stack.  
  - Replace hardcoded `colors.primary` (and secondary where needed) in TenantScreen with theme values.  
  - Add CTA block when `sections.callToAction` is true.  
  - Add hero carousel when `heroSliders.length > 0`.  
  - Use `pageBanners` in tab content.  
  - In About: add facilitiesImages gallery and final word block; optionally use public page logo in hero.

- **BookingFlow / ServiceDetail / ProductDetail:**  
  - Accept optional `tenantTheme` (or read from context) and use for buttons and accents so the whole flow matches the tenant page.

- **Theme fallback:**  
  - Keep `theme/colors.ts` as app default; override only for tenant-scoped screens when `tenantTheme` is present.

---

## 5. Summary Table

| Item | Current | Target |
|------|--------|--------|
| Theme colors | App default only | Use tenant theme from page-data on tenant page and booking/product flows |
| Hero | Single image | Carousel when multiple heroSliders |
| Call to action | Not shown | CTA block when section enabled |
| Page banners | Fetched, unused | Used as section headers for Services, Products, About, Contact |
| About – facilities images | Not shown | Gallery from aboutUs.facilitiesImages |
| About – final word | Not shown | Block with title, text, image or icon |
| Public page logo | Not used | Shown in hero or header when set |
| Reviews | Placeholder | Real data when API ready |

This plan aligns the customer mobile app’s tenant page with what tenants configure in “My Page” and ensures theme and sections are fully reflected.
