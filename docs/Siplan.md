# Spending Insights: Extension & Synchronization Plan

## **Overview**
Alignment of the Spending Insights module with institutional standards and global temporal synchronization. This plan transitions the module from a category-only drill-down tool to a comprehensive behavioral auditing suite.

---

## **Phase 6: Structural Extension & Mode Switching**
**Goal:** Implement temporal leaf nodes and a "Global Leaderboard" view.

*   **Temporal Level 3 (Logic):**
    *   Update `hierarchyService.ts` to support a `leafType` parameter: `MERCHANT` (default) or `MONTH`.
    *   In `MONTH` mode, Level 3 nodes will cluster transactions by their month string (e.g., *Fixed > Rent > January*) rather than merchant names.
*   **Mode Toggle (Structure vs. Pulse):**
    *   **Structure Mode:** The current hierarchical Category > Subcategory > Leaf treemap.
    *   **Pulse Mode:** A flat, non-hierarchical treemap displaying the **Top 10 Merchants** globally for the selected time period.
*   **UI Behavior:** Pulse mode will completely replace the hierarchical treemap view when active.

## **Phase 7: Statistical Variance Engine**
**Goal:** Provide historical context to identify spending behavioral shifts.

*   **Benchmarking Logic:**
    *   Enhance `hierarchyService` to establish a **12-month rolling median** for every Category and Subcategory node.
*   **Variance Metrics:**
    *   Calculate: `((Current Monthly Average - 12M Median) / 12M Median) * 100`.
    *   **Constraint:** Variance percentages are restricted to Category and Subcategory levels only.
    *   **Leaf Node Logic:** Merchants/Months will display "Percent of Parent" volume instead of variance.
*   **Visual Feedback:**
    *   Tooltips will display "vs. Normal" percentages.
    *   Color coding: Emerald for spend below median, Rose for spend above median.

## **Phase 8: Temporal Synchronization**
**Goal:** Connect the module to the app-wide `TimeFocus` and `Chronometer` systems.

*   **Global Selector Integration:**
    *   Replace local toggles with the standard `TimeFocusSelector` component used in Dashboard/Analytics.
*   **Context Alignment:**
    *   The `SpendView` will react to `MTD`, `QTD`, `YTD`, `12M`, and `CUSTOM` focus changes.
    *   Trigger re-normalization of the hierarchy and heatmap scale on every focus shift.
*   **Year Continuity:**
    *   Ensure the `selectedYear` context correctly drives data ingestion for historical audits.

## **Phase 9: Aesthetic Audit (Institutional Standards)**
**Goal:** Finalize the "Ledger Red" visual language.

*   **Typography Standards:**
    *   Labels will remain **Strict White** in Dark Mode and **Strict Black** in Light Mode for high-contrast legibility against the red heat gradients.
    *   Enforce mono-spaced font for all currency values and percentages.
*   **Sensory Mapping:**
    *   "Soft" haptic click for drill-down interactions.
    *   "Light" haptic pulse when toggling between Structure and Pulse modes.
*   **Contrast Layer:**
    *   Refine `getHeatmapColor` to ensure distinct visual steps between small contributing nodes and heavy capital concentrations.

---

## **Implementation Tracking**
- [x] Phase 6: Monthly Leaves & Pulse Mode
- [x] Phase 7: 12M Rolling Median & Variance Tooltips
- [x] Phase 8: Global Time Focus Integration
- [x] Phase 9: Final Typography & Haptic Audit