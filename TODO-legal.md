# Legal Pages — Pre-Launch TODO

These items require real-world information that cannot be filled in programmatically.
Complete them before submitting Stripe or Bridge.xyz onboarding applications.

---

## BLOCKER: Registered Business Address

Both contact sections currently show no address. Stripe and Bridge will reject
applications without a verifiable registered address.

Add to **both** files once you have it:

**`src/pages/privacy.astro` ? Section 15 (Contact Us)**
**`src/pages/terms.astro` ? Section 16 (Contact)**

```
FodyLabs LLC — operating FodyPay
[Street Address]
[City, State ZIP]
United States
Email: ...
```

---

## BLOCKER: State of Incorporation

Governing Law in `src/pages/terms.astro` §14 has a placeholder:
> `State of [STATE — e.g. Wyoming or Delaware]`

Replace with the actual state once FodyLabs LLC is registered.

**Common choices:**
- **Wyoming** — cheapest annual fees (~$60/yr), strong privacy, no state income tax
- **Delaware** — preferred if you plan to raise VC funding or issue equity
- **Your home state** — simplest if you won't fundraise and don't want a registered agent

---

## Stripe Onboarding Checklist

- [ ] FodyLabs LLC incorporated and EIN obtained
- [ ] Business bank account opened
- [ ] Registered address added to legal pages (see above)
- [ ] State of incorporation filled in (see above)
- [ ] Stripe dashboard: create account at https://dashboard.stripe.com/register
- [ ] Stripe Issuing access: apply at https://stripe.com/issuing (waitlist/approval required)
- [ ] Stripe Connect: decide if you need Connect or just direct charges
- [ ] Complete Stripe identity verification for the business owner

---

## Bridge.xyz Onboarding Checklist

- [ ] Apply at https://www.bridge.xyz — contact sales for API access
- [ ] Bridge requires your product to be functional or near-launch (remove/update the
      "coming soon" language in `src/pages/terms.astro` §2 before submitting)
- [ ] Bridge will ask for your Stripe integration details — have Stripe set up first
- [ ] Provide business registration documents (Articles of Organization, EIN letter)
- [ ] Registered address required (same as above)

---

## Nice-to-Have (not blockers for initial onboarding)

- [ ] Add a physical address to the website footer (builds trust for compliance reviewers)
- [ ] Cookie consent banner (required for GDPR if you serve EU users)
- [ ] Explicit arbitration clause jurisdiction (e.g. "AAA rules, seat in [City, State]")
- [ ] OFAC/sanctions screening disclosure for Bridge (already covered in §7 AML section)

---

_Last reviewed: August 26, 2026_
