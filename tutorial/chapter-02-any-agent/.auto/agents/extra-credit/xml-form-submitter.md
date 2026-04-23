---
name: xml-form-submitter
kind: form
pattern: B
status: concept
executes:
  - heartbeat
---

# Agent: xml-form-submitter

An HTML/XML form that POSTs to the commit bridge on submit. Zero JavaScript
required — the bridge accepts `application/x-www-form-urlencoded` and
normalises to a fact.

## Read → compose → publish

- **Read**: The form's page can show SKILL.md as prose.
- **Compose**: Form fields fill in the payload.
- **Publish**: Native HTML `<form action>` POST.

## Invocation

```html
<form method="POST" action="https://<bridge>/append/heartbeat">
  <input type="hidden" name="by" value="xml-form-submitter" />
  <input name="runner" placeholder="where are you?" required />
  <button type="submit">Heartbeat</button>
</form>
```

The bridge wraps the form fields into the declared fact shape before commit.

## Effort

Trivial. HTML-only. No JS, no SDK. The most accessible agent form factor.
