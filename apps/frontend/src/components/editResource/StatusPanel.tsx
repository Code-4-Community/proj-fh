import { Stack, Text } from '@chakra-ui/react';
import { ResourceStatus } from '../../types';
import ActionButton from './parts/ActionButton';
import StatusBadge from './parts/StatusBadge';
import { ActionDefinition } from './types';

interface StatusPanelProps {
  /** The resource's current status. */
  status: ResourceStatus;
  /** Actions to offer, in order. Adding or removing one needs no change here. */
  actions: ActionDefinition[];
}

/**
 * The status side panel: a status badge and a list of action buttons.
 * Holds actions rather than form fields, so it is separate from the form columns.
 *
 * @param props - The status and the actions to show.
 * @returns The status panel.
 */
const StatusPanel = ({ status, actions }: StatusPanelProps) => (
  <Stack as="section" className="edit-resource-status-panel" aria-label="Resource status">
    <Text className="edit-resource-status-label">Status</Text>
    <StatusBadge status={status} />
    {actions.map((action) => (
      <ActionButton key={action.label} {...action} />
    ))}
  </Stack>
);

export default StatusPanel;