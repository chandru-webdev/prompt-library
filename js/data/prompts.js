(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});

  D.CATEGORIES = ['Software Architecture', 'Frontend Development', 'Backend Development', 'Full Stack Development', 'JavaScript', 'TypeScript', 'React.js', 'Node.js', 'Express.js', 'Java', 'Spring Boot', 'Python', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Prisma ORM', 'REST APIs', 'GraphQL', 'Authentication', 'Security', 'Testing & QA', 'Debugging', 'Code Review', 'Refactoring', 'Performance Optimization', 'DevOps', 'Docker', 'CI/CD', 'AWS & Cloud', 'Git & GitHub', 'Shopify Development', 'AI & LLM Development', 'Documentation', 'Deployment', 'UI/UX Design', 'Accessibility'];
  D.DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

  // Each mode defines the variables a prompt asks the user to fill in and the shape of the prompt.
  const MODES = {
    build: {
      vars: ['FEATURE', 'TECHNOLOGY', 'PROJECT_CONTEXT', 'REQUIREMENTS', 'EXPECTED_RESULT'],
      head: (r, t) => `Act as a senior ${r} with deep, practical expertise in ${t}.`,
      target: 'Build: [FEATURE]\nTechnology: [TECHNOLOGY]',
      sections: ['Project context:\n[PROJECT_CONTEXT]', 'Requirements:\n[REQUIREMENTS]'],
      process: ['Restate the task in your own words, list assumptions, and ask me about anything critical that is missing before writing code.', 'Inspect the existing code and conventions first; reuse what already exists instead of reinventing it.', 'Propose a short plan, then implement in small, verifiable steps without unrelated edits.', 'Verify the result (tests, manual checks, edge cases) and report honestly what was and was not verified.'],
      out: 'Expected result:\n[EXPECTED_RESULT]',
      example: { FEATURE: 'Password reset flow with emailed one-time links', TECHNOLOGY: 'Node.js, Express, PostgreSQL', PROJECT_CONTEXT: 'Existing REST API with JWT auth and a users table; emails are sent through a queue.', REQUIREMENTS: 'Links expire in 30 minutes, are single-use, and requests are rate limited.', EXPECTED_RESULT: 'Working endpoints, migration, tests and a short summary of design decisions.' }
    },
    plan: {
      vars: ['SYSTEM_OR_PROBLEM', 'TECHNOLOGY', 'PROJECT_CONTEXT', 'CONSTRAINTS', 'EXPECTED_RESULT'],
      head: (r, t) => `Act as a senior ${r} with deep, practical expertise in ${t}.`,
      target: 'Subject: [SYSTEM_OR_PROBLEM]\nTechnology: [TECHNOLOGY]',
      sections: ['Project context:\n[PROJECT_CONTEXT]', 'Constraints (team, budget, deadlines, compliance, existing systems):\n[CONSTRAINTS]'],
      process: ['List the assumptions you are making and the questions whose answers would change your recommendation.', 'Present at least two viable options with concrete trade-offs; do not pick a favorite without justification.', 'Recommend one option, explain why, and state what would make you change your mind.', 'Finish with risks, open questions and a phased next-step plan.'],
      out: 'Expected result:\n[EXPECTED_RESULT]',
      example: { SYSTEM_OR_PROBLEM: 'Order management for a multi-store retailer', TECHNOLOGY: 'Node.js, PostgreSQL, Redis', PROJECT_CONTEXT: 'Team of 4 engineers; a single Rails monolith is hitting scaling limits.', CONSTRAINTS: 'No big-bang rewrite; keep downtime under 5 minutes per release.', EXPECTED_RESULT: 'A written recommendation with a diagram description and a 3-phase roadmap.' }
    },
    debug: {
      vars: ['PROBLEM_DESCRIPTION', 'ERROR_OR_LOGS', 'TECHNOLOGY', 'PROJECT_CONTEXT', 'EXPECTED_RESULT'],
      head: (r, t) => `Act as a senior ${r} who is expert at systematic debugging of ${t}.`,
      target: 'Problem: [PROBLEM_DESCRIPTION]\nTechnology: [TECHNOLOGY]',
      sections: ['Error messages, stack traces and logs:\n[ERROR_OR_LOGS]', 'Project context (versions, recent changes, environment):\n[PROJECT_CONTEXT]'],
      process: ['Summarize the symptom and what is known versus assumed.', 'List the most likely root causes ranked by probability, each with the evidence for and against it.', 'Give the cheapest experiment or log statement that would confirm or eliminate each cause, then investigate in that order.', 'Once the cause is confirmed, propose the smallest correct fix, explain why it works, and suggest a regression test.'],
      out: 'Expected behavior and what a successful fix looks like:\n[EXPECTED_RESULT]',
      example: { PROBLEM_DESCRIPTION: 'Dashboard list re-renders endlessly after login', ERROR_OR_LOGS: 'Warning: Maximum update depth exceeded. at UserList (UserList.jsx:42)', TECHNOLOGY: 'React 18, TypeScript', PROJECT_CONTEXT: 'Started after moving data fetching into a custom hook last week.', EXPECTED_RESULT: 'List renders once per data change and no console warnings appear.' }
    },
    review: {
      vars: ['CODE_TO_REVIEW', 'TECHNOLOGY', 'PROJECT_CONTEXT', 'EXPECTED_RESULT'],
      head: (r, t) => `Act as a meticulous senior ${r} performing a rigorous review focused on ${t}.`,
      target: 'Technology: [TECHNOLOGY]\n\nCode, configuration or system to review:\n[CODE_TO_REVIEW]',
      sections: ['Project context (what it does, who uses it, constraints):\n[PROJECT_CONTEXT]'],
      process: ['Read everything before commenting and note what the code is trying to achieve.', 'Report findings grouped by severity (critical, major, minor, nit); each finding must cite the exact location, explain the impact and show a concrete fix.', 'Do not invent problems: if you are unsure, say so and describe how to verify.', 'End with the top three changes that would improve the code the most and what is already done well.'],
      out: 'Expected result:\n[EXPECTED_RESULT]',
      example: { CODE_TO_REVIEW: '(paste the module, pull-request diff or config here)', TECHNOLOGY: 'Node.js, Express', PROJECT_CONTEXT: 'Public API handling customer data.', EXPECTED_RESULT: 'A prioritized findings list with fixes I can apply directly.' }
    },
    test: {
      vars: ['TARGET_UNDER_TEST', 'TECHNOLOGY', 'PROJECT_CONTEXT', 'REQUIREMENTS', 'EXPECTED_RESULT'],
      head: (r, t) => `Act as a senior ${r} with deep, practical expertise in ${t}.`,
      target: 'Target under test: [TARGET_UNDER_TEST]\nTechnology: [TECHNOLOGY]',
      sections: ['Project context:\n[PROJECT_CONTEXT]', 'Requirements and acceptance criteria:\n[REQUIREMENTS]'],
      process: ['Identify the behaviors, risks and boundaries that matter most, and say what is out of scope.', 'Design the tests first as a list (name, inputs, expected result) covering happy paths, edge cases, failure modes and regressions.', 'Write the tests so they are deterministic, independent and readable; avoid testing implementation details.', 'Explain how to run them, what coverage they give and which gaps remain.'],
      out: 'Expected result:\n[EXPECTED_RESULT]',
      example: { TARGET_UNDER_TEST: 'Checkout total calculation with discounts and tax', TECHNOLOGY: 'Jest, TypeScript', PROJECT_CONTEXT: 'Pure function in src/checkout/total.ts used by the cart API.', REQUIREMENTS: 'Percentage and fixed discounts, tax-inclusive and exclusive pricing, rounding to 2 decimals.', EXPECTED_RESULT: 'A test file plus a list of cases I may have missed.' }
    },
    doc: {
      vars: ['SUBJECT', 'AUDIENCE', 'PROJECT_CONTEXT', 'EXPECTED_RESULT'],
      head: (r, t) => `Act as a senior ${r} and technical writer with deep expertise in ${t}.`,
      target: 'Document subject: [SUBJECT]\nIntended audience: [AUDIENCE]',
      sections: ['Source material and project context (code, notes, decisions):\n[PROJECT_CONTEXT]'],
      process: ['Derive facts only from the material provided; mark anything you had to assume with "ASSUMPTION" and list open questions at the end.', 'Use a clear structure with headings, short paragraphs, runnable examples and tables only where they help.', 'Write for the stated audience: define terms they may not know and skip what they already know.', 'Check the finished document for accuracy, missing steps and consistency of names.'],
      out: 'Expected result and format:\n[EXPECTED_RESULT]',
      example: { SUBJECT: 'Order Service REST API', AUDIENCE: 'Frontend developers new to the team', PROJECT_CONTEXT: '(paste route files, OpenAPI fragments, example requests)', EXPECTED_RESULT: 'Markdown reference with endpoints, request/response examples and error codes.' }
    }
  };

  const FILLER_NOTE = 'Keep the answer concise, use headings and code blocks, and state any assumptions explicitly.';

  // [title, goal, "check|check|check|check", categoryOverride?]
  const GROUPS = [
    { mode: 'plan', role: 'Software Architect', cat: 'Software Architecture', tag: 'engineering', diff: 'Advanced', items: [
      ['Senior Software Engineer Master Prompt', 'Establish a persistent senior-engineer working agreement for an AI assistant working in a real codebase', 'Read existing code and conventions before changing anything|Plan first, then implement in small verified steps|Never make unrelated edits or silent assumptions|Report risks, trade-offs and verification results honestly'],
      ['Software Architect', 'Propose a target architecture for a product from goals and constraints', 'Identify the quality attributes that matter most (scalability, security, cost, time to market)|Compare at least two architecture options with trade-offs|Define components, boundaries, data flow and integration points|List risks and a phased delivery plan'],
      ['System Design', 'Design a scalable system from requirements through capacity estimates to failure handling', 'Clarify functional and non-functional requirements and scale targets|Estimate traffic, storage and bandwidth|Design APIs, data model, caching and scaling strategy|Cover failure modes, observability and cost'],
      ['Microservices Architecture', 'Decide whether and how to split a system into services', 'Define service boundaries by business capability, not by technical layer|Choose synchronous versus asynchronous communication per interaction|Assign data ownership and describe consistency strategy|Plan deployment, tracing, versioning and team ownership'],
      ['Monolithic Architecture', 'Structure a maintainable modular monolith that can evolve', 'Define modules and the dependencies they are allowed to have|Enforce boundaries with folder structure and lint rules|Keep one deployable with clear seams between modules|Describe a path to extract services later if needed'],
      ['Clean Architecture', 'Apply Clean Architecture layers to a concrete feature', 'Separate entities, use cases, interface adapters and frameworks|Point every dependency inward only|Show the interfaces and the composition root that wires them|Provide a testing strategy per layer'],
      ['SOLID Principles', 'Evaluate or design code against the SOLID principles with evidence', 'Name each violation with file and line evidence|Explain the real-world cost in plain terms|Propose the smallest refactor that fixes each issue|Show before and after snippets and warn against over-engineering'],
      ['Design Patterns', 'Select and apply appropriate design patterns to a concrete problem', 'State the problem before naming any pattern|Compare candidate patterns including when not to use them|Implement the chosen pattern idiomatically for the language|Note the complexity the pattern adds'],
      ['Technical Debt Analysis', 'Inventory and prioritize technical debt in a codebase', 'Categorize debt by type (design, test, dependency, docs, infra) and location|Score each item by impact, effort and risk|Recommend a sequenced payoff plan tied to business value|Define metrics that show the debt is shrinking'],
      ['Legacy Code Modernization', 'Plan an incremental, low-risk modernization of a legacy system', 'Map current behavior, hidden dependencies and undocumented rules|Add characterization tests before changing anything|Use strangler-style incremental steps rather than a rewrite|Define rollback points for each step'],
      ['Requirements Analysis', 'Turn a vague idea into clear, testable requirements', 'Extract stakeholders, goals and user stories|Flag ambiguities and ask clarifying questions|Write acceptance criteria in Given/When/Then form|Separate must-have from nice-to-have and list out-of-scope items'],
      ['Technical Specification', 'Write an implementation-ready technical specification', 'State goals and non-goals|Describe the design, APIs and data changes|List edge cases, security, observability and test plan|Include milestones, risks and open questions'],
      ['Feature Planning', 'Break a feature into an ordered, estimable implementation plan', 'Split the work into small shippable tasks|Identify dependencies, risks and unknowns to spike early|Estimate effort per task with a confidence level|Define a clear done criterion for each task'],
      ['Codebase Understanding', 'Quickly build an accurate mental model of an unfamiliar codebase', 'Map entry points, modules and the main data flows|Identify conventions and key abstractions|Highlight risky, confusing or dead areas|Produce a short newcomer guide with a reading order'],
      ['Architecture Decision Records', 'Write an ADR that captures a significant decision for future readers', 'Describe context and the forces at play|List options considered with honest pros and cons|State the decision and the rationale|Record consequences, follow-ups and review date']
    ] },
    { mode: 'build', role: 'Frontend Developer', cat: 'Frontend Development', tag: 'frontend', diff: 'Intermediate', items: [
      ['HTML Development', 'Write semantic, accessible and maintainable HTML', 'Use correct landmarks and a logical heading structure|Prefer native elements over generic divs|Add labels, alt text and useful metadata|Validate the markup and explain any deviations'],
      ['CSS Architecture', 'Organize CSS so it scales without specificity wars', 'Choose a methodology (BEM, cascade layers or utility) and justify it|Define design tokens with custom properties|Keep specificity low and avoid !important|Document the file structure and naming rules'],
      ['JavaScript Development', 'Implement clean, modern JavaScript', 'Use ES6+ idioms and small pure functions|Handle async errors explicitly|Avoid global state, leaks and needless mutation|Add JSDoc to public functions', 'JavaScript'],
      ['TypeScript Development', 'Write strictly typed, self-documenting TypeScript', 'Enable strict compiler options|Model the domain with precise types instead of any|Use generics and discriminated unions where they help|Validate external data at runtime', 'TypeScript'],
      ['React Component Development', 'Build reusable, accessible React components', 'Define the props contract with types|Keep components small and composable|Handle loading, empty and error states|Add accessibility attributes and tests', 'React.js'],
      ['React Hooks', 'Design correct and reusable custom hooks', 'Follow the rules of hooks and keep effects minimal|Manage dependencies and cleanup correctly|Avoid stale closures and redundant state|Provide usage examples and tests', 'React.js'],
      ['State Management', 'Choose and structure state management for a front-end app', 'Classify state as local, shared, URL or server state|Compare Context, Redux, Zustand and query libraries for this case|Normalize and derive data instead of duplicating it|Prevent unnecessary re-renders', 'React.js'],
      ['Next.js Development', 'Build features with the Next.js App Router', 'Choose server versus client components deliberately|Plan data fetching, caching and revalidation|Define routes, layouts, loading and error boundaries|Cover metadata, SEO and deployment considerations', 'React.js'],
      ['Responsive Design', 'Make a UI work well from phones to large desktops', 'Use mobile-first breakpoints driven by content|Use fluid type and spacing with clamp and grid|Check touch target sizes, overflow and orientation|Verify at common widths and describe the results'],
      ['Accessibility', 'Make an interface conform to WCAG 2.2 AA', 'Ensure complete keyboard operation and visible focus|Use ARIA only when native semantics are not enough|Check color contrast and reduced-motion preferences|Verify with a screen reader and list remaining gaps', 'Accessibility'],
      ['Form Validation', 'Implement robust, user-friendly form validation', 'Keep client and server validation rules consistent|Show clear inline errors tied to fields with aria-describedby|Validate on blur and submit without nagging while typing|Prevent double submission and preserve entered data'],
      ['UI Redesign', 'Redesign an existing interface with clear hierarchy and consistency', 'Audit current usability and visual issues first|Define a type, color and spacing system|Improve key flows and every state (empty, loading, error)|Preserve existing behavior and list what changed', 'UI/UX Design'],
      ['Component Refactoring', 'Refactor large components safely without changing behavior', 'Identify the distinct responsibilities to extract|Lock current behavior with tests before moving code|Reduce prop drilling and duplicated logic|Show the work as incremental, reviewable steps', 'Refactoring'],
      ['Frontend Performance', 'Improve Core Web Vitals and perceived speed', 'Measure with Lighthouse and the performance panel before changing anything|Reduce bundle size and render-blocking resources|Optimize images, fonts and hydration|Report before and after metrics', 'Performance Optimization'],
      ['Browser Compatibility', 'Ensure the front end works across the browsers that matter', 'Define the supported browser matrix from real usage data|Check feature support and design fallbacks|Avoid unsupported APIs or polyfill them deliberately|List a manual test matrix']
    ] },
    { mode: 'build', role: 'Backend Developer', cat: 'Backend Development', tag: 'backend', diff: 'Intermediate', items: [
      ['Node.js Development', 'Build a production-ready Node.js service', 'Structure the code by feature module|Validate input and handle errors centrally|Configure through environment variables with validation|Add structured logging and graceful shutdown', 'Node.js'],
      ['Express.js Architecture', 'Design a maintainable Express application', 'Separate routes, controllers, services and repositories|Order middleware deliberately|Handle async errors in one place|Test the HTTP layer with supertest', 'Express.js'],
      ['Java Backend Development', 'Build a clean Java backend service', 'Use a layered package structure|Use DTOs and bean validation at the boundary|Design exceptions and logging consistently|Write unit and integration tests', 'Java'],
      ['Spring Boot Development', 'Implement a feature in Spring Boot following best practice', 'Use controller, service and repository layers|Add validation and a global exception handler|Use profiles and typed configuration properties|Define JPA mappings carefully and add tests', 'Spring Boot'],
      ['Python Backend Development', 'Build a Python API with FastAPI or Django', 'Set up a clear project layout with type hints|Validate with Pydantic or serializers|Decide deliberately between sync and async code|Cover behavior with pytest', 'Python'],
      ['REST API Design', 'Design a consistent, evolvable REST API', 'Choose resource names and HTTP verbs correctly|Define status codes and one error format|Specify pagination, filtering and versioning|Produce an OpenAPI contract', 'REST APIs'],
      ['GraphQL API Development', 'Design and implement a GraphQL API', 'Design the schema and naming carefully|Prevent N+1 queries with batching|Apply authorization and query depth/cost limits|Define a consistent error-handling approach', 'GraphQL'],
      ['Middleware Development', 'Write reusable, well-tested middleware', 'Keep each middleware to a single responsibility|Define ordering and short-circuit behavior|Propagate errors correctly|Add unit tests with mocked request objects', 'Express.js'],
      ['Background Jobs', 'Implement reliable background job processing', 'Choose the queue (BullMQ, Celery, Sidekiq) and justify it|Make jobs idempotent with retries and backoff|Handle dead-letter and poison jobs|Add monitoring and alerting'],
      ['Caching', 'Add effective caching without serving stale surprises', 'Decide what to cache and set TTLs|Define the invalidation strategy|Protect against cache stampedes|Track hit-rate metrics'],
      ['Logging', 'Implement structured, useful logging', 'Use levels and correlation IDs|Never log secrets or personal data|Use one consistent format that can be centralized|Define which events deserve alerts'],
      ['Error Handling', 'Standardize error handling across a service', 'Define an error taxonomy and codes|Use one central handler|Return safe client messages while logging details|Define retry and fallback policy'],
      ['File Upload', 'Implement safe file uploads', 'Validate type, size and content, not just the extension|Store files outside the web root or in object storage|Generate random names and consider malware scanning|Serve files through signed URLs'],
      ['Email Integration', 'Integrate transactional email reliably', 'Abstract the provider behind an interface|Use templates and localization|Send through a queue with retries|Explain SPF, DKIM and DMARC setup'],
      ['Payment Gateway Integration', 'Integrate a payment gateway such as Razorpay or Stripe', 'Create orders on the server and never trust client amounts|Verify webhooks and signatures|Make payment handling idempotent and reconcile regularly|Never handle raw card data yourself']
    ] },
    { mode: 'build', role: 'Database Engineer', cat: 'SQL', tag: 'database', diff: 'Intermediate', items: [
      ['Database Schema Design', 'Design a normalized, evolvable schema from requirements', 'Identify entities and relationships|Choose keys, constraints and data types deliberately|Plan indexes for the known queries|Include a migration plan'],
      ['PostgreSQL', 'Use PostgreSQL features effectively', 'Pick appropriate types (jsonb, enums, arrays) and constraints|Use partial and expression indexes where they pay off|Read EXPLAIN output and manage extensions|Configure connection pooling', 'PostgreSQL'],
      ['MySQL', 'Design and tune a MySQL database', 'Choose engine, charset and collation|Design indexes around real query patterns|Avoid common pitfalls such as implicit conversions|Cover replication and backup basics', 'MySQL'],
      ['MongoDB', 'Model data well in MongoDB', 'Decide between embedding and referencing|Add schema validation|Design indexes for the access patterns|Write efficient aggregation pipelines', 'MongoDB'],
      ['Prisma ORM', 'Model and query with Prisma effectively', 'Write schema.prisma with correct relations|Follow a safe migrations workflow|Use select and include to avoid over-fetching|Use transactions and handle errors', 'Prisma ORM'],
      ['Database Migrations', 'Plan safe, repeatable schema migrations', 'Use backward-compatible, expand-and-contract steps|Avoid long locks and plan zero-downtime changes|Write rollback scripts|Test migrations against production-like data'],
      ['SQL Query Optimization', 'Find and fix slow SQL queries', 'Read EXPLAIN ANALYZE output and find the bottleneck|Rewrite the query and add the right index|Avoid N+1 queries and SELECT *|Measure before and after'],
      ['Indexing', 'Choose the right indexes for a workload', 'Analyze the actual query workload|Decide composite index column order|Consider covering and partial indexes|Account for write and storage cost'],
      ['Database Relationships', 'Model one-to-one, one-to-many and many-to-many relationships correctly', 'Pick the right relationship type for each association|Define foreign keys and cascade rules|Model join tables with their own attributes when needed|Show example queries for common access paths'],
      ['Transactions', 'Use transactions and isolation levels correctly', 'Define transaction boundaries around business invariants|Choose isolation levels and explain anomalies avoided|Handle deadlocks and retries|Avoid long-running transactions'],
      ['Data Validation', 'Validate data at every layer', 'Enforce constraints in the database as the last line of defense|Validate at the API boundary with explicit schemas|Return actionable error messages|Handle legacy invalid data'],
      ['Database Backup', 'Design a backup and restore strategy', 'Define RPO and RTO targets|Combine full, incremental and point-in-time recovery|Encrypt and store backups off-site|Schedule restore drills and verify them'],
      ['Data Migration', 'Plan and execute a data migration between systems', 'Profile and map source to target data|Run idempotent, resumable batches|Reconcile counts and checksums after each run|Plan cutover and rollback'],
      ['Database Performance Audit', 'Audit a database for performance and capacity risks', 'Collect slow-query, lock and cache-hit statistics|Find missing and unused indexes|Review configuration, bloat and connection usage|Produce a ranked remediation list', 'Performance Optimization']
    ] },
    { mode: 'build', role: 'Full Stack Developer', cat: 'Full Stack Development', tag: 'fullstack', diff: 'Advanced', items: [
      ['Build Full Stack Applications', 'Plan and build a complete full-stack application end to end', 'Choose the stack and project structure with reasons|Define the data model, API and UI flows before coding|Build vertically slice by slice with tests|Include setup, environment and deployment instructions'],
      ['End-to-End Feature Implementation', 'Implement one feature across database, API and UI', 'Start from the user story and acceptance criteria|Implement migration, API, UI and validation in that order|Cover loading, error and permission states|Verify with an end-to-end test'],
      ['Frontend-Backend Integration', 'Integrate a front end with a back-end API robustly', 'Define a typed API contract shared by both sides|Centralize the HTTP client, auth and error handling|Handle loading, retries and stale data|Configure CORS and environments correctly'],
      ['Authentication System', 'Implement a secure authentication system', 'Hash passwords with a modern algorithm|Design sessions or tokens with rotation and expiry|Add email verification and password reset safely|Rate limit and log security events', 'Authentication'],
      ['Authorization and RBAC', 'Implement role-based access control', 'Model roles, permissions and resources|Enforce checks on the server for every request|Reflect permissions in the UI without relying on it|Test allow and deny paths', 'Authentication'],
      ['Admin Dashboard', 'Build a secure admin dashboard', 'Design tables with server-side pagination, sorting and filters|Add role-gated actions with audit logging|Provide bulk operations with confirmation|Keep it accessible and responsive'],
      ['ERP System Development', 'Design and build modules of an ERP system', 'Identify modules and shared master data|Model documents, approvals and audit trails|Design for multi-user concurrency and permissions|Plan reporting and data import'],
      ['CRM System Development', 'Design and build a CRM', 'Model contacts, companies, deals and activities|Design pipeline stages and automation|Add search, tagging and import/export|Plan reporting and permissions'],
      ['Inventory Management', 'Build an inventory management system', 'Model items, variants, locations and stock movements|Keep stock changes transactional and auditable|Handle reservations, low-stock alerts and adjustments|Plan barcode and reporting features'],
      ['E-commerce Development', 'Build an e-commerce store', 'Model catalog, cart, orders and customers|Design checkout, tax and shipping flows|Integrate payments securely|Cover SEO, performance and order emails'],
      ['Billing Software', 'Build billing and invoicing software', 'Model invoices, line items, taxes and payments|Ensure sequential numbering and immutable issued invoices|Handle rounding and currency precisely|Generate printable and exportable invoices'],
      ['Reporting and Analytics', 'Build reporting and analytics features', 'Define the metrics and their exact definitions|Design aggregation queries or summary tables|Choose charts that fit the data|Support filters and exports with good performance'],
      ['Real-Time Applications', 'Build real-time features with WebSockets or SSE', 'Choose the transport and justify it|Design the message protocol and authentication|Handle reconnection, ordering and scale-out|Test with multiple clients'],
      ['SaaS Development', 'Plan and build a multi-tenant SaaS product', 'Choose a tenancy model and isolate data|Design plans, billing and entitlements|Add onboarding, audit logs and observability|Plan security, compliance and support tooling']
    ] },
    { mode: 'test', role: 'QA Engineer', cat: 'Testing & QA', tag: 'testing', diff: 'Intermediate', items: [
      ['Test Planning', 'Create a risk-based test plan', 'Define scope, risks and test levels|Choose types, environments and data|Define entry and exit criteria|Assign responsibilities and a schedule'],
      ['Manual Testing', 'Design effective manual test sessions', 'Write charters for exploratory sessions|Cover boundary values and unusual flows|Record observations and evidence|Convert findings into bug reports'],
      ['Functional Testing', 'Verify features against their specifications', 'Derive cases from requirements and acceptance criteria|Use equivalence classes and boundary analysis|Include negative and permission cases|Trace each case to a requirement'],
      ['Integration Testing', 'Test how components work together', 'Identify integration points and contracts|Use realistic test doubles for external services|Control data and environment state|Make tests independent and repeatable'],
      ['End-to-End Testing', 'Design stable end-to-end test suites', 'Select the critical user journeys|Use resilient selectors and explicit waits|Seed and clean data per test|Keep the suite fast enough to run on every change'],
      ['Unit Testing', 'Write focused, maintainable unit tests', 'Test behavior, not implementation|Use the arrange-act-assert structure|Cover edge cases and error paths|Keep tests fast and independent'],
      ['Regression Testing', 'Build a regression safety net', 'Select cases by risk and past defects|Automate stable cases and tag them|Define when each suite runs|Maintain the suite and remove flaky tests'],
      ['API Testing', 'Test HTTP APIs thoroughly', 'Verify status codes, schemas and headers|Cover authentication, authorization and validation|Test pagination, idempotency and error formats|Automate with Postman or code', 'REST APIs'],
      ['Performance Testing', 'Plan and run performance tests', 'Define performance goals and workloads|Choose tools and realistic data|Measure latency percentiles, throughput and resources|Analyze bottlenecks and report'],
      ['Load Testing', 'Design load and stress tests', 'Model realistic user behavior and ramp-up|Find the breaking point and the saturation resource|Include soak tests for leaks|Report capacity and recommendations'],
      ['Security Testing', 'Plan security testing for an application', 'Map the attack surface and threats|Test authentication, access control and input handling|Use automated scanners and manual probing|Report findings with severity and remediation', 'Security'],
      ['Accessibility Testing', 'Test an interface for accessibility', 'Run automated checks and then manual keyboard tests|Test with a screen reader and zoom|Check contrast, focus order and forms|Report issues by WCAG criterion', 'Accessibility'],
      ['Cross-Browser Testing', 'Plan cross-browser verification', 'Define the browser and OS matrix|Prioritize flows and layouts at risk|Use real devices or a cloud service where needed|Track browser-specific defects'],
      ['Mobile Testing', 'Plan testing for mobile web and apps', 'Cover device, OS and screen-size coverage|Test gestures, interruptions and connectivity changes|Check performance and battery|Verify permissions and store requirements'],
      ['Test Case Generation', 'Generate thorough test cases from a feature description', 'Extract behaviors and rules from the description|Produce cases with preconditions, steps and expected results|Include boundary, negative and security cases|Flag ambiguities that need answers'],
      ['Bug Report Writing', 'Write clear, reproducible bug reports', 'State a precise title and the impact|Provide minimal reproduction steps|Compare expected and actual results with evidence|Include environment, frequency and suspected area'],
      ['QA Automation', 'Design a maintainable test automation strategy', 'Apply the test pyramid to choose what to automate|Choose tools and framework structure|Handle test data, flakiness and reporting|Integrate with CI and define ownership'],
      ['Playwright Testing', 'Write reliable Playwright tests', 'Use role-based locators and auto-waiting|Use fixtures and page objects sparingly|Isolate state with storage state and API setup|Configure traces, retries and CI'],
      ['Cypress Testing', 'Write reliable Cypress tests', 'Use data attributes for selectors|Stub network calls and control data|Avoid arbitrary waits and chained dependencies|Configure parallel CI runs'],
      ['Jest Testing', 'Write effective Jest tests', 'Structure describe and it blocks clearly|Use mocks and spies only where necessary|Test async code correctly|Use coverage as a guide, not a goal', 'JavaScript'],
      ['JUnit Testing', 'Write effective JUnit 5 tests', 'Use parameterized tests and clear names|Mock collaborators with Mockito sparingly|Test exceptions and edge cases|Add slice tests for Spring components', 'Java'],
      ['Test Coverage Analysis', 'Analyze test coverage meaningfully', 'Interpret line, branch and mutation metrics|Find risky untested code|Prioritize new tests by risk|Set realistic coverage policies']
    ] },
    { mode: 'debug', role: 'Software Engineer', cat: 'Debugging', tag: 'debugging', diff: 'Intermediate', items: [
      ['Root Cause Analysis', 'Find the true root cause of a defect rather than patching symptoms', 'Build a precise timeline and reproduction|Use the five-whys and eliminate hypotheses with evidence|Separate trigger from underlying cause|Propose a fix and a prevention measure'],
      ['Frontend Debugging', 'Debug a browser-side problem systematically', 'Reproduce and isolate with devtools|Inspect network, console, DOM and state|Bisect recent changes|Confirm the fix across browsers'],
      ['Backend Debugging', 'Debug a server-side problem systematically', 'Reproduce with the exact request and data|Add targeted logging or a debugger|Check configuration, dependencies and environment|Verify the fix with a test'],
      ['Database Debugging', 'Diagnose database errors and wrong results', 'Check queries, data and constraints|Inspect locks, transactions and isolation|Use EXPLAIN and logs|Verify with a minimal dataset'],
      ['API Debugging', 'Diagnose failing API integrations', 'Compare request and response against the contract|Check headers, auth, CORS and content types|Replay requests with curl or Postman|Find whether the fault is client, server or network', 'REST APIs'],
      ['JavaScript Runtime Errors', 'Fix JavaScript runtime exceptions', 'Read the stack trace to the first frame in your code|Check undefined values and async timing|Reproduce with the smallest example|Add guards and tests', 'JavaScript'],
      ['React Rendering Issues', 'Fix React rendering bugs such as loops, stale state and excess renders', 'Identify what triggers each render|Check dependency arrays and referential equality|Look for state derived incorrectly|Confirm with the profiler', 'React.js'],
      ['Spring Boot Errors', 'Fix Spring Boot startup and runtime errors', 'Read the root cause at the bottom of the stack trace|Check bean wiring, configuration and profiles|Verify dependency versions and auto-configuration|Add a test that reproduces it', 'Spring Boot'],
      ['Node.js Errors', 'Fix Node.js crashes and async errors', 'Handle unhandled rejections and uncaught exceptions|Check module resolution and versions|Inspect event-loop blocking|Reproduce with a minimal script', 'Node.js'],
      ['Memory Leaks', 'Find and fix memory leaks', 'Confirm the leak with a growth trend|Take and compare heap snapshots|Find retained references, listeners and caches|Verify the fix under load', 'Performance Optimization'],
      ['Build Errors', 'Fix failing builds and bundling errors', 'Read the first error, not the last|Check toolchain and dependency versions|Clear caches and compare with a clean install|Document the cause'],
      ['Dependency Conflicts', 'Resolve dependency version conflicts', 'Inspect the dependency tree and peer requirements|Choose upgrade, pin or override with reasons|Check lockfile integrity|Run tests after the change'],
      ['Production Incident Investigation', 'Investigate a live production incident', 'Stabilize first: mitigate before diagnosing|Build a timeline from logs, metrics and deploys|Identify cause and contributing factors|Write a blameless post-mortem with actions', 'DevOps']
    ] },
    { mode: 'review', role: 'Security Engineer', cat: 'Security', tag: 'security', diff: 'Advanced', items: [
      ['OWASP Security Audit', 'Audit an application against the OWASP Top 10', 'Walk through each OWASP category against the code|Provide evidence and affected locations|Rate severity and exploitability|Give concrete remediations'],
      ['Authentication Security', 'Review an authentication implementation', 'Check password storage, session handling and MFA options|Review reset, enumeration and lockout flows|Inspect token storage and lifetime|Recommend fixes by priority', 'Authentication'],
      ['JWT Security', 'Review the use of JSON Web Tokens', 'Check algorithm, secret strength and key handling|Verify expiry, audience and issuer validation|Review storage and revocation|Note that decoding is not verification', 'Authentication'],
      ['Password Hashing', 'Implement and review password hashing', 'Use Argon2id, bcrypt or scrypt with sound parameters|Use unique salts and never invent your own scheme|Plan rehashing on login|Enforce sensible password policy', 'Authentication'],
      ['SQL Injection Prevention', 'Find and prevent SQL injection', 'Locate every place user input reaches a query|Replace string concatenation with parameterized queries|Restrict database privileges|Add tests with malicious inputs'],
      ['XSS Prevention', 'Find and prevent cross-site scripting', 'Find unsafe sinks such as innerHTML|Apply context-aware output encoding|Add a strict Content Security Policy|Test stored, reflected and DOM payloads'],
      ['CSRF Protection', 'Protect state-changing requests from CSRF', 'Identify which requests are vulnerable|Use SameSite cookies and anti-CSRF tokens|Verify Origin headers|Test cross-origin scenarios'],
      ['CORS Configuration', 'Configure CORS safely', 'Allow only specific known origins|Understand credentials and preflight behavior|Avoid reflecting arbitrary origins|Test allowed and denied cases'],
      ['Rate Limiting', 'Implement rate limiting and abuse prevention', 'Choose algorithm and keys (IP, user, token)|Set limits per endpoint sensitivity|Return correct headers and 429 responses|Plan for distributed counters'],
      ['Secure File Upload', 'Review file upload security', 'Validate type by content and enforce size limits|Prevent path traversal and executable uploads|Store and serve files safely|Scan for malware where required'],
      ['API Security', 'Review an API for security weaknesses', 'Check authentication and object-level authorization|Validate input and limit response data|Review rate limits, logging and versioning|Map findings to the OWASP API Top 10', 'REST APIs'],
      ['Environment Variable Audit', 'Audit configuration and environment variables', 'Find secrets committed or logged|Check defaults and required variables|Separate environments safely|Recommend validation at startup'],
      ['Dependency Vulnerability Audit', 'Audit third-party dependencies', 'Run audit tools and interpret the results|Assess exploitability, not just severity|Plan upgrades and replacements|Add automated monitoring'],
      ['Secrets Management', 'Design secure secrets management', 'Remove secrets from code and history|Choose a secret store and access model|Rotate secrets and detect leaks|Document emergency revocation']
    ] },
    { mode: 'review', role: 'Senior Software Engineer', cat: 'Code Review', tag: 'quality', diff: 'Intermediate', items: [
      ['Code Review', 'Perform a thorough, constructive code review', 'Check correctness, edge cases and error handling|Review design, readability and tests|Flag security and performance concerns|Separate blocking issues from suggestions'],
      ['Code Refactoring', 'Refactor code to improve structure without changing behavior', 'Identify code smells with evidence|Refactor in small steps backed by tests|Keep public behavior unchanged|Summarize improvements and risks', 'Refactoring'],
      ['Clean Code', 'Improve readability and maintainability', 'Improve naming and function size|Remove duplication and dead code|Make intent obvious without excess comments|Keep changes consistent with project style', 'Refactoring'],
      ['SOLID Review', 'Review code specifically against SOLID principles', 'Check each principle with concrete examples|Rate how serious each violation is|Suggest pragmatic improvements|Avoid dogmatic over-abstraction'],
      ['Duplicate Code Detection', 'Detect and consolidate duplicated code', 'Find exact and near duplicates|Decide when duplication is acceptable|Extract shared abstractions carefully|Prove behavior is unchanged', 'Refactoring'],
      ['Performance Optimization', 'Find real performance bottlenecks and fix them', 'Measure first with a profiler|Fix the biggest bottleneck, not the easiest|Consider algorithms, I/O and caching|Report before and after numbers', 'Performance Optimization'],
      ['Memory Optimization', 'Reduce memory usage', 'Profile allocations and retained objects|Reduce copies and unbounded caches|Stream large data instead of loading it|Verify under realistic load', 'Performance Optimization'],
      ['Maintainability Review', 'Assess long-term maintainability', 'Evaluate structure, coupling and test quality|Identify onboarding obstacles|Rank issues by future cost|Recommend an improvement roadmap'],
      ['Type Safety', 'Strengthen type safety', 'Find any-typed and unchecked boundaries|Add precise types and runtime validation|Make impossible states unrepresentable|Tighten compiler settings gradually', 'TypeScript'],
      ['Technical Debt Reduction', 'Reduce technical debt in a targeted way', 'Pick the debt with the highest interest|Make changes in safe, reviewable steps|Add tests before refactoring|Measure the effect', 'Refactoring']
    ] },
    { mode: 'build', role: 'DevOps Engineer', cat: 'DevOps', tag: 'devops', diff: 'Intermediate', items: [
      ['Git Workflow', 'Define a practical Git branching and review workflow', 'Choose trunk-based or feature-branch flow and justify it|Define commit message and branch naming rules|Set pull-request and review expectations|Describe release tagging and hotfix handling', 'Git & GitHub'],
      ['GitHub Repository Management', 'Set up and manage a GitHub repository professionally', 'Configure branch protection and required checks|Add templates, CODEOWNERS and labels|Set up security features such as Dependabot|Document contribution rules', 'Git & GitHub'],
      ['GitHub Actions', 'Create robust GitHub Actions workflows', 'Build test, lint and build jobs with caching|Use least-privilege tokens and pinned actions|Handle secrets and environments safely|Make workflows fast and reusable', 'CI/CD'],
      ['CI/CD Pipeline', 'Design a continuous integration and delivery pipeline', 'Define stages, gates and artifacts|Automate tests and security checks|Design deployment and rollback automation|Measure pipeline speed and reliability', 'CI/CD'],
      ['Docker Configuration', 'Write production-quality Dockerfiles', 'Use multi-stage builds and small base images|Run as a non-root user|Optimize layer caching and .dockerignore|Add health checks and scan images', 'Docker'],
      ['Docker Compose', 'Compose a multi-service local and staging environment', 'Define services, networks and volumes|Use health checks and dependency ordering|Manage environment files safely|Separate development and production overrides', 'Docker'],
      ['AWS Deployment', 'Deploy an application on AWS', 'Choose services (ECS, Lambda, EC2, RDS, S3) with reasons|Design networking, IAM and security groups with least privilege|Plan scaling, logging and cost|Provide infrastructure-as-code', 'AWS & Cloud'],
      ['Cloud Architecture', 'Design a cloud architecture', 'Map requirements to managed services|Design for availability zones and failure|Address security, cost and operations|Compare providers where relevant', 'AWS & Cloud'],
      ['Vercel Deployment', 'Deploy and configure a project on Vercel', 'Configure build settings and environment variables|Set up preview deployments and domains|Choose runtime and caching options|Handle monitoring and rollbacks', 'Deployment'],
      ['Railway Deployment', 'Deploy services and databases on Railway', 'Configure services, variables and volumes|Connect databases securely|Set up health checks and scaling|Plan migrations and rollbacks', 'Deployment'],
      ['Environment Configuration', 'Manage configuration across environments', 'Separate config from code|Validate configuration at startup|Handle secrets safely|Document every variable'],
      ['Production Deployment Checklist', 'Create a pre-release production checklist', 'Cover code, tests, migrations and configuration|Cover monitoring, alerts and rollback readiness|Cover security, backups and communication|Define post-release verification', 'Deployment'],
      ['Monitoring and Logging', 'Set up monitoring, logging and alerting', 'Define SLIs, SLOs and key dashboards|Centralize structured logs and traces|Create actionable, low-noise alerts|Write runbooks for each alert'],
      ['Rollback Strategy', 'Design safe rollbacks and release strategies', 'Compare blue-green, canary and rolling releases|Handle database migrations during rollback|Automate and rehearse the rollback|Define clear rollback triggers', 'Deployment']
    ] },
    { mode: 'build', role: 'AI Engineer', cat: 'AI & LLM Development', tag: 'ai', diff: 'Advanced', items: [
      ['Claude Code Project Instructions', 'Write a CLAUDE.md that makes an AI agent effective in a project', 'Describe the project, stack and directory layout|List build, test and lint commands|State conventions, boundaries and things never to do|Keep it short, specific and current'],
      ['Cursor Rules', 'Write Cursor rules for consistent AI-generated code', 'Capture stack, style and architecture rules|Scope rules by file type or folder|Include examples of preferred patterns|Review rules regularly and remove stale ones'],
      ['AI Code Generation', 'Get reliable code from an AI assistant', 'Provide context, constraints and examples|Ask for a plan before code|Generate in small testable pieces|Review and test every output'],
      ['AI Code Review', 'Use an AI assistant as a code reviewer', 'Provide the diff with its intent|Ask for severity-ranked, evidence-based findings|Ask it to flag uncertainty rather than guess|Verify claims before acting'],
      ['LLM Integration', 'Integrate an LLM into an application', 'Abstract the provider behind an interface|Handle streaming, timeouts, retries and rate limits|Control cost and log safely|Add evaluation and fallbacks'],
      ['OpenAI API Integration', 'Integrate the OpenAI API', 'Choose models and parameters deliberately|Use structured outputs and function calling|Handle errors, retries and usage limits|Keep keys on the server'],
      ['Claude API Integration', 'Integrate the Claude API', 'Choose the model and manage system prompts|Use tool use and streaming correctly|Apply prompt caching and token budgeting|Handle errors, retries and rate limits'],
      ['Prompt Engineering', 'Design, test and iterate on production prompts', 'State role, task, context and output format clearly|Add examples and constraints|Build a small evaluation set|Version prompts and track regressions'],
      ['RAG Architecture', 'Design a retrieval-augmented generation system', 'Design ingestion, chunking and metadata|Choose embeddings, retrieval and reranking|Construct prompts with citations|Evaluate retrieval and answer quality separately'],
      ['Vector Database', 'Choose and use a vector database', 'Compare pgvector, Pinecone, Qdrant and others for the case|Design schema, indexes and filters|Plan updates, deletion and scaling|Measure recall and latency'],
      ['AI Agent Development', 'Design an AI agent safely', 'Define goals, tools and boundaries|Design the loop, memory and stopping conditions|Add human approval for risky actions|Log, evaluate and limit cost'],
      ['Tool Calling', 'Implement tool or function calling', 'Define precise tool schemas and descriptions|Validate arguments before executing|Handle errors and partial results|Limit permissions of each tool'],
      ['Structured Output', 'Get reliable structured output from an LLM', 'Define a strict JSON schema|Use constrained or native structured output features|Validate and repair or retry on failure|Test with adversarial inputs'],
      ['AI Testing', 'Test an LLM-powered feature', 'Build a golden dataset of representative cases|Define measurable quality criteria|Use deterministic checks plus judged evaluations|Run regression evaluations on each change', 'Testing & QA'],
      ['Hallucination Detection', 'Reduce and detect hallucinations', 'Ground answers in retrieved sources|Require citations and verify them|Add confidence checks and abstention|Monitor and sample production outputs'],
      ['AI Application Security', 'Secure an LLM application', 'Defend against prompt injection and data exfiltration|Restrict tool permissions and sensitive data|Filter and validate outputs|Log, rate limit and red-team regularly', 'Security']
    ] },
    { mode: 'build', role: 'Shopify Developer', cat: 'Shopify Development', tag: 'shopify', diff: 'Intermediate', items: [
      ['Shopify Theme Development', 'Develop a Shopify Online Store 2.0 theme', 'Structure sections, blocks, snippets and templates|Define settings schema for merchant customization|Use JSON templates and dynamic sources|Test in the theme editor and on mobile'],
      ['Liquid Development', 'Write clean, efficient Liquid', 'Use objects, filters and tags correctly|Avoid expensive loops and repeated lookups|Keep logic out of templates where possible|Handle empty and edge cases'],
      ['Shopify GraphQL', 'Use the Shopify GraphQL APIs effectively', 'Write precise queries with only needed fields|Handle pagination and cost limits|Use bulk operations for large data|Handle errors and user errors in mutations'],
      ['Shopify Admin API', 'Integrate with the Shopify Admin API', 'Choose scopes and authentication carefully|Handle rate limits and retries|Use webhooks instead of polling|Keep tokens secure'],
      ['Shopify Store Customization', 'Customize a Shopify store safely', 'Prefer theme settings and sections over hard-coded edits|Use a development theme and version control|Test checkout-adjacent changes carefully|Document every customization'],
      ['Shopify App Development', 'Build a Shopify app', 'Choose the app architecture and extensions|Implement OAuth/session tokens and webhooks|Design the admin UI with Polaris|Cover app review requirements and GDPR webhooks'],
      ['Product Management', 'Manage products, variants and metafields programmatically', 'Model products, variants, options and metafields|Create and update in bulk safely|Handle media, inventory and collections|Validate before and verify after'],
      ['Cart and Checkout', 'Customize the cart and checkout experience', 'Use the Cart API and AJAX correctly|Use checkout extensibility and functions where available|Handle discounts, shipping and errors|Test end to end'],
      ['Shopify Performance', 'Improve Shopify storefront performance', 'Measure with Lighthouse and theme inspector|Optimize images, fonts and third-party apps|Reduce Liquid render cost and JavaScript|Report before and after', 'Performance Optimization'],
      ['Shopify Debugging', 'Debug Shopify theme and app issues', 'Use Theme Check, the theme inspector and browser tools|Inspect Liquid output and objects|Check app conflicts and API responses|Isolate with a clean theme']
    ] },
    { mode: 'doc', role: 'Software Engineer', cat: 'Documentation', tag: 'docs', diff: 'Beginner', items: [
      ['README Generator', 'Write a README that gets a new developer productive in minutes', 'Explain what the project is and why it exists|Provide exact install, configure and run steps|Document scripts, structure and configuration|Include contributing, testing and license information'],
      ['API Documentation', 'Document an API for its consumers', 'Describe each endpoint with parameters and responses|Provide request and response examples|Document authentication, errors and rate limits|Offer an OpenAPI description', 'REST APIs'],
      ['Technical Documentation', 'Write accurate technical documentation', 'Organize by reader task|Explain concepts before procedures|Include diagrams described in text or Mermaid|State versions and prerequisites'],
      ['Database Documentation', 'Document a database schema', 'List tables, columns, keys and constraints|Explain relationships and business meaning|Include an ER diagram in Mermaid|Describe indexes, migrations and data lifecycle', 'SQL'],
      ['Architecture Documentation', 'Document a system architecture', 'Provide context, container and component views|Explain key decisions and trade-offs|Describe data flow, deployment and security|Keep a glossary and links to ADRs', 'Software Architecture'],
      ['User Manuals', 'Write a user manual for non-technical users', 'Organize by user goals|Use plain language and numbered steps|Include troubleshooting and FAQs|Add notes on safety and data'],
      ['Developer Onboarding', 'Write a developer onboarding guide', 'Provide a day-one setup checklist|Explain architecture, conventions and workflows|Point to the first good tasks|List who to ask and how to get help'],
      ['Release Notes', 'Write clear release notes', 'Group changes by user impact|Call out breaking changes and migrations|Credit fixes with references|Keep the tone factual'],
      ['Changelog', 'Maintain a changelog in Keep a Changelog style', 'Use Added, Changed, Deprecated, Removed, Fixed and Security|Group by version with dates|Link to compare views|Write for humans, not commit logs'],
      ['Project Handover', 'Prepare a project handover document', 'Describe the system, owners and access|List how to build, deploy and operate it|Document known issues, risks and debt|Include contacts, credentials process and next steps']
    ] }
  ];

  const stop = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'your']);
  const slug = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  const BASE_DATE = Date.UTC(2026, 10, 1);

  function compose(item, g, mode) {
    const [title, goal, checks] = item;
    const m = MODES[mode];
    const focus = checks.split('|').map((c) => '- ' + c).join('\n');
    const steps = m.process.map((p, i) => `${i + 1}. ${p}`).join('\n');
    return [
      m.head(g.role.toLowerCase(), title),
      `Objective: ${goal}.`,
      m.target,
      m.sections.join('\n\n'),
      `Focus areas for this task:\n${focus}`,
      `Working process:\n${steps}`,
      m.out,
      `Output format: ${FILLER_NOTE}`
    ].join('\n\n');
  }

  const prompts = [];
  const seen = new Set();
  let index = 0;
  GROUPS.forEach((g) => {
    g.items.forEach((item) => {
      const [title, goal, checks, catOverride] = item;
      const id = slug(title);
      if (seen.has(id)) throw new Error('Duplicate prompt id: ' + id);
      seen.add(id);
      const category = catOverride || g.cat;
      const words = title.toLowerCase().split(/[^a-z0-9.+#]+/).filter((w) => w.length > 2 && !stop.has(w));
      const tags = Array.from(new Set([g.tag, category.toLowerCase()].concat(words))).slice(0, 6);
      const m = MODES[g.mode];
      prompts.push({
        id,
        title,
        description: goal + '.',
        category,
        difficulty: g.diff,
        minutes: 5 + (hash(title) % 4) * 5,
        tags,
        content: compose(item, g, g.mode),
        usage: 'Fill in the variables below, copy the prompt, and paste it into your AI coding assistant (Claude, ChatGPT, Cursor, Copilot, OpenCode). Attach or paste real code and files wherever the prompt asks for them, review everything the assistant produces, and run your own tests before merging.',
        example: m.example,
        variables: m.vars,
        custom: false,
        added: BASE_DATE - index * 86400000,
        rank: hash(title + 'rank') % 100
      });
      index++;
    });
  });

  D.QUICK_START = ['senior-software-engineer-master-prompt', 'code-review', 'root-cause-analysis', 'rest-api-design', 'owasp-security-audit', 'readme-generator'];
  D.PROMPTS = prompts;
  D.GROUP_COUNT = GROUPS.length;
})();
