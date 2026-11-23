import { Text } from '@chakra-ui/react';

// TODO: Replace with variable in the future
const NO_NOTES_MESSAGE = 'No changes have been requested for this resource.';

interface NeedsChangesNotesProps {
  /** What the admin asked staff to fix. Empty when no changes are needed. */
  notes: string;
}

/**
 * The read-only Needs Changes notes: what the admin told staff to fix when they
 * sent the resource back. Plain text, not an input, so it can't be edited.
 * Shows a message instead when there are no notes.
 *
 * @param props - The notes text, empty if there are none.
 * @returns The notes section.
 */
const NeedsChangesNotes = ({ notes }: NeedsChangesNotesProps) => (
  <section className="edit-resource-notes" aria-label="Needs Changes notes">
    <Text className="edit-resource-status-label">Needs Changes Notes</Text>
    <Text className="edit-resource-notes-text">
      {notes.trim() || NO_NOTES_MESSAGE}
    </Text>
  </section>
);

export default NeedsChangesNotes;
