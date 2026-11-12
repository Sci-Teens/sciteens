---
title: 'Open Datasets for Student Research: Where to Start'
date: '2020-05-13'
author: John Sutor
description: >-
  Find open environmental, climate, and population data, then check
  documentation, missing values, and reuse terms before starting a project.
tags: []
cover: /content/media/sciteens-finding-great-datasets-249ff579.webp
updated: '2026-11-10'
---

You do not need to collect every measurement yourself to investigate a science question. Public datasets let students study observations that would otherwise require equipment or access to a research site.

Choose a question first, then find data that can answer it. A large download is not automatically a useful project.

## Three sources to explore

### NEON: ecosystems and environmental measurements

The [National Ecological Observatory Network](https://www.neonscience.org/data) provides free, open ecological data. Its portal includes documentation for individual data products and collection methods.

For a first project, choose one data product, one site, and a limited period. For example, investigate how a recorded environmental measurement varies within a month. Check the product's units and quality flags before comparing observations.

NEON's [tutorial library](https://www.neonscience.org/resources/learning-hub/tutorials) includes R and Python resources. Start with a tutorial that uses your data product rather than an unrelated example.

### NASA GISTEMP: surface temperature change

[NASA's GISTEMP page](https://data.giss.nasa.gov/gistemp/) provides temperature-anomaly data and explains the analysis. An anomaly expresses a difference from a reference period, rather than the absolute temperature on a particular day.

A manageable project is to plot the annual series for a selected period. State the reference period and explain what a single annual value represents. Compare a short interval with a longer one to see how the chosen period changes the pattern you describe.

Download the data through NASA's links. Keep a copy and record the access date because the analysis can incorporate later corrections. Follow NASA's data-citation instructions in your report.

### U.S. Census Bureau: population and community estimates

The [American Community Survey five-year data](https://www.census.gov/data/developers/data-sets/acs-5year.html) covers population, housing, and other community characteristics. Its estimates include uncertainty and represent a period, not a single-day census count.

A first project can compare one measure across a few places from the same release. Keep the geography and time period consistent. Include the relevant margin of error rather than ranking places as if every estimate were exact.

The Census API currently requires a key. You can also explore the Bureau's linked data-access options. Do not publish your key in a project notebook.

## Check the data before committing to the project

Download a small sample and read its documentation. Find out what one row represents and what the column names mean.

Record the units, collection period, and geographic coverage. Find the code used for missing values. A missing measurement must not silently become a zero.

Check reuse and citation terms, even when a download is free. Save the dataset's version or identifier where available. A second-hand copy without documentation can make these checks harder.

## Try a small analysis first

1. Open one file in a spreadsheet or notebook.
2. Identify a numeric column and its unit.
3. Count the rows with missing values in that column.
4. Make one plot with a descriptive title and labeled axes.
5. Write what the plot shows and what it cannot establish.

For the NASA example, a plot can describe changes in the annual anomaly series. That plot alone does not test a new explanation for those changes.

For the Census example, an association between community measures does not establish an individual cause. Keep your claim at the level the data supports.

## Keep the work reproducible

Save the original download separately from the edited file. Record filters, exclusions, and calculations in a notebook or a short methods document.

Use the [research-project planner](/resources/research-project-planner.txt) to record decisions as you make them. The [research-questions guide](/article/tldr-science-research-questions) can help you narrow an unclear question.

Once you can explain the data and your method, use the [STEM-paper guide](/article/how-to-write--a-stem-paper) to report the work. Share the original source and enough detail for another student to repeat the analysis.
