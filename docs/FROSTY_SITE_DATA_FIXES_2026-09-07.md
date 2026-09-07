# Frosty site data fixes — 7 September 2026

Correct 23 detailed-panel values supported by the Frosty 1.4.2.5 attachment review and direct capture checks:

- Add ADS movement tier +1 to 6H64 Vertical, Classic Vertical, Stippled Stubby, and Low-Profile Stubby on SVK-8.6, 18.5KS-K, and DB12. The resolved multipliers are 0.42 on SVK-8.6 and 0.60 on the two shotguns.
- Set Flechette health regeneration delay to 7 seconds on the four selectable shotguns. Frosty adds 2 seconds to the 5-second baseline; the site stores the resulting duration.
- Set Factory Angled on LMR27 and DB12, and Full Angled on snipers, to sprint/deploy tier -1. Captures show 133 ms for LMR27, L115, M2010 ESR, and SV-98; 100 ms for DB12 and Mini Scout; and 167 ms for PSR. Interdictor shares the source-supported Full Angled entry but has no capture in this set.

The existing shared sprint/deploy axis applies the corrected tier to both outputs. Attachment IDs, prices, and share-token positions are unchanged. No simulation equation changes are included.

The review also found source-only candidates for weapon-specific QD Grip Pod recoil and Slim Angled moving spread. These remain outside the confirmed panel fixes. Heavy-barrel recovery, flashlight recovery, smooth recoil, VSSM decay, and previously deferred bolt-action muzzle changes still require separate model validation. Capture transcription and identity errors remain reference-data work, not site defects.

Validation: the attachment-effect tests exercise all 23 panel values and deploy-time direction. The release also uses the repository data validator, published-surface validator, and product tests.
