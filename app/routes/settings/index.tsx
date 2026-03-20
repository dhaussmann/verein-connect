import { Form, useActionData, useLoaderData, useNavigation } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Badge, Button, Card, Group, Stack, TextInput } from '@mantine/core';
import { Text } from '@mantine/core';
import { Upload } from 'lucide-react';
import type { OrganizationSettingsData } from '@/modules/settings/types/settings.types';
import { requireRouteData } from '@/core/runtime/route';
import { getOrganizationSettingsUseCase, updateOrganizationSettingsUseCase } from '@/modules/settings/use-cases/settings.use-cases';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const organization = await getOrganizationSettingsUseCase(env, user.orgId);
  if (!organization) throw new Error('Organisation nicht gefunden');
  return { organization };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const name = String(formData.get('name') || '').trim();
  const timezone = String(formData.get('timezone') || '').trim();
  const language = String(formData.get('language') || '').trim();
  const website = String(formData.get('website') || '').trim();
  if (!name) return { success: false, error: 'Vereinsname ist erforderlich' };
  if (!timezone) return { success: false, error: 'Zeitzone ist erforderlich' };
  if (!language) return { success: false, error: 'Sprache ist erforderlich' };
  await updateOrganizationSettingsUseCase(env, { orgId: user.orgId, actorUserId: user.id, name, timezone, language, website });
  return { success: true };
}

export default function SettingsIndexRoute() {
  const { organization } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const org = organization as OrganizationSettingsData;
  const settings = org.settings || {};

  return (
    <Form method="post">
      {actionData?.error && <Text c="red" size="sm" mb="sm">{actionData.error}</Text>}
      {actionData?.success && <Text c="green" size="sm" mb="sm">Einstellungen gespeichert.</Text>}
      <fieldset disabled={navigation.state === 'submitting'} style={{ border: 0, padding: 0, margin: 0 }}>
        <Card>
          <Text fw={600} mb="md">
            Vereinsdaten
          </Text>
          <Stack gap="md">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <TextInput label="Vereinsname" name="name" defaultValue={org.name} />
              <TextInput
                label="Website"
                name="website"
                defaultValue={String(settings.website || '')}
              />
            </div>
            <div>
              <Text size="sm" fw={500} mb="xs">
                Logo
              </Text>
              <div
                style={{
                  border: '2px dashed var(--mantine-color-gray-4)',
                  borderRadius: 8,
                  padding: '1.5rem',
                  textAlign: 'center',
                  cursor: 'not-allowed',
                }}
              >
                <Upload style={{ margin: '0 auto 8px' }} size={32} />
                <Text size="sm" c="dimmed">
                  Logo-Upload folgt in einem eigenen Action-Flow
                </Text>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <TextInput
                label="Zeitzone"
                name="timezone"
                defaultValue={String(settings.timezone || 'Europe/Berlin')}
              />
              <TextInput
                label="Sprache"
                name="language"
                defaultValue={String(settings.language || 'de')}
              />
            </div>
            <Card bg="gray.0">
              <Group justify="space-between">
                <div>
                  <Text fw={500}>{org.plan?.toUpperCase() || 'FREE'} Plan</Text>
                  <Text size="sm" c="dimmed">
                    Vereins-Slug: {org.slug}
                  </Text>
                </div>
                <Badge variant="outline" color="green">
                  Aktiv
                </Badge>
              </Group>
            </Card>
            <Button type="submit" style={{ alignSelf: 'flex-start' }}>
              Änderungen speichern
            </Button>
          </Stack>
        </Card>
      </fieldset>
    </Form>
  );
}
