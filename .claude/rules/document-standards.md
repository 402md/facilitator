# Document Standards — 402md Facilitator

## Language

- All documents in **English**
- Technical terms (x402, CCTP, MPP, etc.) are never translated

## Document Types

| Document | Purpose | Audience |
| -------- | ------- | -------- |
| Discovery | Problem, market, competitive landscape, business model | Stakeholders, investors |
| Technical Spec | Architecture, APIs, data models, contracts, workflows | Engineers |
| Plan | Phases, tasks, prerequisites, implementation order | Developer (self) |

## Cross-Document Consistency

- Changes in one document may require updates in others
- Discovery defines the "what" and "why" → Spec defines the "how" → Plan defines the "when"
- If a decision changes (e.g., fee model, chain support), update all three
- API names, data model fields, and chain names must match exactly across docs

## Formatting

- Use Markdown tables for structured data
- Use code blocks with language tags for API examples, schemas, SQL
- Use `> blockquote` for callouts and important notes
- Section numbering must be sequential and match the table of contents
