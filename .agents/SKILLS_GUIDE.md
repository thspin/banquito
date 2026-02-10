# AI Agent Skills Usage Guide

This document defines when and why each installed skill should be used. Before starting any task, the agent must review this guide to determine if one or more skills are applicable.

## 🛠️ Skills Directory

### 1. `brainstorming`
**Purpose**: Use before any creative work or when starting a new feature from scratch.
- **When to use**: Creating features, building components, adding functionality, or modifying behavior.
- **Key Outcome**: A validated design/spec document in `docs/plans/`.

### 2. `interface-design`
**Purpose**: Master class in building premium UI/UX for dashboards and tools.
- **When to use**: Designing dashboards, admin panels, SaaS apps, settings pages, or complex data interfaces.
- **Key Outcome**: Crafted, non-generic UI with clear intent, signature elements, and consistent token-based design.

### 3. `systematic-debugging`
**Purpose**: Strict process for identifying root causes before fixing any bug.
- **When to use**: Any test failure, unexpected behavior, production bug, or performance issue.
- **Key Outcome**: Root cause identified and verified with a failing test before implementation.

### 4. `api-design-principles`
**Purpose**: Standards for building scalable REST and GraphQL APIs.
- **When to use**: Designing new endpoints, refactoring existing APIs, reviewing specs, or documenting developer-friendly interfaces.
- **Key Outcome**: Resource-oriented REST design or efficient, type-safe GraphQL schemas.

### 5. `error-handling-patterns`
**Purpose**: building resilient applications that handle failures gracefully.
- **When to use**: Implementing new features, designing APIs, or improving application reliability.
- **Key Outcome**: Robust error propagation, circuit breakers, and meaningful error messages.

### 6. `vercel-react-best-practices`
**Purpose**: High-performance React and Next.js development patterns.
- **When to use**: Writing React components, Next.js pages, data fetching logic, or optimizing bundle size.
- **Key Outcome**: Performance-tuned code (waterfall-free, optimized re-renders, efficient server-side data).

### 7. `vercel-deployment`
**Purpose**: Guidelines for managing and verifying deployments on Vercel.
- **When to use**: After completing any fix or feature, when pushing changes, or when verifying production status.
- **Key Outcome**: Changes pushed to main, deployment verified, and production smoke test completed.

## 📋 Decision Protocol for the Agent

1. **Review User Task**: What is the core objective? (Design, Debug, Build, Refactor).
2. **Match Skills**: Locate matching categories in this guide.
3. **Implicit Activation**: If a task matches (e.g., a bug occurs), the agent should automatically follow the `systematic-debugging` process without being asked.
4. **Multiple Skills**: Use skills in combination (e.g., `brainstorming` to design a feature + `interface-design` for its UI + `vercel-react-best-practices` for implementation).
