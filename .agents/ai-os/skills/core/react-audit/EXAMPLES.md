# React Safety Audit Examples

* **Violation Hydration example**:
  - Code:
    ```tsx
    export function ThemeToggle() {
      const mode = localStorage.getItem('theme'); // Raw browser global access during render path
      return <div>Mode: {mode}</div>;
    }
    ```
  - Finding output: ruleId `VAL-REC-001`, severity `HIGH`, message: "Unguarded browser global access 'localStorage' detected outside mounting hook."
