# Automate Friday — Framework

> The declarative DSL, runtime, and reference implementations for the Automate Friday agent coordination protocol.

**License:** FSL-1.1-Apache-2.0 (Functional Source License, converts to Apache 2.0 on 2028-04-19)
**Author:** Jacob Haugen
**Status:** Scaffolding. DSL and runtime implementations not yet built.

---

## What this repo is

This is the framework layer — the ergonomic DSL, the runtime that compiles DSL declarations into fact-log operations, and reference implementations of common agents (Claude-backed, script-backed, human interface).

If you want the underlying protocol specification and the minimal reference prototypes, see the companion repository:

**Protocol:** [automate-friday/protocol](https://github.com/automate-friday/protocol) — MIT-licensed. White paper, fact schemas, minimal reference prototypes.

## Why FSL and not MIT

The protocol is MIT — free for all uses forever, because standards benefit from maximum adoption.

The framework is FSL — free for personal, internal, and non-competing commercial use; prohibits hosted SaaS offerings that compete with the author's own hosted service during a 2-year protection window, after which the entire framework converts automatically to Apache 2.0.

Same approach as HashiCorp's Terraform (BSL), Sentry, and similar indie-founder-friendly licensing.

## Planned structure

- `dsl/` — declarative composition (`auto.skill`, `auto.agent`, `auto.engine`, `auto.workflow`, `auto.sequential`, `auto.parallel`)
- `runtime/` — log transport adapters, scheduler, subscription manager
- `examples/` — YouTube→Discord, Etsy management, incident response (canonical demos)
- `docs/` — architecture notes, migration guides

## Status

Nothing is implemented yet. This repository exists to reserve the namespace, establish the license, and provide a target for incoming work. Follow the [protocol repo](https://github.com/automate-friday/protocol) for current state.