# Software Development Plan: Spending Insights Page
**Project Name:** SheetSense.money - Insights Module
**Tech Stack:** React, Tailwind CSS, Nivo (or D3.js)
**Theme:** Monochromatic Red/Beige | Text: Black

## 1. Objective
To deliver a high-performance analytics dashboard that visualizes spending trends through hierarchical treemaps, allowing for macro (Category) to micro (Monthly/Merchant) financial analysis.

---

## 2. General Features & UI Requirements
- [ ] **Global Time Filter:** Integrate existing time selector; state must drive all page visualizations.
- [ ] **Color Palette:**
    - Backgrounds: Beige/Red scale (e.g., Tailwind `bg-rose-50` to `bg-red-800`).
    - Typography: Strict `text-black` for all labels and data points.
- [ ] **Navigation:** Breadcrumb system for drill-down depth (e.g., `All > Personal > Shopping`).

---

## 3. Data Visualization Specs

### A. Nested Treemap (Hierarchy: Category > Subcategory > Month)
- **Level 1 (Major):** Fixed, Personal, Food, etc.
- **Level 2 (Minor):** Drill-down into sub-items (e.g., Personal > Gym, Travel).
- **Level 3 (Temporal):** Display spending by month (Jan-Dec) within the subcategory leaf nodes.
- **Feature:** Implement "Breadcrumb" logic to allow users to navigate back up the tree.



### B. Basic Treemap (Merchant Focus)
- **Goal:** Display the Top 10 most frequent merchants across all transactions.
- **Metric:** Sized by transaction frequency/count.

---

## 4. Statistics & Analytics Logic
The following metrics must be calculated based on the selected time period:

| Metric | Level | Logic |
| :--- | :--- | :--- |
| **Average Spending** | Category/Sub | Total spend / Number of months in period |
| **Variance** | Subcategory | MoM and YoY percentage change calculations |
| **Major Hits** | Category | Identify `MAX(transaction_amount)` and return metadata (Date/Merchant) |
| **Merchant Freq** | Global | Count of occurrences per merchant string |

---

## 5. Implementation Phases

### Phase 1: Data Preparation
- Structure incoming financial data into a JSON hierarchy: `id`, `value`, `children[]`.
- Create a utility function to calculate "One-time hits" (Max transactions) for specific nodes.

### Phase 2: Core Components (Tailwind/React)
- **Container Layout:** Create the grid for the two treemap types.
- **Breadcrumb Component:** Build a dynamic list that updates based on the Treemap `activeNode` state.
- **Theme Provider:** Ensure the monochromatic red scale is mapped to spending volume.

### Phase 3: Treemap Integration
- Implement `Nivo/TreeMap` with custom `nodeComponent` to handle black text labels.
- Link the `onClick` handler of the treemap to the drill-down state.

### Phase 4: Final Polish
- Add tooltips showing the **Average** and **Variance** when hovering over squares.
- Ensure responsive scaling for different screen sizes.

---

## 6. Success Criteria
1. User can successfully drill down from "Food" to "Eating Out" to "March Spending".
2. The Top 10 Merchant treemap correctly reflects the most frequent transaction names.
3. All UI elements adhere to the red/beige/black design constraints.