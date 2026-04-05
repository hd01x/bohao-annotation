# PremGuard EPR Annotation Guideline
**Version 6.0 — April 2026**

---

## 0. Overview

This guideline explains how to manually annotate LLM-generated responses for the **EPR (Error Propagation Rate)** analysis in the PremGuard project. Your annotations form the gold standard used to validate whether error propagation is a measurable, intrinsic phenomenon in LLM outputs.

Annotation proceeds in **three stages**, ordered to prevent later labels from influencing earlier judgments. **Each stage is completed and locked before the next begins.** Each stage is performed by a **separate group of three trained annotators** to prevent cross-task bias. **No annotator group receives outputs from any stage other than its direct input.**

- **Stage 1 — FC/DR Classification:** Group A assigns type labels (FC or DR) to each pre-segmented atomic claim in the response. FC/DR labels are resolved by majority vote.

- **Stage 2 — Claim Verification:** Group B labels every claim as **Supported** or **Hallucinated** solely against the provided documents $\mathcal{D}_q$. **Group B receives only the consolidated claim set from Stage 1 — no FC/DR type labels, no dependency structure.** Claims are presented in **randomized order** to prevent positional or structural bias.

- **Stage 3 — Dependency Annotation:** Group C marks directed dependency edges for every DR claim. **Group C receives the consolidated claim set with FC/DR labels, but does NOT receive any verification labels from Stage 2.** This ensures dependency judgments are based purely on logical structure.

After Stage 3, **Error-Propagated** and **Error-Intrinsic** sub-labels for hallucinated DR claims are deterministically derived from the consolidated dependency graph and verification labels — these are computed automatically and require no additional annotator judgment.

> **Why this stage order (Classification → Verification → Dependency)?**
>
> In v6.0, verification (Stage 2) is completed and locked before dependency annotation (Stage 3) begins. Group B verifiers never see type labels or dependency structure, eliminating this bias pathway entirely. Dependency annotators in Stage 3 never see verification labels, so the reverse bias (knowing a claim is hallucinated → searching harder for dependency edges) is also blocked.

> ⏱ **Expected time per sample: 10–12 minutes** (all three stages combined).

---

## 1. Claim Types

### FC — Factual Claim
A claim that asserts world knowledge not derivable from other generated claims. It introduces information that must be verified against the provided documents $\mathcal{D}_q$. FC claims form the **leaves** of every dependency tree: every DR claim ultimately traces its derivation back to FC claims anchored in world knowledge.

> Examples: *"Metformin was approved by the FDA in 1995."* | *"Clayton Jacobson directed Brothers' Nest."*

### DR — Derived Claim
A claim whose truth value follows logically or computationally from one or more other generated claims, without introducing new external facts. DR claims are the **internal nodes** of the dependency tree.

A claim qualifies as DR only when **all** of the following hold:

1. **Explicit predecessors exist:** At least one other claim in the response provides the specific facts from which this claim is derived. The predecessors must be identifiable — not merely implied.
2. **No new external facts:** The claim introduces no information beyond what its predecessors state. If the claim adds any world knowledge not present in other generated claims, it is FC.
3. **Derivation is reconstructible:** An annotator can write a brief justification (1–2 sentences) explaining exactly how the claim follows from its predecessors via logical inference, arithmetic, date calculation, comparison, or unit conversion.

> Examples:
> - *"Therefore, Brothers' Nest has the later-born director."* — DR: logical comparison of two birth-year FC claims; predecessors identifiable; no new facts introduced.
> - *"He is currently 46 years old."* — DR: arithmetic (2026 − 1980 = 46) from a birth-year FC claim and a current-year FC claim.
> - *"Nolan is widely regarded as a visionary filmmaker."* — FC: evaluative assertion introducing new information not derivable from other claims.

---

## 2. Type Classification — Decision Tree

```
Q1. Can you identify specific claims already in the response
    that serve as explicit premises for this claim?
    NO  → FC (stop)
    YES ↓

Q2. Can you write a 1–2 sentence justification explaining
    exactly how this claim follows from those premises via
    logical inference, arithmetic, comparison, or similar?
    NO  → FC (stop)
    YES ↓

Q3. Does the claim introduce any new external information
    beyond what the identified premises state?
    YES → FC (stop)
    NO  → DR
```

> **Default-to-FC rule:** When a claim is ambiguous at any step — e.g., it *could* be derived from predecessors but also introduces borderline new information — **always default to FC**. This encodes an asymmetric cost: an FC→DR misclassification silently bypasses external verification (dangerous), whereas a DR→FC misclassification merely triggers a redundant retrieval call (harmless).

---

## 3. Annotation Steps — Stage 1 (FC/DR Classification)

> **Annotator group:** Group A (three annotators). This stage must be **completed and locked** before Stage 2 begins.

### Step 1 — Read the full response and documents
Read the entire LLM response **and** the provided documents $\mathcal{D}_q$ once before labeling any claims.

> **Pre-segmented claims:** The generation prompt constrains the model to produce exactly one atomic claim per sentence in the `<reasoning>` block. You do **not** need to split sentences — each sentence is already an atomic claim. Your task is solely to assign FC or DR labels.

> **Faithfulness over factuality:** In Stage 2 (verification), claims will be judged **solely against $\mathcal{D}_q$**. Do **not** use search engines, Wikipedia, or your own background knowledge. This principle is noted here so you understand the evaluation framework, but your task in Stage 1 is classification, not verification.

### Step 2 — Label each claim (FC or DR)
Use the three-step decision tree in Section 2. Enter `F` for FC or `D` for DR when prompted by the tool. Remember the **default-to-FC rule** for ambiguous cases.

**For DR claims, you must also record a brief derivation justification** (1–2 sentences) explaining how the claim follows from its predecessors. This justification is used for quality control and calibration — it is not shown to other annotator groups.

> After all three annotators in Group A complete Stage 1, FC/DR labels are resolved by majority vote. The resulting labeled claim set is distributed to Group B for Stage 2.

> **Important:** The claim set sent to Group B will **NOT include FC/DR type labels**. Group B receives only claim text and claim IDs.

---

## 4. Annotation Steps — Stage 2 (Claim Verification)

> **Annotator group:** Group B (three annotators, separate from Group A). This stage must be **completed and locked** before Stage 3 begins.
>
> **Blinding:** You will receive the consolidated claim set from Stage 1, but you will **NOT** be shown:
> - FC/DR type labels
> - Any dependency structure
> - Any information about which claims may relate to which
>
> Claims will be presented in **randomized order** (different randomization per annotator) to prevent positional bias.

### Step 4 — Verify each claim
Label **every claim** as **Supported** (`S`) or **Hallucinated** (`H`) **solely against $\mathcal{D}_q$**. Do not use background knowledge, independent logical reasoning, or any information beyond the provided documents as the basis for a verdict.

| Verdict | Code | Meaning |
|---------|------|---------|
| **Supported** | `S` | The claim is clearly entailed by or well-supported by $\mathcal{D}_q$. |
| **Hallucinated** | `H` | The claim contradicts $\mathcal{D}_q$, **or** $\mathcal{D}_q$ does not contain sufficient evidence to support the claim. |

> ⚠️ **Default-to-H rule:** Only assign `S` when $\mathcal{D}_q$ provides clear, positive support for the claim. When in doubt — including when $\mathcal{D}_q$ is silent or only partially relevant — lean toward **H**.

> **Treat every claim identically.** Because you do not know whether a claim is FC or DR, apply the same standard uniformly: "Is this claim supported by the documents?" Do not attempt to infer whether a claim is derived from other claims in the set.

After all Group B annotators complete verification, labels are resolved by majority vote. The verified claim set (with S/H labels) is **NOT** distributed to Group C — Group C receives only the claim set with FC/DR labels from Stage 1.

---

## 5. Annotation Steps — Stage 3 (Dependency Annotation)

> **Annotator group:** Group C (three annotators, separate from Groups A and B). This stage begins only after Stage 2 is completed and locked.
>
> **Blinding:** You will receive the consolidated claim set with **FC/DR type labels** from Stage 1. You will **NOT** receive:
> - Verification labels (Supported/Hallucinated) from Stage 2
> - Any information about which claims passed or failed verification
>
> You are annotating derivation structure purely based on logical relationships, regardless of the truth value of any claim.

### Step 5 — Enter dependency edges (DR claims only)
For each DR claim $c_i$, enter the **comma-separated numbers** of the **direct** predecessor claims $c_j$ from which $c_i$ is logically or computationally derived. The directed edge $c_j \to c_i$ indicates that $c_i$ presupposes $c_j$ as a logical or computational premise.

A valid dependency edge must satisfy **all** of the following criteria:

1. **Logical presupposition:** Removing or changing the content of $c_j$ would, in principle, change the truth value or validity of $c_i$.
2. **Directness:** $c_j$ is a direct (not transitive) premise — the tool computes transitive closure automatically.
3. **Content specificity:** $c_j$ contributes specific factual content (a date, a name, a quantity, a relationship) that $c_i$ uses in its derivation — not merely a shared entity mention.

> **Shared entity ≠ dependency.** Two claims mentioning "Paris" are not automatically dependent. A dependency requires that $c_i$ logically presupposes the specific assertion made by $c_j$.

> Example: if C5 (DR) compares two birth years stated in C2 and C4, enter `2,4`. If C5 merely mentions an entity that also appears in C2 but does not use C2's factual content in its derivation, do **not** enter an edge.

FC claims never have dependencies — skip them when prompted.

**Important:** Annotate edges purely on derivation structure, **regardless of what you believe about whether either claim is correct.** A dependency edge means "this claim logically presupposes that claim" — it does not imply that either claim is accurate.

All edges proposed by any annotator enter a candidate pool. Each edge is retained by majority vote (at least two of three annotators propose it).

---

## 6. Sub-Labels (Automatically Computed)

After all three stages are completed and locked, **Error-Propagated** and **Error-Intrinsic** sub-labels are deterministically derived for each hallucinated DR claim based on the consolidated dependency graph (Stage 3) and verification labels (Stage 2). **No annotator assigns these labels** — they are computed by the tool as follows:

- **Error-Propagated (EP):** The DR claim is Hallucinated, **and** at least one of its transitive predecessors in the dependency graph is also Hallucinated.
- **Error-Intrinsic (EI):** The DR claim is Hallucinated, **but** all of its predecessors (including transitive) are Supported — the derivation itself is incorrect despite correct premises.

These sub-labels require no additional agreement resolution because they follow deterministically from the majority-voted verification labels and the majority-voted dependency graph.

---

## 7. Verdict Summary and EPR Computation

| Claim type | Verdict | Sub-label | In $C_{\mathrm{fail}}^{\mathrm{DR}}$? | In $C_{\mathrm{fail}}^{\mathrm{EP}}$? |
|---|---|---|---|---|
| FC | Supported | — | — | — |
| FC | Hallucinated | — | — | — |
| DR | Supported | — | No | No |
| DR | Hallucinated | Error-Propagated (EP) | **Yes** | **Yes** |
| DR | Hallucinated | Error-Intrinsic (EI) | **Yes** | No |

**EPR** measures the fraction of **DR failures** attributable to dependency-chain propagation:

$$\text{EPR} = \frac{|C_{\mathrm{fail}}^{\mathrm{EP}}|}{|C_{\mathrm{fail}}^{\mathrm{DR}}|}$$

> ⚠️ **EPR denominator is hallucinated DR claims only**, not all failures. FC hallucinations are reported separately (as "Hall.%" in the paper). EPR specifically quantifies how often a corrupted FC premise co-occurs with a downstream derivation failure, providing an upper bound on dependency-chain-induced failures — some co-failures may be coincidental rather than causal. The causal interpretation is validated separately via the intervention experiment in the paper.

### Confidence Intervals

Because EPR is computed over a small denominator (hallucinated DR claims only), point estimates can be unstable. The project lead will report **95% bootstrap confidence intervals** (10,000 resamples at the example level) for all EPR values. Any cross-model or cross-dataset EPR comparison whose confidence intervals overlap will be noted as non-significant.

---

## 8. Worked Examples

### Example A — All correct (baseline)

**Question:** Which film has the director who was born later, Brothers' Nest or The Young and the Guilty?

**LLM Response:**
> *"Brothers' Nest has the director who was born later. Clayton Jacobson directed Brothers' Nest and was born on 26 October 1963. Peter Cotes directed The Young and the Guilty and was born on 19 March 1912."*

**Documents $\mathcal{D}_q$ (excerpt):**
> *"Clayton Jacobson is an Australian actor and director, born 26 October 1963..."*
> *"Peter Cotes (19 March 1912 – 8 June 1998) was a British theatre and film director..."*

| # | Claim | Type | Deps | Verdict |
|---|-------|------|------|---------|
| C1 | Brothers' Nest has the later-born director. | DR | 3,5 | `S` |
| C2 | Clayton Jacobson directed Brothers' Nest. | FC | — | `S` |
| C3 | Clayton Jacobson was born on 26 October 1963. | FC | — | `S` |
| C4 | Peter Cotes directed The Young and the Guilty. | FC | — | `S` |
| C5 | Peter Cotes was born on 19 March 1912. | FC | — | `S` |

$C_{\mathrm{fail}}^{\mathrm{DR}} = \emptyset$; EPR undefined (no DR failures).

---

### Example B — Hallucinated FC but DR claim is correct

**LLM Response:**
> *"Brothers' Nest has the director who was born later. Clayton Jacobson directed Brothers' Nest and was born on 15 April **1971**. Peter Cotes directed The Young and the Guilty and was born on 19 March 1912."*

| # | Claim | Type | Deps | Verdict | Sub-label |
|---|-------|------|------|---------|-----------|
| C1 | Brothers' Nest has the later-born director. | DR | 3,5 | `S` | — |
| C2 | Clayton Jacobson directed Brothers' Nest. | FC | — | `S` | — |
| C3 | Clayton Jacobson was born on 15 April 1971. | FC | — | `H` | — |
| C4 | Peter Cotes directed The Young and the Guilty. | FC | — | `S` | — |
| C5 | Peter Cotes was born on 19 March 1912. | FC | — | `S` | — |

$C_{\mathrm{fail}}^{\mathrm{DR}} = \emptyset$; EPR undefined (no DR failures).

> C3 is Hallucinated ($\mathcal{D}_q$ states 26 Oct 1963, not 15 April 1971). However, C1 — "Brothers' Nest has the later-born director" — is independently correct per $\mathcal{D}_q$ (1963 > 1912), so C1 is **Supported**. The error in C3 did not corrupt C1's truth value.

---

### Example C — Genuine error propagation

**LLM Response:**
> *"Titanic has the later-born director. James Cameron directed Titanic and was born in **1975**. Christopher Nolan directed Interstellar and was born in 1970."*

**Documents $\mathcal{D}_q$ (excerpt):**
> *"James Cameron, born August 16, 1954..."*
> *"Christopher Nolan, born 30 July 1970..."*

| # | Claim | Type | Deps | Verdict | Sub-label |
|---|-------|------|------|---------|-----------|
| C1 | Titanic has the later-born director. | DR | 2,4 | `H` | **EP** |
| C2 | James Cameron was born in 1975. | FC | — | `H` | — |
| C3 | James Cameron directed Titanic. | FC | — | `S` | — |
| C4 | Christopher Nolan was born in 1970. | FC | — | `S` | — |
| C5 | Christopher Nolan directed Interstellar. | FC | — | `S` | — |

$C_{\mathrm{fail}}^{\mathrm{DR}} = \{C1\}$; $C_{\mathrm{fail}}^{\mathrm{EP}} = \{C1\}$; EPR = 1/1 = **100%**.

> C2 hallucinated Cameron's birth year as 1975 (actual per $\mathcal{D}_q$: 1954). C1 claims Titanic's director is later-born, but per $\mathcal{D}_q$ Cameron (1954) is older than Nolan (1970) — so C1 is **Hallucinated**. C1's predecessor C2 is also Hallucinated, so the sub-label is **Error-Propagated (EP)**: the corrupted birth year caused the wrong comparison.

---

### Example D — Error-Intrinsic (wrong derivation, correct predecessors)

**LLM Response:**
> *"Yao Ming was born in 1980. The current year is 2026. Therefore he is currently **44** years old."*

**Documents $\mathcal{D}_q$:**
> *"Yao Ming... born September 12, 1980..."*

| # | Claim | Type | Deps | Verdict | Sub-label |
|---|-------|------|------|---------|-----------|
| C1 | Yao Ming was born in 1980. | FC | — | `S` | — |
| C2 | The current year is 2026. | FC | — | `S` | — |
| C3 | Yao Ming is currently 44 years old. | DR | 1,2 | `H` | **EI** |

$C_{\mathrm{fail}}^{\mathrm{DR}} = \{C3\}$; $C_{\mathrm{fail}}^{\mathrm{EP}} = \emptyset$; EPR = 0/1 = **0%**.

> C3 is Hallucinated: 2026 − 1980 = 46, not 44. Both predecessors (C1, C2) are Supported, so the sub-label is **Error-Intrinsic (EI)** — the arithmetic derivation is wrong despite correct premises.

---

### Example E — Hallucinated FC but DR comparison still holds

**LLM Response:**
> *"Interstellar has the later-born director. Christopher Nolan directed Interstellar and was born in **1975**. James Cameron directed Titanic and was born in 1954."*

**Documents $\mathcal{D}_q$ (excerpt):**
> *"Christopher Nolan, born 30 July 1970..."*
> *"James Cameron, born August 16, 1954..."*

| # | Claim | Type | Deps | Verdict | Sub-label |
|---|-------|------|------|---------|-----------|
| C1 | Interstellar has the later-born director. | DR | 2,4 | `S` | — |
| C2 | Christopher Nolan was born in 1975. | FC | — | `H` | — |
| C3 | Christopher Nolan directed Interstellar. | FC | — | `S` | — |
| C4 | James Cameron was born in 1954. | FC | — | `S` | — |
| C5 | James Cameron directed Titanic. | FC | — | `S` | — |

$C_{\mathrm{fail}}^{\mathrm{DR}} = \emptyset$; EPR undefined.

> C2 is Hallucinated (1975 vs. 1970 per $\mathcal{D}_q$). But C1 — "Interstellar has the later-born director" — is **Supported** because Nolan (1970) is indeed born later than Cameron (1954) per $\mathcal{D}_q$. The wrong birth year did not flip the comparison result, so C1 remains correct and no DR failure occurs.

---

### Example F — Shared entity without dependency (new in v6.0)

**LLM Response:**
> *"Paris is the capital of France. The Eiffel Tower is located in Paris. The Eiffel Tower was completed in 1889."*

| # | Claim | Type | Deps | Verdict |
|---|-------|------|------|---------|
| C1 | Paris is the capital of France. | FC | — | `S` |
| C2 | The Eiffel Tower is located in Paris. | FC | — | `S` |
| C3 | The Eiffel Tower was completed in 1889. | FC | — | `S` |

> C2 mentions "Paris" which also appears in C1, but C2 does **not** logically presuppose C1. Knowing that Paris is the capital of France is irrelevant to whether the Eiffel Tower is located there. C2 is an independent factual assertion — **no dependency edge** between C1 and C2. All three claims are FC.

---

## 9. Edge Cases and Common Mistakes

### 9.1 Default to FC when ambiguous
If you are unsure whether a claim introduces new information or can be derived from predecessors, **mark it FC**. This is the single most important rule — it ensures that ambiguous claims receive external verification rather than being left unchecked.

### 9.2 Hedged claims are still claims
*"X is often considered..."* should be annotated as a claim about X. Treat hedging as part of the phrasing, not a reason to skip.

### 9.4 Comparative conclusions are usually DR
Any claim of the form *"A is more/larger/earlier than B"* derived from two FC claims is **DR**. It introduces no new facts — it follows logically from the stated values.

### 9.5 Age / duration calculations are DR
Even if the arithmetic is trivial, any age, duration, or difference computed from stated values is **DR**. When verifying, compute the correct value from $\mathcal{D}_q$ and compare.

### 9.6 Dependency edges are independent of generation order
If the model generates a conclusion (DR) before its supporting facts (FC), the logical direction is still predecessor → dependent ($c_j \to c_i$). Annotate based on which claims logically presuppose which, not on the order in which they appear in the text.

### 9.7 Verification is always against $\mathcal{D}_q$
When verifying any claim (FC or DR), judge it **solely against $\mathcal{D}_q$**. For DR claims, do not ask "does this follow from the predecessors?" — ask "is this claim correct per the documents?" A DR claim can be Supported even if its predecessors are Hallucinated (the error did not propagate), and Hallucinated even if its predecessors are Supported (intrinsic derivation error).

### 9.8 Faithfulness, not factuality
A claim that is true in the real world but **not supported by $\mathcal{D}_q$** may still be `H` if it makes a specific assertion absent from the documents. Conversely, if $\mathcal{D}_q$ contains wrong information and the model faithfully reproduces it, the claim is `S`.

### 9.9 Skip uninformative phrases
Do not annotate filler phrases like *"In summary,..."* or *"As mentioned above,..."* if they contain no verifiable proposition.

### 9.10 Shared entity is not dependency (new in v6.0)
Two claims that mention the same entity (person, place, drug) are **not** automatically dependent. A dependency edge requires that the dependent claim uses the specific factual content of the predecessor in its derivation — not merely that they share a named entity. See Example F in Section 8.

---

## 10. Inter-Annotator Agreement

Agreement is measured at each annotation stage:

| Stage | Dimension | Metric | Target |
|-------|-----------|--------|--------|
| Stage 1 | FC/DR type labels | Cohen's κ | ≥ 0.70 |
| Stage 2 | Supported/Hallucinated labels | Cohen's κ | ≥ 0.70 |
| Stage 3 | Dependency edges | Pairwise positive-edge F1 | ≥ 0.70 |

> **Note on Stage 3 metric (changed in v6.0):** We report **positive-edge F1** — computed only over claim pairs where at least one annotator proposed an edge — rather than edge-level F1 over all possible claim pairs. Because the vast majority of claim pairs have no dependency, overall edge-level F1 is dominated by true negatives and can appear artificially high. Positive-edge F1 measures agreement on the edges that actually matter for EPR computation.

A subset of **50 samples per dataset** will be annotated by all three annotators within each group (marked `*** KAPPA SAMPLE ***` in the tool). If κ falls below 0.70 on any dimension after the first 50 samples, a calibration session will be scheduled before proceeding.

> ⚠️ Do **NOT** share your annotations for kappa samples with other annotators until instructed.

### FC/DR Boundary Sensitivity
After Stage 1 consolidation, the project lead will report the percentage of claims with unanimous vs. 2:1 FC/DR labels. A worst-case EPR sensitivity check — **flipping all 2:1 labels to the minority class** — will be conducted to confirm that boundary disagreements do not materially affect propagation findings.

### Dependency Edge Robustness
As a complementary robustness check, the project lead will **randomly drop 10% of dependency edges** and recompute EP/EI sub-labels (averaged over 100 bootstrap samples) to verify that the EP/EI distinction is not sensitive to individual edge annotations.

### Statistical Reporting (new in v6.0)
All EPR values will be reported with **95% bootstrap confidence intervals** (10,000 resamples at the example level). Cross-dataset or cross-model comparisons whose confidence intervals overlap will be flagged as non-significant. The project lead will additionally report the effective denominator (number of hallucinated DR claims) for each cell to make the statistical power of each EPR estimate transparent.

### Note on Sub-Labels
Error-Propagated and Error-Intrinsic sub-labels are deterministically derived and require no agreement resolution — they follow automatically from the majority-voted verification labels and the majority-voted dependency graph.

---

## 11. Tool Quick Reference

**Launch command:**
```bash
python script_auto_annotation.py --step annotate \
  --dataset 2wikimhqa --annotator <your_name> --stage <1|2|3>
```

Available datasets: `2wikimhqa`, `musique`, `medhop`, `strategyqa`.

**Key inputs at each prompt:**

### Stage 1 (FC/DR Classification — Group A)

| Prompt | What to enter |
|--------|---------------|
| Type | `F` or `D` (mapped to FC, DR) for each pre-segmented claim |
| DR justification | 1–2 sentence explanation of how the claim follows from predecessors (DR only) |
| Skip sample | Blank line at the type prompt |

### Stage 2 (Claim Verification — Group B)

| Prompt | What to enter |
|--------|---------------|
| Verdict | `S` (Supported) or `H` (Hallucinated) |
| Skip sample | Blank line at the verdict prompt |

> ⚠️ **Stage 2 blinding:** The tool will present claims in randomized order and will NOT display FC/DR type labels or any dependency structure. This is intentional — do not attempt to infer claim types during verification.

### Stage 3 (Dependency Annotation — Group C)

| Prompt | What to enter |
|--------|---------------|
| Dependencies | Comma-separated claim numbers, e.g. `1,3` — or blank for FC claims |
| Skip sample | Blank line at the dependencies prompt |

> ⚠️ **Stage 3 blinding:** The tool will NOT display verification labels (S/H). You will see FC/DR type labels and claim text only. Do not attempt to guess which claims are hallucinated.

> ✅ The tool is **idempotent**: re-running after a crash will skip already-annotated samples. Sub-labels (EP/EI) are computed automatically after all three stages are completed and locked.

---

## 12. Questions and Disagreements

If you are unsure about a claim type or verdict, apply the decision tree and the relevant default rule strictly, then make your best judgment. Note the sample ID and claim text in your personal log — ambiguous cases will be resolved by majority vote after all three annotators in your group complete their independent annotations.

The most common sources of disagreement are:
- **FC vs. DR boundary (Stage 1):** When in doubt, default to **FC**.
- **S vs. H when $\mathcal{D}_q$ is silent (Stage 2):** Default to **H**. Only assign `S` when $\mathcal{D}_q$ provides clear, positive support.
- **Shared entity vs. real dependency (Stage 3):** Only mark an edge when the dependent claim uses the predecessor's specific factual content in its derivation, not merely a shared entity mention (see §9.10).

Systematic disagreements will be addressed in calibration sessions. For other issues, contact the project lead.

---

## Appendix: Summary of Changes from v5.0

| Item | v5.0 (Previous) | v6.0 (Current) | Reason |
|------|-----------------|-----------------|--------|
| Claim segmentation | Annotators manually split sentences into atomic claims | **Pre-segmented**: generation prompt constrains one atomic claim per sentence; annotators classify only | Generation control already enforces atomic claims; manual splitting added noise and required NLI-based deduplication |
| Stage order | Classification → Dependency → Verification | **Classification → Verification → Dependency** | Eliminates risk that verification annotators are biased by knowledge of dependency structure or claim types; see §0 rationale |
| Stage 2 blinding | Verification annotators not shown graph | Verification annotators not shown **FC/DR labels or graph**; claims in **randomized order** | Knowing a claim is "derived" could bias verifiers toward leniency |
| Stage 3 blinding | Dependency annotators not shown verification | Unchanged (explicit confirmation) | Prevents knowledge of hallucination status from biasing edge annotation |
| DR definition | Single-question decision tree | **Three-criterion definition** + **three-step decision tree** requiring explicit predecessors and reconstructible justification | Reduces boundary ambiguity; addresses vague "logically follows" criterion |
| DR justification | Not required | **Mandatory 1–2 sentence justification** for each DR label | Quality control; enables post-hoc review of classification decisions |
| Dependency edge criteria | "Presupposes as premise" | **Three explicit criteria**: logical presupposition, directness, content specificity | Reduces over-annotation of shared-entity edges |
| Shared entity guidance | Not addressed | **New §9.10 and Example F** explicitly distinguishing shared entity mention from dependency | Most frequent source of false-positive dependency edges |
| Edge agreement metric | Pairwise edge-level F1 | **Positive-edge F1** (excluding true-negative pairs) | Previous metric inflated by dominant true negatives |
| Statistical reporting | Point estimates only | **95% bootstrap CIs** + effective denominator reporting | Addresses small-denominator instability in EPR estimates |
| Error taxonomy | 6 fine-grained categories in full table | **Removed from annotation guideline** | Taxonomy simplified in paper; remaining categories do not require annotator-level guidance |