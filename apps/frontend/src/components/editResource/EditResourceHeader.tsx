import { Heading, Stack, Text } from '@chakra-ui/react';
import ActionButton from './parts/ActionButton';
import { ActionDefinition } from './types';

interface EditResourceHeaderProps {
  /** Page title. */
  title: string;
  /** Line under the title, such as the resource's name. */
  subtitle: string;
  /** The back button, described like any other action. */
  backAction: ActionDefinition;
}

/**
 * The top of the page: a back button, the page title, and a subtitle.
 *
 * @param props - The title, subtitle, and back button definition.
 * @returns The page header.
 */
const EditResourceHeader = ({
  title,
  subtitle,
  backAction,
}: EditResourceHeaderProps) => (
  <Stack as="header" className="edit-resource-header">
    <ActionButton {...backAction} />
    <Heading as="h1" className="edit-resource-title">
      {title}
    </Heading>
    <Text className="edit-resource-subtitle">{subtitle}</Text>
  </Stack>
);

export default EditResourceHeader;