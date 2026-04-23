---
name: terraform-template
kind: infrastructure-declarative
pattern: C
status: concept
executes:
  - heartbeat
---

# Agent: terraform-template

A Terraform module that doesn't fulfil the skill directly — it **provisions
other agents that will**. E.g. "spin up a VPS with cron, deploy a Cloudflare
Worker, register a webhook." The log receives facts once the provisioned
agents run.

## Read → compose → publish

- **Read**: N/A — Terraform operates on infrastructure, not the skill.
- **Compose**: N/A — provisioned agents do the fact work.
- **Publish**: N/A — pattern C provisions, it doesn't publish.

## Invocation

```hcl
module "heartbeat_fleet" {
  source = "./modules/automate-agent"

  skill       = "heartbeat"
  agents = [
    { name = "cf-worker",   runtime = "cloudflare-worker" },
    { name = "vps-hermes",  runtime = "vps", host = "leo-lab" },
    { name = "convex",      runtime = "convex-function",   deployment = "quaint-hornet-475" },
  ]
  bridge_url  = var.commit_bridge_url
  github_repo = "automate-friday/automate"
}
```

Terraform outputs the set of provisioned agents. As they run on their
respective schedules, each writes to the shared log.

## Effort

Moderate — the module itself is real Terraform work. But once built, every
new environment that wants to participate applies the module and joins the
fleet automatically.

## Why pattern C matters

Terraform / Pulumi / Ansible don't execute skills — they ensure *other
agents exist*. In a production deployment, most of the "20+ runtimes" are
created through a handful of IaC apply commands rather than hand-setup per
host.
