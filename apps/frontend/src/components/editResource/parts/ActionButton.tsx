import { Button } from '@chakra-ui/react';
import { ActionDefinition } from '../types';

/**
 * A button described by an ActionDefinition: its label, look and click handler.
 * Used for the status panel actions, Save, Cancel and Back.
 *
 * @param props - The label, style variant and click handler.
 * @returns The button.
 */
const ActionButton = ({ label, variant, onClick }: ActionDefinition) => (
  <Button
    unstyled
    type="button"
    onClick={onClick}
    className={`edit-resource-button edit-resource-button-${variant}`}
  >
    {label}
  </Button>
);

export default ActionButton;