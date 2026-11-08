# U.S. program coverage: November 7, 2026

The goal is broad coverage of U.S. STEM opportunities for high school students. No state is considered complete. There is no known total against which to measure exhaustive coverage.

## November 7 pass

Added 23 curated official sources and published 23 previously missing listings. The curated source inventory increased from 570 to 593 entries. The live opportunity collection increased from 564 to 587 documents. Global totals include international listings. The November 1 total of 544 is historical; 564 was the live baseline at the start of this pass.

All 23 additions were absent from the live inventory and were checked for duplicate program identities. Their 18 distinct source URLs passed the guarded browser fetch. All 23 completed extraction and publication successfully across two targeted runs: 13/13 and 10/10. Each listing was found through the public search API with status=all. Seven closed UNC Asheville sessions were also checked to ensure they do not appear with status=open.

| Provider region | New sources and published listings |
| --------------- | ---------------------------------: |
| Mississippi     |                                  3 |
| Montana         |                                  1 |
| Nebraska        |                                  1 |
| North Carolina  |                                  7 |
| North Dakota    |                                  1 |
| Puerto Rico     |                                  4 |
| Vermont         |                                  2 |
| West Virginia   |                                  4 |

Provider regions describe the host institution, not attendance locations or residency eligibility. The four West Virginia additions include two virtual camps. The Montana program has multiple local sites. The current P-BOX delivery format remains unconfirmed.

## Review corrections

- UNC Asheville's official [overview](https://www.unca.edu/precollege/) confirms that 2026 registration is closed and that the posted dates and prices describe 2026. Its seven new records retain those historical attendance dates, use deadlineStatus=unclear, and explain that 2027 details remain provisional. No exact 2027 opening date was inferred from the expected month. The overview is stored in each source's consulted pages for future refreshes.
- The North Dakota Aerospace Camp notes now distinguish the two separate one-week sessions in June 2027.
- UPR Mayaguez Pre-Ingenieria notes now distinguish the nonresidential western Puerto Rico session from the session for more distant municipalities, including Vieques and Culebra. Unconfirmed housing is identified explicitly.
- UPR Mayaguez P-BOX Oceans has a November 12, 2026 application deadline and a November 21 event date. Review of the official general program page and event flyer added GPA, school eligibility, fee-waiver and contact details. The general page describes virtual activities, while the current event announcement does not confirm delivery format. Location and residential format therefore remain unspecified pending confirmation from the coordinator.
- Unposted dates remain null. Publication does not by itself establish that a program is currently accepting applications.

## Added official sources

| Provider region | Program                                                                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mississippi     | [University of Southern Mississippi Sea Tech Camp](https://www.usm.edu/marine-education-center/art-marine-science-virtual-camp.php)                               |
| Mississippi     | [Mississippi State Senior Engineers Camp](https://www.guestservices.msstate.edu/camps/camp-participants/registration/senior-engineers)                            |
| Mississippi     | [Ole Miss Engineering Summer College](https://www.outreach.olemiss.edu/pre-college/summer-college/engineering.html)                                               |
| North Dakota    | [University of North Dakota International Aerospace Camp](https://aero.und.edu/aerocamp.html)                                                                     |
| Vermont         | [UVM Robotics Design and Testing Camp (Grades 8 and 9)](https://www.uvm.edu/cems/cems-summer-camps)                                                               |
| Vermont         | [UVM Makers II Advanced Design and Prototyping Camp](https://www.uvm.edu/cems/cems-summer-camps)                                                                  |
| West Virginia   | [WVU Engineering Challenge Camps: Engineering What Matters (High School)](https://outreach.statler.wvu.edu/k-12-outreach-events/engineering-challenge-camps)      |
| West Virginia   | [WVU Mining Engineering Experience](https://outreach.statler.wvu.edu/k-12-outreach-events/engineering-challenge-camps/mining-engineering-experience)              |
| West Virginia   | [WVU Mining and Explosives Virtual Camp](https://outreach.statler.wvu.edu/k-12-outreach-events/engineering-challenge-camps)                                       |
| West Virginia   | [WVU Space Mining Virtual Camp](https://outreach.statler.wvu.edu/k-12-outreach-events/engineering-challenge-camps)                                                |
| Puerto Rico     | [UPR Mayaguez Campamento de Pre-Ingenieria](https://www.uprm.edu/engineering/campamentos-de-verano/)                                                              |
| Puerto Rico     | [UPR Mayaguez Pharmaceutical Engineering Summer Camp (PESCa)](https://www.uprm.edu/engineering/campamentos-de-verano/)                                            |
| Nebraska        | [University of Nebraska at Kearney QUASAR Summer Camp](https://unknews.unk.edu/2026/05/21/unk-invites-high-school-students-to-explore-space-science-this-summer/) |
| Montana         | [University of Montana spectrUM High School Explainer Program](https://www.umt.edu/spectrum/education/projects/the-changing-brain.php)                            |
| Puerto Rico     | [UPR Mayaguez Pre-Engineering in a Box (P-BOX) Oceans High School](https://www.uprm.edu/engineering/campamentos-de-verano/)                                       |
| Puerto Rico     | [UPR Mayaguez CMaT Research Experience and Mentoring (REM) for High School Students](https://www.uprm.edu/engineering/campamentos-de-verano/)                     |
| North Carolina  | [UNC Asheville River Ecology and Adventure Pre-College Summer Program](https://www.unca.edu/precollege/river-ecology-pre-college-program/)                        |
| North Carolina  | [UNC Asheville Geology and Adventure Pre-College Summer Program](https://www.unca.edu/precollege/geology-pre-college-program/)                                    |
| North Carolina  | [UNC Asheville Engineering and Mechatronics Pre-College Summer Program](https://www.unca.edu/precollege/engineering/)                                             |
| North Carolina  | [UNC Asheville Meteorology Pre-College Summer Program](https://www.unca.edu/precollege/meteorology/)                                                              |
| North Carolina  | [UNC Asheville Wildlife Wonders: Appalachian Zoology Pre-College Summer Program](https://www.unca.edu/precollege/wildlife-wonders/)                               |
| North Carolina  | [UNC Asheville Game Design and AI Pre-College Summer Program](https://www.unca.edu/precollege/game-design-pre-college-program/)                                   |
| North Carolina  | [UNC Asheville Pre-Med Pre-College Summer Program](https://www.unca.edu/precollege/pre-med-pre-college-program/)                                                  |

## Coverage measurement and remaining work

The live baseline already contained at least one explicitly geocoded U.S. listing in every state and the District of Columbia. That establishes geographic representation, not complete coverage of available programs.

The geocoding service timed out during this pass. All 23 additions still lack at least one structured country/state field, including virtual and unresolved-location records. Provider-region additions above must not be added to the November 1 geocoded state totals. The baseline also contained 253 records without a structured country, including international or nonphysical opportunities. A separate location review remains necessary before using geocoded counts to measure coverage.

The two previously blocked NC State sources, Catalyst and High School Forestry Research, were retried through the guarded fetch and still returned HTTP 403. They remain unresolved leads and are not counted as new publications.

Puerto Rico now has four newly verified sources. This pass does not establish comprehensive coverage for Puerto Rico, Guam, American Samoa, the U.S. Virgin Islands, or the Northern Mariana Islands. The UVI mathematics bridge page reviewed during research still described a 2023 session and was left as a research lead. No current territory listing was inferred from old dates or a general college course catalog.

Continue official university, community college, hospital, laboratory, museum, state education and nonprofit directory reviews in every state. Preserve school-year, virtual, paid, funded and competition opportunities, as well as local residency and school restrictions. No exhaustive nationwide percentage can yet be substantiated.

## Validation

- Guarded official-source fetch: 18/18 source URLs successful; UNC Asheville overview fetched separately for closure review.
- Publication: 23/23 successful; all 23 source records have lastStatus=ok.
- Public search: 23/23 additions found; all seven closed UNC Asheville sessions excluded from open search.
- Targeted source, seeding, schema and scraper tests: 87 passed.
- Full unit suite: 66 files and 900 tests passed.
- Lint passed with existing React hook warnings.
- Build passed, including static generation and sitemap command.

## November 1 historical pass

The goal is broad coverage of U.S. STEM opportunities for high school students. No state is considered complete. There is no known total against which to measure exhaustive coverage.

### This pass

Added 25 curated sources and published 45 previously missing listings: 25 new sources and 20 sources already in the curated list. The global source inventory now contains 570 entries. The global live opportunity collection increased from 499 to 544 documents. Global totals include international listings.

New sources passed the guarded browser fetch. Saved listings were reviewed for program identity, eligibility, and attendance dates, then checked through public search. Unknown dates remain null. Current publication does not establish that applications are open.

### State snapshot

Counts below include only live documents explicitly geocoded to the United States and the named state. Virtual, multiple-location, unresolved-location, and missing-country records are omitted. These are inventory counts, not counts of every program available in a state or every program accepting its residents. A zero does not establish a coverage gap by itself.

| State                | Before this pass | After this pass | New curated sources |
| -------------------- | ---------------: | --------------: | ------------------: |
| Alabama              |                4 |               4 |                   0 |
| Alaska               |                1 |               2 |                   1 |
| Arizona              |                3 |               3 |                   0 |
| Arkansas             |                2 |               9 |                   7 |
| California           |               21 |              21 |                   0 |
| Colorado             |                2 |               3 |                   2 |
| Connecticut          |                2 |               5 |                   3 |
| Delaware             |                2 |               2 |                   1 |
| District of Columbia |                5 |               5 |                   0 |
| Florida              |                9 |               9 |                   0 |
| Georgia              |                6 |               6 |                   0 |
| Hawaii               |                1 |               3 |                   4 |
| Idaho                |                2 |               4 |                   2 |
| Illinois             |               14 |              16 |                   0 |
| Indiana              |                5 |               5 |                   0 |
| Iowa                 |                3 |               3 |                   0 |
| Kansas               |                4 |               4 |                   0 |
| Kentucky             |                4 |               4 |                   0 |
| Louisiana            |                7 |               7 |                   0 |
| Maine                |                5 |               5 |                   0 |
| Maryland             |                3 |               4 |                   0 |
| Massachusetts        |                9 |              12 |                   1 |
| Michigan             |                5 |               5 |                   0 |
| Minnesota            |                7 |               7 |                   0 |
| Mississippi          |                2 |               2 |                   0 |
| Missouri             |                7 |               7 |                   0 |
| Montana              |                3 |               3 |                   0 |
| Nebraska             |                3 |               3 |                   0 |
| Nevada               |                3 |               3 |                   0 |
| New Hampshire        |                1 |               2 |                   1 |
| New Jersey           |                7 |               7 |                   0 |
| New Mexico           |                3 |               3 |                   1 |
| New York             |               10 |              11 |                   0 |
| North Carolina       |                0 |               1 |                   0 |
| North Dakota         |                3 |               3 |                   0 |
| Ohio                 |                4 |               4 |                   0 |
| Oklahoma             |                2 |               3 |                   2 |
| Oregon               |                4 |               4 |                   0 |
| Pennsylvania         |                6 |              11 |                   0 |
| Rhode Island         |                3 |               3 |                   0 |
| South Carolina       |                3 |               3 |                   0 |
| South Dakota         |                3 |               3 |                   0 |
| Tennessee            |                5 |               5 |                   0 |
| Texas                |               26 |              27 |                   0 |
| Utah                 |                7 |               7 |                   0 |
| Vermont              |                3 |               3 |                   0 |
| Virginia             |                6 |               6 |                   0 |
| Washington           |               12 |              12 |                   0 |
| West Virginia        |                2 |               2 |                   0 |
| Wisconsin            |                6 |               6 |                   0 |
| Wyoming              |                2 |               2 |                   0 |

### New official sources

| State         | Program                                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alaska        | [ANSEP Acceleration Academy Statewide Summer](https://www.ansep.net/component/acceleration-academy-summer/)                                                      |
| Hawaii        | [University of Hawaii CTAHR Summer Research Institute](https://cms.ctahr.hawaii.edu/mentoring/)                                                                  |
| Hawaii        | [STEMworks Innovation Internship](https://www.stemworkshawaii.org/internships)                                                                                   |
| Hawaii        | [STEMworks Maui County Agriculture Internships](https://www.stemworkshawaii.org/aginternships)                                                                   |
| Hawaii        | [STEMworks Maui County Healthcare Internships](https://www.stemworkshawaii.org/healthcare-internships)                                                           |
| Idaho         | [Boise State STEM Gems Summer Camp](https://www.boisestate.edu/coen-mssc/community-outreach-recruitment/events-for-prospective-first-year-or-transfer-students/) |
| Idaho         | [Boise State Health Sciences Camp](https://www.boisestate.edu/healthsciences/summer-camp/)                                                                       |
| Colorado      | [CU Boulder EngiNearMe](https://www.colorado.edu/engineering/enginearme)                                                                                         |
| Colorado      | [CU Science Discovery STEM Research Experience](https://www.colorado.edu/sciencediscovery/programs/stem-research-experience)                                     |
| Delaware      | [University of Delaware Neuroscience Pre-College Summer Program](https://www.continuingstudies.udel.edu/neuroscience/)                                           |
| Connecticut   | [Yale Peter E. Schwartz Discovery to Cure High School Internship](https://medicine.yale.edu/obgyn/education/discovery-to-cure/education/)                        |
| Connecticut   | [Yale Pathways Research Internships](https://ssri.sites.yale.edu/)                                                                                               |
| Connecticut   | [UConn Explore Engineering](https://vergnano.institute.uconn.edu/programs-opportunities/k-12-programs/explore-engineering/)                                      |
| Oklahoma      | [OU Health SPARK High School Summer Program](https://discover.ouhsc.edu/Events/Summer-Programs)                                                                  |
| Oklahoma      | [OMRF Sir Alexander Fleming Scholar Program](https://omrf.org/training-outreach/summer-scholars/)                                                                |
| Arkansas      | [Summer@ASMSA Aviation and Aerospace Engineering Camp](https://www.asmsa.org/outreach/summer-at-asmsa/)                                                          |
| Arkansas      | [Summer@ASMSA Computer Science: Build, Play, Code](https://www.asmsa.org/outreach/summer-at-asmsa/)                                                              |
| Arkansas      | [Summer@ASMSA Environmental Science and Biotechnology Camp](https://www.asmsa.org/outreach/summer-at-asmsa/)                                                     |
| Arkansas      | [Summer@ASMSA Physics in Motion: Theme Park Thrills](https://www.asmsa.org/outreach/summer-at-asmsa/)                                                            |
| Arkansas      | [Ozark Natural Science Center Water and Wilderness AEGIS Camp](https://www.onsc.us/aegis)                                                                        |
| Arkansas      | [UA Little Rock Engineering Scholars Program](https://ualr.edu/cstem/summer-programs/)                                                                           |
| Arkansas      | [UA Little Rock AI Hackathon and HealthTech Startup Week](https://ualr.edu/cstem/summer-programs/)                                                               |
| New Hampshire | [Dartmouth Mathland](https://math.dartmouth.edu/~mathland/index.html)                                                                                            |
| Massachusetts | [Harvard Cancer Consortium YES for CURE](https://www.hcc.harvard.edu/training/high-school-college-postbacc/yes-for-cure)                                         |
| New Mexico    | [Sandia QCaMP for Students](https://www.sandia.gov/quantum/qcamp-students/)                                                                                      |

### Follow-up queue

The sources below returned HTTP 403 in the guarded scraper fetch. They remain research leads; fetch failure does not establish that a program is unsuitable. Do not substitute an unofficial URL or infer program dates from a search snippet.

| State or category | Program                                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Oklahoma          | [Oklahoma State CEAT Discovery Days](https://ceat.okstate.edu/stem/summer-camps/ceat-discovery-days)                                                                                                                                                          |
| Oklahoma          | [Oklahoma State Fire Protection Discovery](https://ceat.okstate.edu/stem/summer-camps/fire-protection-discovery)                                                                                                                                              |
| Oklahoma          | [Oklahoma State Engineering Discovery](https://ceat.okstate.edu/stem/summer-camps/engineering-discovery)                                                                                                                                                      |
| Oklahoma          | [Oklahoma State Engineering Discovery for Girls](https://ceat.okstate.edu/stem/summer-camps/engineering-discovery-for-girls)                                                                                                                                  |
| Oklahoma          | [Stephenson Cancer Center Building Research and Investment in Developing the Next Generation (BRIDGE)](https://www.ouhealth.com/stephenson-cancer-center/cancer-research/cancer-research-professional-education-training/high-school-undergraduate-programs/) |
| Oklahoma          | [Stephenson Cancer Center YES Oklahoma](https://www.ouhealth.com/stephenson-cancer-center/cancer-research/cancer-research-professional-education-training/high-school-undergraduate-programs/)                                                                |
| Oklahoma          | [Stephenson Cancer Center CURE Jr. High School Summer Program](https://www.ouhealth.com/stephenson-cancer-center/cancer-research/cancer-research-professional-education-training/high-school-undergraduate-programs/)                                         |
| Competitions      | [MathWorks Math Modeling Challenge](https://m3challenge.siam.org/)                                                                                                                                                                                            |
| North Carolina    | [Catalyst: Building a Strong and Innovative STEM Workforce (NC State)](https://sciencehouse.ncsu.edu/studentprograms/catalyst/)                                                                                                                               |
| North Carolina    | [High School Summer Research Program (NC State Forestry and Environmental Resources)](https://cnr.ncsu.edu/fer/extension-and-outreach/high-school-research/)                                                                                                  |
| Oklahoma          | [OSUIT Emerging and Converging Technology STEM Summer Academy](https://osuit.edu/summer-academy)                                                                                                                                                              |
| Pennsylvania      | [STEM Summer Enrichment Program (Penn State Harrisburg)](https://harrisburg.psu.edu/science-engineering-technology/STEM/summer-STEM-program)                                                                                                                  |
| Competitions      | [USA Computing Olympiad (USACO)](https://usaco.org/)                                                                                                                                                                                                          |

[Creighton Haddix STEM Corridor](https://www.creighton.edu/arts-sciences/future-students/haddix-stem-corridor-program) remains a lead from the preceding pass after HTTP 406.

### Next research passes

1. Review official university, community college, hospital, laboratory, museum, state education, and nonprofit directories in every state. Record separate programs on shared pages using specific source labels.
2. Cover school-year programs, regional competitions, research apprenticeships, virtual programs, and paid camps as well as summer research. Preserve local residency and school restrictions.
3. Check Alaska, Delaware, Hawaii, Idaho, Mississippi, Montana, Nevada, New Hampshire, North Dakota, West Virginia, and Wyoming first, using the snapshot as a prioritization aid rather than an exhaustive count.
4. Review District of Columbia and U.S. territory programs explicitly. This pass does not establish coverage for Puerto Rico, Guam, American Samoa, the U.S. Virgin Islands, or the Northern Mariana Islands.
5. Resolve missing country and state metadata separately before using location totals to measure coverage. Deduplicate against both curated sources and live listings, including renamed programs and redirected URLs.
6. Retry blocked official pages or find an official alternate program page. Keep unresolved leads out of published counts until extraction and search verification succeed.
