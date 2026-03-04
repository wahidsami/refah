# Pricing Formula: Services & Products (Tenant Dashboard)

## Correct equation

1. **Subtotal before tax** = raw price + platform fee  
   - Platform fee = raw price × (commission rate %), e.g. 10%.

2. **Tax** = 15% of **(raw price + platform fee)**  
   - Tax rate is applied to the subtotal (raw + platform fee), not to raw only.

3. **Final total price** = subtotal before tax + tax  
   - i.e. **(raw price + platform fee) × 1.15** when tax is 15%.

### Example (raw = 100 SAR, commission 10%, tax 15%)

- Platform fee = 100 × 0.10 = **10 SAR**
- Subtotal before tax = 100 + 10 = **110 SAR**
- Tax = 110 × 0.15 = **16.50 SAR**
- **Final price = 110 + 16.50 = 126.50 SAR**

---

## Where it’s implemented

| Place | What |
|-------|------|
| **Server** | |
| `server/src/models/Appointment.js` | `calculateRevenueBreakdown()` – booking/appointment pricing |
| `server/src/models/Service.js` | `calculateFinalPrice()` – service final price |
| `server/src/controllers/tenantServiceController.js` | `calculateFinalPrice()` – create/update service |
| `server/src/controllers/tenantProductController.js` | `calculateProductPrice()` – create/update product |
| **Tenant dashboard** | |
| Services list / new / edit | Breakdown: raw → platform fee → subtotal → tax (15% of subtotal) → final |
| Products new | Same breakdown in price preview |

---

## Old vs new formula

- **Old:** tax = 15% of raw; platform fee = 10% of raw; final = raw + tax + platform fee.  
  (Tax was on raw only.)

- **New:** subtotal = raw + platform fee; tax = 15% of subtotal; final = subtotal + tax.  
  (Tax is on raw + platform fee.)

This matches the requirement: *“(raw price + platform fee) → then 15% tax on that sum → add to get final total.”*
