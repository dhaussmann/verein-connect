import { NavLink } from "react-router";
import { Tabs } from "@mantine/core";

export function FinanceTabs({ value }: { value: "invoices" | "accounting" }) {
  return (
    <Tabs value={value} mb="lg">
      <Tabs.List>
        <Tabs.Tab
          value="invoices"
          renderRoot={(props) => <NavLink {...props} to="/finance" />}
        >
          Rechnungen
        </Tabs.Tab>
        <Tabs.Tab
          value="accounting"
          renderRoot={(props) => <NavLink {...props} to="/finance/accounting" />}
        >
          Buchhaltung
        </Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}
