# Reviewed dependency exceptions — 2026-09-04

## `image-size@2.0.2`

- Advisories: `GHSA-w3rx-r6r6-pgpr` and `GHSA-5p2g-fcmc-qvqq` (High).
- Dependency path: development-only `vinext@0.0.50 > image-size@2.0.2`.
- Affected behavior: infinite loops while parsing untrusted ICNS, JXL, or HEIF image data.
- Production exposure: none identified. The application does not import `image-size`, does not ship ICNS/JXL/HEIF assets, and does not route runtime customer uploads through vinext's build tooling.
- Patch blocker: the advisory names `image-size@2.0.3`, but that version is not published. Every current stable vinext release retains `2.0.2`; the line that removes it is a breaking `1.0.0-beta` framework upgrade.
- Temporary disposition: retain the stable framework and ignore only these two advisory IDs in the release audit. Remove the exception when a patched stable dependency path is available.
