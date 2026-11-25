# Background and goal

Wild yeast populations show extensive genetic variation that tracks the geography of their natural habitats [](https://doi.org/10.1038/nature07670). Latitudinal clines in thermotolerance have been reported in other microbial taxa [](https://doi.org/10.1371/journal.pone.0237201), but the magnitude of variation within _Saccharomyces cerevisiae_ and the degree to which local adaptation drives it remain open questions.[<sup>[a]</sup>](#cmnt1)

Here we measured growth rates across a temperature gradient for 84 wild _S._ _cerevisiae_ isolates collected from sites spanning a 67-degree latitudinal range. We use the resulting data to test whether thermotolerance tracks collection latitude ([Figure 1](#growth-curves)) and to identify candidate strains for follow-up work on cold-tolerance mechanisms ([Figure 2](#tolerance-clusters)).

# The approach

## Strain collection

We assembled a panel of 84 wild isolates from field-collected samples contributed by collaborators on four continents ([Table 1](#strain-list)). Strains were re-streaked to single colonies on YPD agar, genotyped at five marker loci, and frozen as glycerol stocks before assay.

::::::figure{#strain-list type="table" label="Table 1"}
<table class="c45"><tbody><tr class="c27"><td class="c19" colspan="1" rowspan="2"><p>Strain</p></td><td class="c40" colspan="1" rowspan="2"><p>Species</p></td><td class="c15" colspan="1" rowspan="2"><p>Isolation source</p></td><td class="c9" colspan="3" rowspan="1"><p>Thermotolerance phenotype</p></td><td class="c4" colspan="1" rowspan="2"><p>Clade</p></td></tr><tr class="c34"><td class="c19" colspan="1" rowspan="1"><p><code class="language-math math-inline">T_{\mathrm{max}}</code> (°C)</p></td><td class="c24" colspan="1" rowspan="1"><p>Doubling time, 37&nbsp;°C (min)</p></td><td class="c12" colspan="1" rowspan="1"><p>Viability index (V<sub>i</sub>)</p></td></tr><tr class="c38"><td class="c19" colspan="1" rowspan="1"><p>yWS-014</p></td><td class="c40" colspan="1" rowspan="1"><p><em>S. cerevisiae</em></p></td><td class="c15" colspan="1" rowspan="1"><p>Oak bark, Portugal</p></td><td class="c19" colspan="1" rowspan="1"><p>42</p></td><td class="c24" colspan="1" rowspan="1"><p>88</p></td><td class="c12" colspan="1" rowspan="1"><p>0.94&nbsp;±&nbsp;0.02<sup>a</sup></p></td><td class="c4" colspan="1" rowspan="2"><p>A</p></td></tr><tr class="c22"><td class="c19" colspan="1" rowspan="1"><p>yWS-029</p></td><td class="c40" colspan="1" rowspan="1"><p><em>S. cerevisiae</em></p></td><td class="c15" colspan="1" rowspan="1"><p>Vineyard soil, France</p></td><td class="c19" colspan="1" rowspan="1"><p>40</p></td><td class="c24" colspan="1" rowspan="1"><p>102</p></td><td class="c12" colspan="1" rowspan="1"><p>0.87&nbsp;±&nbsp;0.04<sup>b</sup></p></td></tr><tr class="c22"><td class="c19" colspan="1" rowspan="1"><p>yWS-051</p></td><td class="c40" colspan="1" rowspan="1"><p><em>S. paradoxus</em></p></td><td class="c15" colspan="1" rowspan="1"><p>Forest leaf litter, Canada</p></td><td class="c19" colspan="1" rowspan="1"><p>37</p></td><td class="c24" colspan="1" rowspan="1"><p>145</p></td><td class="c12" colspan="1" rowspan="1"><p>0.61&nbsp;±&nbsp;0.06<sup>c</sup></p></td><td class="c4" colspan="1" rowspan="2"><p>B</p></td></tr><tr class="c22"><td class="c19" colspan="1" rowspan="1"><p>yWS-077</p></td><td class="c40" colspan="1" rowspan="1"><p><em>S. kudriavzevii</em></p></td><td class="c15" colspan="1" rowspan="1"><p>Mediterranean oak, Spain</p></td><td class="c19" colspan="1" rowspan="1"><p>35</p></td><td class="c24" colspan="1" rowspan="1"><p>178</p></td><td class="c12" colspan="1" rowspan="1"><p>0.48&nbsp;±&nbsp;0.05<sup>d</sup></p></td></tr></tbody></table>

:::::figcaption
**Table 1.** **Representative wild _Saccharomyces_ strains used in this study.**

Four representative strains from the full 84-strain panel — the complete strain list with accession numbers and isolation conditions is available in the supplementary spreadsheet. $T_{\mathrm{max}}$ is the highest temperature supporting growth to OD<sub>600</sub> ≥ 0.5 within 48 h; across the panel, isolates span 35–42 °C. The viability index is the surviving fraction after a 30 min heat shock at 50 °C relative to the 30 °C control (mean ± s.d., _n_ = 6); cells were recovered on YPD with 5% CO<sub>2</sub> and counted as CFU × 10<sup>6</sup> mL<sup>−1</sup> after plating 100 μL per plate. Superscript letters on the viability index denote statistical groups — values that share a letter don't differ significantly (Tukey's HSD, _p_ > 0.05). yWS-014 is the reference strain, with an assembled genome deposited in GenBank; all stocks are held at −80 °C.
:::::

::::::

## Growth assay

We measured growth at nine temperatures (12, 16, 20, 24, 28, 32, 37, 40, and 42 °C) in biological triplicate. Strains were inoculated to a starting OD₆₀₀ of 0.01 in 200 µL of YPD in 96-well plates, sealed with breathable film, and read on a temperature- controlled plate reader every 15 min for 48 h.

::::::figure{#growth-curves align="center" type="image" label="Figure 1"}

:::::image{src="raven-media://media-1" width="100%" alt="Nine growth curves arranged in a grid, one per temperature condition, with all 84 strains overlaid on each panel. Tropical strains in warm colors, boreal strains in cool colors."}
:::::

:::::figcaption
**Figure 1.** **Growth rate varies with temperature across all 84 wild isolates.**

Each panel shows OD₆₀₀ over time for a single temperature condition (12–42 °C). Strains are colored by the latitude of their collection site, from tropical (red) to boreal (blue). At intermediate temperatures (24–32 °C) all strains grow comparably, but the temperature extremes pull the strains apart by origin.
:::::

::::::

## Statistical analysis

We extracted maximum specific growth rate ($\mu_{\text{max}}$) from each growth curve as the maximum slope of the log-transformed OD trace over a sliding two-hour window:

$$

\mu_{\text{max}} = \frac{\ln(\text{OD}_{t_2}) - \ln(\text{OD}_{t_1})}{t_2 - t_1}

$$

We normalized counts of CFUs as $\log(1 + x)$ before correlation analysis to stabilize variance across the dynamic range, and computed Pearson correlations between $\mu_{\text{max}}$ and collection latitude using `pearsonr` from SciPy.

The analysis pipeline is implemented in R. The core summary step looks like this:

```r
library(tidyverse)
library(broom)

growth_data |>
  group_by(strain_id, temperature) |>
  summarize(
    mu_max = max(log(od) - log(lag(od))) / (time - lag(time)),
    .groups = "drop"
  ) |>
  filter(!is.na(mu_max))
```

These functions are all included in the arcadia-microscopy-tools GitHub repo [](https://github.com/Arcadia-Science/arcadia-microscopy-tools). We used Arcadia-pycolor (v12) [](https://github.com/Arcadia-Science/arcadia-pycolor) to style our visualizations prior to manual adjustment in Adobe Illustrator.

# The results

Tropical strains grew significantly faster than boreal strains at 42 °C, while boreal strains outperformed tropical strains at 12 °C ([Figure 1](#growth-curves), A–C). The intermediate-temperature panels show no significant separation by origin.

A UMAP embedding of per-strain growth profiles cleanly separates the strains by climate zone ([Figure 2](#tolerance-clusters)). The boreal cluster is the most distinct; tropical and Mediterranean strains overlap substantially in their intermediate-temperature growth.

::::::figure{#tolerance-clusters align="center" type="iframe" label="Figure 2"}

:::::iframe{src="raven-media://media-2" width="100%" aspect-ratio="13/7" alt="An interactive UMAP scatter plot of all 84 strains, colored by collection latitude. Hover over points to see strain ID, origin, and per-temperature growth rates."}
:::::

:::::figcaption
**Figure 2.** **Interactive cluster map of all 84 strains.**

Hover over a point to see the strain’s collection coordinates and per-temperature growth profile. Use the legend toggles to filter by climate zone.
:::::

::::::

::::::div{.info-box}
**Data and code** for this pub, including the full strain panel, raw OD₆₀₀ time courses, and the analysis pipeline, are available in [this GitHub repo](https://github.com/Arcadia-Science/2026-yeast-thermotolerance) (DOI: [10.5281/zenodo.99999999](https://doi.org/10.5281/zenodo.99999999)).
::::::

## Bonus data: A single outlier strain shows unusual cold tolerance

::::::details

:::::summary
While not part of the main pattern, one strain (SC-B-021) grew faster at 12 °C than any other isolate.
:::::

We isolated SC-B-021 from a Norwegian permafrost sample. Its growth profile is qualitatively different from other boreal strains — it shows a sharp drop in growth rate above 25 °C and a peak at 16 °C, the lowest temperature we tested ([Figure 3](#outlier-strain)).

:::::figure{#outlier-strain align="center" type="image" label="Figure 3"}

::::image{src="raven-media://media-3" width="70%" alt="A growth curve panel showing SC-B-021’s temperature response, with a sharp peak at 16 °C and steep drops on either side."}
::::

::::figcaption
**Figure 3.** **SC-B-021 has an unusual cold-shifted thermotolerance profile.**

Single-strain growth curves across all nine temperature conditions. Note the sharp peak at 16 °C — every other strain peaks at 28–32 °C.
::::

:::::

We’re following up on this strain in a separate study, where we plan to identify the genetic basis of the cold-shifted optimum and test whether it transfers cleanly to a lab strain.

::::::

# Next steps

::::::figure{#assay-walkthrough align="right" type="audio" label="Figure 4"}

:::::audio{src="raven-media://media-4" alt="A four-minute audio walkthrough of the temperature-gradient growth assay."}
:::::

:::::figcaption
**Figure 4.** **Audio walkthrough of the growth assay.**

A four-minute description of how strains are arrayed, inoculated, and read out across the temperature gradient.
:::::

::::::

We're extending the panel with isolates from arctic and equatorial deep-sea hydrothermal sources, and adapting the assay to a continuous-culture format for finer-grained growth-rate measurements. We have also released the assay protocol as an audio walkthrough ([Figure 4](#assay-walkthrough)) and a time-lapse demonstration video ([Video 1](#colony-timelapse)).

::::::figure{#colony-timelapse align="center" type="video" label="Video 1"}

:::::video{src="raven-media://media-5" width="70%" alt="Time-lapse video of a yeast colony forming on YPD agar over 36 hours at 30 °C." autoplay="true" loop="true"}
:::::

:::::figcaption
**Video 1.** **Time-lapse of colony formation at 30** **°C.**

A representative tropical strain (SC-T-042) imaged every 15 minutes over 36 hours. Total playback duration: 18 seconds.
:::::

::::::

The full strain panel and raw growth data are bundled in the supplementary spreadsheet linked here:

::::::figure{type="file"}

:::::file{src="https://drive.google.com/file/d/1K538DEYFyeyyhIAQ2Vcj-kg86UkNYyqo/view?usp=sharing" filename="thermotolerance-supplementary-data.xlsx"}
:::::

::::::

If you work with wild yeast and would be willing to share isolates from underrepresented climates, we’d love to hear from you.

::::::only{platform="web"}

:::::figure{align="center" type="iframe"}

::::iframe{src="https://successteam.typeform.com/to/AR5B4r6L" width="100%" height="550px"}
::::

:::::

::::::

::::::div{.bordered data-internal="acknowledgments"}
#### Acknowledgments

We thank the strain collectors who contributed isolates from field sites across four continents, and the Arcadia growth-assay team for instrument time. Thanks also to the Arcadia software team for the analysis tooling we built this study on.
::::::

::::::div{.bordered data-internal="competing interests"}
#### Competing interests

The authors declare no competing interests, with the following exceptions: Dr. Jane Doe serves on the scientific advisory board of YeastTech Solutions, and Dr. John Smith holds stock options in FermentCo, a company that produces the plate readers used in this study. All other authors declare no conflict of interest.

:::::: [<sup>[b]</sup>](#cmnt2)

:::::bibtex
@Misc{arcadia-microscopy-tools,

  title = {arcadia-microscopy-tools},

  author = {Arcadia Science},

  year = {2026},

  url = {https://github.com/Arcadia-Science/arcadia-microscopy-tools}

}

@Misc{arcadia-pycolor,

  title = {arcadia-pycolor},

  author = {Arcadia Science},

  year = {2024},

  url = {https://github.com/Arcadia-Science/arcadia-pycolor}

}
:::::

[[a]](#cmnt_ref1)Test comment

[[b]](#cmnt_ref2)Something is wrong when both are here — this is how we've added acknowledgments for Stacks pubs, but we haven't had a case with both ack + competing interests in new pubs, only migrated ones

::::::

