# U.S. science program coverage plan

The goal is complete coverage of discoverable U.S. STEM programs for high school students.
Research, camps, internships, and school-year programs take priority. Competitions are secondary.
The owner confirmed this scope on November 1, 2026.

The owner prefers direct research and official-page review in this conversation for discovery.
The existing GitHub scraper continues to extract details with `gemini-3.1-flash-lite`.
The optional discovery utilities do not replace this manual research process.

## Current execution

Google authentication was restored on November 1, 2026.
The [live audit](live-audit-2026-11-01.json) found 478 active sources and 472 opportunity records.
There were 395 successful source states, 83 failed source states, and six sources without an opportunity record.
These are last-recorded states, not the outcome of a new extraction run.
The local curated file contained 45 URLs absent from the live registry before this import.

Direct research added twelve programs after the initial five additions.
All twelve passed the guarded browser fetch and retained the intended program content.
The [manual batch](manual-batch-2026-11-01.json) preserves official evidence and unresolved findings.
The [import record](manual-import-2026-11-01.json) records seventeen newly created active sources.
Existing source documents were preserved through transaction checks.
An alternate official announcement also resolved the Montana Tech materials camp extraction blocker.
The local curated file now contains 536 entries, including international programs.

The [provider review ledger](provider-reviews.csv) records the providers examined so far.
All provider reviews remain partial. A few reviewed programs cannot establish complete provider coverage.

The targeted [GitHub scraper trial](https://github.com/Sci-Teens/sciteens/actions/runs/41351447055) selected eighteen reviewed sources.
It failed before extraction because Google Cloud workload identity only accepts the `main` branch.
The verified provider condition requires `assertion.ref == 'refs/heads/main'`.
The extraction fix must reach `main` before this workflow can use it.
No identity permissions were changed.

The corrected instructions include the source label, so shared pages identify the intended program.
The workflow accepts optional source slugs. Scheduled runs still refresh all active sources.
No automated opportunity discovery script was used for these eighteen source additions.
Source creation remains separate from successful extraction and publication.

Five additions are now verified in Firestore and through the public opportunity search API.
They are UAB PRISM, Alabama SITE, UAMS MASH, UAMS Pharmacy, and UAMS Summer Under the Microscope.
The [publication check](publication-check-2026-11-01.json) records the exact source IDs and search results.
The pharmacy record needs its stated application-opening date rechecked.
The remaining batch still needs the corrected extraction run.

The [next manual research batch](next-manual-batch.json) records further leads separately from imported sources.
These leads do not count as published programs or completed provider reviews.

The initial full-directory run was cancelled after inspection found that extraction omitted the target label.
The [run record](extraction-run-2026-11-01.json) preserves both runs and the reason for the selected-source rerun.

Live page review also found newer cycle information than cached search results.
UAB PRISM lists a November 16, 2026 opening and January 18, 2027 deadline.
UAMS Pharmacy lists June 7-9, 2027, with registration opening December 1, 2026.
The extraction run must use current official content and preserve unresolved dates.

## Scope and counting rules

Coverage includes all 50 states, Washington, D.C., five inhabited territories, and nationwide or online programs.
Both free and paid programs qualify. Local residency restrictions do not exclude a program.
Programs must offer structured STEM learning, research, or training with explicit high school eligibility.
Undergraduate-only programs, ordinary volunteering, admissions preparation, and permanently closed programs do not qualify.

One program has one identity across annual cycles and alternate URLs.
Separate local branches qualify when they have distinct eligibility, delivery, or application processes.
Multiple dates or sessions alone do not establish separate programs.
A national umbrella listing does not establish coverage of every local branch.
A provider directory is a discovery source, not a student program.

An annual program remains eligible between cycles. A past deadline does not establish that applications are open.
Missing dates, costs, or eligibility remain unknown until an official source establishes them.

## What 100% means

The total number of eligible programs is currently unknown.
A count of listings cannot establish a national coverage percentage.
A state with one listing is not a covered state.

The operational target is complete review of a dated provider inventory and publication of every confirmed eligible program in that inventory.
This inventory must grow as new providers appear. Inventory coverage and national program coverage are different measures.

A complete provider review requires its central youth page, relevant departments, linked local branches, and application pages.
The record must include the reviewed URLs, review date, findings, and unresolved access failures.
An inaccessible provider remains unresolved. A search with no results does not establish that no program exists.

Track these measures separately:

| Measure                    | Definition                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------- |
| Provider review completion | Reviewed providers divided by providers in a named, dated inventory                 |
| Known program publication  | Published eligible programs divided by all confirmed eligible programs              |
| Extraction health          | Successful extractions divided by attempted sources in a run                        |
| Freshness                  | Current listings reviewed within the chosen refresh interval                        |
| Discovery yield            | Newly confirmed programs per provider review or search batch                        |
| Unresolved backlog         | Fetch failures, missing eligibility, identity conflicts, and incomplete extractions |
| External miss rate         | Eligible programs missing from SciTeens in an independent sample                    |

Only a live Firestore and search-index audit can establish publication and extraction health.
The local source file cannot establish those measures.
External samples must include rural areas, tribal communities, smaller providers, and paid programs.
Search saturation supports a completeness estimate but cannot prove that no unknown programs remain.

## Starting evidence

The initial local file has 518 entries and 502 normalized URLs, including international sources.
Sixteen URL groups contain multiple entries. Some groups describe separate programs on one page and require identity review.
These counts are not counts of unique U.S. programs.

Category hints assign one source each to Montana, Nevada, and South Carolina before this expansion.
Alabama, Arkansas, and Wyoming have two each. These are discovery priorities, not verified geographic coverage measurements.
Categories also mix cities, states, subject areas, and countries. There are 133 initially unassigned source entries.

The September scraper incident is historical evidence of extraction gaps, not the current production baseline.
A new authenticated audit must establish current failures before recovery work receives a completion count.

The reproducible [baseline report](baseline.json) preserves the initial source file counts.
The [research batch](first-batch.json) records evidence, exclusions, and transport findings from this task.

## Work sequence

The following schedule is a proposed operating cadence. Completion depends on measured review capacity and extraction reliability.

| Phase       | Work                                                                                                                    | Exit condition                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| First week  | Audit live sources, listings, and index records; review duplicate identities; establish freshness and failure baselines | Every existing source has a recorded publication and extraction state                               |
| Weeks 1-2   | Build the provider inventory from official directories; classify provider types and jurisdictions                       | Every directory entry is imported or has an explicit exclusion reason                               |
| Weeks 2-6   | Review providers and run state search batches; prioritize thin states, local research, camps, and school-year programs  | Every primary discovery cell has a recorded search attempt; provider reviews continue independently |
| Weeks 6-10  | Expand local branches, departments, museums, field stations, community colleges, and tribal providers                   | Each reviewed provider has a branch and department checklist; unresolved cases remain visible       |
| Weeks 10-12 | Compare against independently collected local lists and repeat low-yield searches                                       | Misses produce new provider reviews and source additions; report measured gaps and uncertainty      |
| Ongoing     | Refresh deadlines, revisit providers, accept submissions, and audit coverage quarterly                                  | Coverage and freshness remain dated and reproducible                                                |

Search batches provide leads. Provider reviews establish systematic coverage.
The first pass contains 342 primary discovery cells: 57 jurisdictions or national buckets multiplied by six tracks.
The default U.S. batch contains six queries. Competitions require an explicit track selection.
One completed query does not complete a provider review or certify its jurisdiction.

For the first operating week, prioritize Montana, Nevada, South Carolina, Alabama, Arkansas, and Wyoming.
Also review research and school-year programs in Mississippi, North Dakota, and South Dakota.
Use official provider inventories to avoid limiting work to familiar institutions.
Do not infer a national program count from the query matrix.

## Provider inventory

These official sources establish starting provider frames:

| Provider frame                             | Official source                                                                                                    | Review targets                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Colleges and community colleges            | [NCES IPEDS](https://nces.ed.gov/ipeds)                                                                            | Youth offices, STEM departments, precollege programs, and outreach   |
| Land-grant institutions                    | [NIFA partner directory](https://www.nifa.usda.gov/land-grant-colleges-and-universities-partner-website-directory) | Extension, agricultural research, HBCUs, and tribal institutions     |
| Cancer research centers                    | [NCI center directory](https://www.cancer.gov/research/infrastructure/cancer-centers/find)                         | High school research, laboratory internships, and local training     |
| Science centers and museums                | [ASTC](https://www.astc.org/)                                                                                      | Teen internships, research training, camps, and school-year programs |
| NASA experiences                           | [NASA STEM Gateway](https://www.nasa.gov/stem-content/nasa-stem-gateway/)                                          | Individual experiences with current high school eligibility          |
| Regional science fairs, secondary priority | [Society for Science](https://findafair.societyforscience.org/)                                                    | Local organizers and links to research mentorship programs           |

IPEDS covers institutions participating in federal student aid programs. It does not enumerate every private science camp or nonprofit.
The NIFA directory includes public, historically Black, and tribal land-grant institutions.
ASTC membership is another partial frame. Its members do not represent every museum or community program.
Each frame needs its own dated import and review count.

Additional frames must include national laboratories, hospitals outside NCI, field stations, nature centers, and independent camp operators.
State education departments, libraries, school districts, counselor lists, and local foundations provide further leads.
County extension programs and local branches require separate review when they offer distinct programs.

Each provider record needs a stable ID, official URL, inventory source, jurisdiction, and provider type.
It also needs a review status and next review date.
Each program record needs a provider ID, canonical identity, official URLs, branch relationships, evidence, and review status.
Source status must remain separate from application status and publication status.

## Discovery and publication procedure

1. Select a jurisdiction and track from the discovery queue.
2. Review official provider pages and search results for candidate programs.
3. Record the exact program name, official evidence URL, eligibility, and review date.
4. Compare the candidate with curated and live sources by URL, provider, name, and branch identity.
5. Fetch the official page through the existing guarded scraper transport.
6. Confirm that extracted content describes the intended high school program.
7. Add an eligible source or record the unresolved blocker.
8. Run full extraction through the existing opportunity schema and provenance checks.
9. Verify the Firestore opportunity and its corresponding search-index record.
10. Record publication, extraction, freshness, and remaining review work separately.

The current seeder and scraper handle curated sources. Discovery can also create active sources through its existing verified write path.
Neither source creation nor an HTTP 200 response establishes successful extraction or publication.
Blocked pages need retry or alternate official evidence. They must not become permanent exclusions solely because access fails.

## Optional discovery tools

The existing discovery script now accepts U.S. query filters and bounded batches.
Query listing needs no credentials and performs no search or writes.
These utilities remain optional because the owner chose manual discovery.

```bash
# Inspect all 342 primary queries without network access.
node scripts/discoverOpportunitySources.js --us --query-limit 342 --list-queries

# Inspect Montana's six primary queries.
node scripts/discoverOpportunitySources.js --us --jurisdiction MT --list-queries

# Discover up to two new research candidates, with no Firestore access or writes.
# --offline still calls the model and fetches public pages.
node scripts/discoverOpportunitySources.js --us --jurisdiction MT --track research --max-per-query 2 --offline

# Inspect the next six-query batch across the full U.S. matrix.
node scripts/discoverOpportunitySources.js --us --query-offset 6 --query-limit 6 --list-queries

# Inspect the secondary competition track explicitly.
node scripts/discoverOpportunitySources.js --us --jurisdiction MT --track competitions --list-queries

# Recalculate local source counts, URL groups, and category hints.
node scripts/report-opportunity-coverage.js
```

The GitHub discovery workflow exposes scope, jurisdiction, track, offset, limit, and its existing execute control.
The default scope preserves the existing query set. The U.S. scope defaults to six queries per run.
Offsets apply after jurisdiction and track filters. Invalid filters and empty batches fail before credential loading.
Workflow logs preserve the selected categories, evidence gates, and decisions.
The query queue is a research backlog. It does not update automatically from workflow results.

For authenticated production discovery, omit `--offline` and supply the project through the existing configuration.
The script remains a dry run unless `--execute` is present.
Production runs deduplicate against live sources as well as the curated file.
Local offline trials deduplicate against the curated file only.

## First execution and limits

Official-page research found five source additions ready for full extraction:
Sanford PROMISE Scholars, Oak Ridge NGSI, Southern Mississippi Project SEED, Montana State Spectrum Lab, and USC Aiken Summer Scholars.
All five passed the existing guarded browser fetch and contain relevant high school content.
Some pages describe past or undated cycles. Extraction must preserve that uncertainty.

Two further candidates remain in the research backlog:

- Montana spectrUM High School Explainer has official evidence, but the content extractor omits its high school section.
- Casper College Quantum and Laser Fusion Science Camp has official evidence, but the scraper receives HTTP 403.

The NATURE University Summer Camp is excluded because its specific page requires tribal-college students aged 18 or older.
The umbrella NATURE program also serves younger students, which does not establish eligibility for this camp.

A one-query automated discovery trial reached the Google authentication step and failed with `invalid_grant`.
No grounded search completed in that trial. No production source or opportunity writes occurred.
This initial authentication failure was resolved before the live audit and manual source import recorded in Current execution.

## Maintenance and discovery yield

Keep the current weekly extraction schedule as the starting refresh cadence.
After a live baseline exists, prioritize deadline-bearing sources and listings near their application windows.
Revisit providers at least quarterly and before their typical application season.
Record a review date even when a provider has no currently eligible program.

Initially reserve most review time for research, internships, camps, and school-year programs.
Competitions receive a separate, smaller backlog.
Measure cost per accepted source and per published program before increasing model concurrency or batch size.

After repeated state searches produce few new programs, shift effort toward unreviewed provider pages and local branches.
An independent sample must use providers or local directories outside the discovery pipeline.
Every missed eligible program becomes a tracked correction and a new discovery rule.

Provider submissions and counselor reporting can reveal programs that searches miss.
The product work for a submission flow remains a later phase. No outreach messages were sent during this task.
