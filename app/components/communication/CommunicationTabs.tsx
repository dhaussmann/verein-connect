import { NavLink } from "react-router";
import { Tabs } from "@mantine/core";

export function CommunicationTabs({ value }: { value: "messages" | "templates" }) {
  return (
    <Tabs value={value} mb="lg">
      <Tabs.List>
        <Tabs.Tab
          value="messages"
          renderRoot={(props) => <NavLink {...props} to="/communication" />}
        >
          Nachrichten
        </Tabs.Tab>
        <Tabs.Tab
          value="templates"
          renderRoot={(props) => <NavLink {...props} to="/communication/email" />}
        >
          E-Mail & Vorlagen
        </Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}
