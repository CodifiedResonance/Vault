# The Vault — Codified Resonance

Static rebuild of codifiedresonance.com as the Vault alone: the Accords, the Charters, the Blueprints, The Questions (identity) and Send Signal. No CMS, no framework, no runtime dependencies.

## Layout

```
content/
  accords/*.txt        AC-001..003, verbatim from the live site
  charters/*.txt       CH-001..003, verbatim from the live site
  blueprints/*.txt     rewritten blueprints + access state
  sealed/*.txt         plain text of sealed documents   (git-ignored)
  sealed/*.enc.json    the same, encrypted               (committed)
  questions.json       The Questions
src/vault.css, src/vault.js
site.json              base URL, Formspree IDs, Stripe links, images
build.py               content -> dist/ and sandbox/
dist/                  what Cloudflare serves             (git-ignored, rebuilt)
sandbox/index.html     single-file preview                (git-ignored)
```

## Build

```
python3 build.py
```

## Deploy: GitHub -> Cloudflare Pages

1. Push this folder to a GitHub repository.
2. Cloudflare dashboard -> Workers & Pages -> Create -> Pages -> Connect to Git.
3. Build command `python3 build.py`, output directory `dist`, no framework preset.
4. Add `codifiedresonance.com` and `www.codifiedresonance.com` as custom domains, then move DNS from Webflow.
5. `dist/_redirects` carries the old Webflow URLs to their new homes. Check the commented lines at the bottom for the chambers that have moved elsewhere.

## Before going live

- `site.json` -> `formspree`: one form (`moedjbwg`) receives everything. Each submission carries a `type` field: `signal`, `gift` or `access-request`, plus the blueprint title.
- `content/charters/ch-002.txt`: Definitions are left out until the defined terms exist (the live page repeats the Purpose text under that heading).

## Access states

`access:` in a blueprint's header:

- `public`: opens on the page.
- `gifted`: the reader leaves an email (sent to Formspree) and the text opens straight away. The browser remembers it.
- `exchange` (Sacred Exchange): not used at the moment. For a future paid blueprint, set `access: exchange`, put its text in `content/sealed/<slug>.txt`, add its Stripe link under `stripe` in `site.json`, and include the key in the Stripe confirmation message.
- `sealed`: the reader sends a request (to Formspree). If you grant it, mint a key for them:

```
python3 build.py issue build-the-ark
```

That prints a new key like `NPCC-4JUY-TJ3E`, adds it to `keys.local.json` and reseals. Commit `content/sealed/build-the-ark.enc.json`, push, and email the key. Every reader can have their own key; to stop a key working on future builds, delete it from `keys.local.json` and run the build again.

Keyed text is encrypted once (AES-GCM) and that encryption is wrapped separately for each key, so the words never appear in the page source and the plain text is never deployed. Keep `content/sealed/*.txt`, `keys.local.json` and `.seal-state.json` out of git (the `.gitignore` already does). Preview key: `ark-preview`. Remove them before launch and run the build.

## Images

Images live in `src/img/` and are mapped in `site.json` by document id, with a focal point: `"AC-001": {"src": "ac-001.webp", "pos": "30% 55%"}`. They appear on the cards, behind each Accord's opening, and as each Blueprint's hero. Without one, the card draws its own living plate.

## Content format

Header lines (`key: value`), a line of `---`, then:

```
## SECTION LABEL          main section
##~ SECTION LABEL         secondary block (witness note, commentary)
### Sub-heading
- bullet                  — dash item
1. Title :: body          numbered clause        I. :: body
> Term :: definition
! italic line             !! standing line       @ editorial flag
```

Lines inside one paragraph keep their line breaks.
