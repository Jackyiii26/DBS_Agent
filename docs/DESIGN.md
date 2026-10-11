# DBS-aligned concept design

Reference reviewed: [DBS digibank official page](https://www.dbs.com.sg/personal/digital-banking/ibanking-mobile-app), October 2026.

The prototype adopts a DBS-inspired red / white / charcoal visual direction, a direct banking tone, account summaries, a distinct red primary action and a neutral confirmation surface. It is an interpretation for the challenge, not a claim to implement DBS's internal design system pixel-for-pixel.

- Core brand accent: `#e50019` (prototype design choice, not an asserted official token).
- Neutral navigation: `#25272b`; neutral app canvas: `#f4f5f7`.
- Brand red is separate from success green and warning amber.
- Aegis remains the name of the conversational transaction assistant.
- Persistent “DCTA · Concept prototype” and synthetic-funds notices distinguish the mockup from a real DBS service.

Official DBS logo asset obtained from the publicly served [navigation logo](https://www.dbs.com.sg/iwov-resources/media/images/redesign/navbar-logo-dbs.svg), stored as `public/dbs-logo.svg` for reliable local display. The mark belongs to DBS; its inclusion identifies the challenge context and does not indicate endorsement. Other icons are project-native inline SVGs.

Theme overrides are isolated in `public/dbs-theme.css`. Transaction authorization and signing logic are unchanged by this visual revision.
