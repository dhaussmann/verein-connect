import { NavLink } from "react-router";
import { Tabs } from "@mantine/core";

export function FinanceTabs({ value }: { value: "invoices" | "accounting" }) {
  return (
    <Tabs value={value} mb="lg">
      <Tabs.List>
        <Tabs.Tab component={NavLink} to="/finance" value="invoices">Rechnungen</Tabs.Tab>
        <Tabs.Tab component={NavLink} to="/finance/accounting" value="accounting">Buchhaltung</Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}
