import { NavLink } from "react-router";
import { Tabs } from "@mantine/core";

export function CommunicationTabs({ value }: { value: "messages" | "templates" }) {
  return (
    <Tabs value={value} mb="lg">
      <Tabs.List>
        <Tabs.Tab component={NavLink} to="/communication" value="messages">Nachrichten</Tabs.Tab>
        <Tabs.Tab component={NavLink} to="/communication/email" value="templates">E-Mail & Vorlagen</Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}
