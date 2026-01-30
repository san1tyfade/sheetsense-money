# Sheetsense Sensory Layer & Haptic Protocol

Sheetsense implements a "Mechanical UI" philosophy, using a combination of synthesized audio and physical vibration to provide tactile confirmation for logical operations. This document maps the sensory feedback triggers across the application.

## 1. Feedback Primitives
Defined in `services/infrastructure/HapticService.ts`, the system utilizes three primary feedback patterns:

*   **Light Click:** A high-frequency (1200Hz) damped sine wave. Used for positive confirmations and data selection.
*   **Soft Tick:** A subtle (800Hz) low-gain pulse. Used for navigation and non-destructive UI toggles.
*   **Heavy Pulse:** A low-frequency (150Hz) square wave accompanied by a 20ms/50ms/20ms vibration sequence. Reserved for destructive actions and protocol faults.

---

## 2. Interaction Map

### System Alerts & Synchronization
*   **Notification Received:** Standard alerts (Success/Info) trigger a **Light Click**. Errors trigger a **Heavy Pulse**.
*   **Global Sync Initiated:** Tapping the "Sync Architecture" or "Commit Delta" button triggers a 10ms **Light Pulse** on mobile.

### Navigation & Perspective Shifting
*   **Directorate Navigation:** Switching between primary departments (e.g., Capital to Flow) via the Navigation Bar triggers a **Soft Tick**.
*   **View Toggles:** Changing between "Matrix" (Table) and "Grid" (Card) views results in a **Soft Tick**.

### Spend Insights Hub
*   **Mode Toggling:** Switching between **Pulse** (Top 10) and **Hierarchy** (Structural) modes triggers a **Light Pulse**.
*   **Metric Selection:** Adjusting the focus between Magnitude (Value) and Velocity (Count) triggers a **Soft Tick**.
*   **Treemap Drill-down:** Tapping a category or sub-category square in the Heatmap to dive deeper triggers a **Soft Tick**.

### Data Management
*   **Row Selection:** Checking a box or clicking a row in the Assets, Trades, or Journal registries triggers a **Light Click**.
*   **Bulk Execution:** Triggering an "Atomic Purge" in the Selection Action Matrix triggers a **Heavy Pulse** to confirm the destructive intent.

### Strategic Cockpit (Simulation)
*   **Node Interaction:** Initiating a drag on any node in the Strategic Sankey triggers a 10ms vibration.
*   **Tactical Overrides:** Adjusting the scalar sliders or using the increment/decrement buttons in the Tactical Bottom Sheet triggers a 5ms vibration per step.

---

## 3. "Deep" Interaction Shortcuts
*   **Institutional Stat Cards:** Long-pressing (holding for ~600ms) any primary stat card on the Dashboard triggers a **Light Pulse** and forces an immediate infrastructure sync.

## 4. Hardware Requirements
*   **Mobile:** Requires a device supporting the `navigator.vibrate` API.
*   **Desktop:** Requires a browser supporting the `Web Audio API` (Chrome, Safari, Edge, Firefox). Audio is only initialized after the first user interaction to comply with browser security policies.