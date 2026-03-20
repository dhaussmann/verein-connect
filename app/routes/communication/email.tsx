import { useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Button, Card, Group, Modal, Select, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { Plus, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireRouteData } from "@/core/runtime/route";
import { createMessageTemplateUseCase, createMessageUseCase, getMessageTemplatesDataUseCase } from "@/modules/communication/use-cases/communication.use-cases";
import { CommunicationTabs } from "@/components/communication/CommunicationTabs";

const placeholderTags = ["{{vorname}}", "{{nachname}}", "{{verein}}", "{{kurs}}", "{{datum}}", "{{uhrzeit}}", "{{betrag}}"];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const templates = await getMessageTemplatesDataUseCase(env, user.orgId);
  return { templates };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  try {
    if (intent === "save-message" || intent === "send-message") {
      const subject = String(formData.get("subject") || "");
      const body = String(formData.get("body") || "");
      const recipients = String(formData.get("recipients") || "");
      if (!body.trim()) return { success: false, error: "Nachricht ist erforderlich" };
      await createMessageUseCase(env, { orgId: user.orgId, actorUserId: user.id, channel: "email", subject, body, recipientLabel: recipients, status: intent === "send-message" ? "sent" : "draft" });
      return { success: true, intent };
    }
    if (intent === "save-template") {
      const name = String(formData.get("templateName") || "").trim();
      const subject = String(formData.get("templateSubject") || "");
      const body = String(formData.get("templateBody") || "");
      if (!name) return { success: false, error: "Vorlagenname ist erforderlich" };
      if (!body.trim()) return { success: false, error: "Vorlageninhalt ist erforderlich" };
      await createMessageTemplateUseCase(env, { orgId: user.orgId, actorUserId: user.id, name, channel: "email", subject, body });
      return { success: true, intent };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Speichern fehlgeschlagen" };
  }
  return { success: false, error: "Unbekannte Aktion" };
}

export default function CommunicationEmailRoute() {
  const { templates } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const insertTag = (tag: string) => setEmailBody((prev) => prev + tag);

  return (
    <div>
      <PageHeader title="Kommunikation" />
      <CommunicationTabs value="templates" />
      {actionData?.error && <Text c="red" size="sm" mb="sm">{actionData.error}</Text>}
      {actionData?.success && <Text c="green" size="sm" mb="sm">Gespeichert.</Text>}
      <Card withBorder mb="lg"><Form method="post"><input type="hidden" name="body" value={emailBody} /><Stack gap="md"><TextInput name="recipients" label="An:" placeholder="Empfänger, Rollen oder Gruppen eingeben..." /><TextInput name="subject" label="Betreff:" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Betreff eingeben..." /><Select label="Vorlage laden:" placeholder="Vorlage wählen..." onChange={(value) => { const template = templates.find((item) => item.id === value); if (template) { setEmailSubject(template.subject); setEmailBody(template.body); } }} data={templates.filter((template) => template.channel === "email").map((template) => ({ value: template.id, label: template.name }))} /><div><Text size="sm" fw={500} mb={6}>Platzhalter:</Text><Group gap="xs" wrap="wrap">{placeholderTags.map((tag) => <Button key={tag} variant="outline" size="xs" onClick={() => insertTag(tag)} type="button">{tag}</Button>)}</Group></div><Textarea label="Nachricht:" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={10} placeholder="Nachrichtentext..." /><Group justify="flex-end" gap="sm" wrap="wrap"><Button variant="subtle" name="intent" value="save-message" type="submit" disabled={navigation.state === "submitting"}>Als Entwurf speichern</Button><Button name="intent" value="send-message" type="submit" leftSection={<Send size={16} />} disabled={navigation.state === "submitting"}>Jetzt senden</Button></Group></Stack></Form></Card>
      <Group justify="space-between" mb="md"><Text fw={600}>Vorlagen</Text><Button onClick={() => setTemplateModalOpen(true)} leftSection={<Plus size={16} />}>Neue Vorlage</Button></Group>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{templates.map((template) => <Card key={template.id} withBorder><Group justify="space-between" mb="xs"><Text fw={600} size="sm">{template.name}</Text><Text size="xs" c="dimmed">{template.channel}</Text></Group><Text size="sm" fw={500} mb={4}>{template.subject}</Text><Text size="xs" c="dimmed" lineClamp={3} style={{ whiteSpace: "pre-line" }}>{template.body}</Text></Card>)}</div>
      <Modal opened={templateModalOpen} onClose={() => setTemplateModalOpen(false)} title="Neue Vorlage" size="lg"><Form method="post"><input type="hidden" name="intent" value="save-template" /><Stack gap="md"><TextInput name="templateName" label="Name" placeholder="z.B. Kursabsage" /><TextInput name="templateSubject" label="Betreff" placeholder="Betreff" /><Textarea name="templateBody" label="Inhalt" rows={8} placeholder="Vorlagentext..." /></Stack><Group justify="flex-end" mt="md"><Button variant="outline" onClick={() => setTemplateModalOpen(false)} type="button">Abbrechen</Button><Button type="submit" disabled={navigation.state === "submitting"}>Speichern</Button></Group></Form></Modal>
    </div>
  );
}
