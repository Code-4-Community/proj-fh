import { useState } from 'react';
import { Button, Flex, Stack } from '@chakra-ui/react';
import Modal from '@components/modal/Modal';
import ModalSelectField from '@components/modal/parts/ModalSelectField';
import ModalTextAreaField from '@components/modal/parts/ModalTextAreaField';
import ModalTextField from '@components/modal/parts/ModalTextField';
import { ModalSelectOption } from '@components/modal/types';
import '../page.css';
import NavbarLogo from '@components/navbar/parts/NavbarLogo';

/** Identifies which of the six demo configurations is open. */
type DemoModalId =
  | 'approve'
  | 'needsChanges'
  | 'reject'
  | 'archive'
  | 'addStaff'
  | 'removeStaff';

// Every value below is hardcoded for the demo only.
// The pages that use the modal will pass real data instead.

/** Text shared by every configuration. */
const COMMON = {
  cancelLabel: 'Cancel', // TODO: Replace with variable in the future
  notesLabel: 'Notes', // TODO: Replace with variable in the future
  placeholder: 'Enter here', // TODO: Replace with variable in the future
};

const APPROVE = {
  openLabel: 'Approve & publish', // TODO: Replace with variable in the future
  title: 'Approve & publish?', // TODO: Replace with variable in the future
  description: 'Resource goes live to patients and staff.', // TODO: Replace with variable in the future
  confirmLabel: 'Confirm', // TODO: Replace with variable in the future
};

const NEEDS_CHANGES = {
  openLabel: 'Needs changes', // TODO: Replace with variable in the future
  title: 'Needs changes?', // TODO: Replace with variable in the future
  description: 'Sent back to the staff submitter to edit.', // TODO: Replace with variable in the future
  confirmLabel: 'Send Back', // TODO: Replace with variable in the future
};

const REJECT = {
  openLabel: 'Reject', // TODO: Replace with variable in the future
  title: 'Reject submission?', // TODO: Replace with variable in the future
  description: 'Submitter will see the reason and can edit and resubmit.', // TODO: Replace with variable in the future
  fieldLabel: 'Reason', // TODO: Replace with variable in the future
  confirmLabel: 'Reject', // TODO: Replace with variable in the future
};

const ARCHIVE = {
  openLabel: 'Archive resource', // TODO: Replace with variable in the future
  title: 'Archive resource?', // TODO: Replace with variable in the future
  description: 'Hidden from search. Can be restored later.', // TODO: Replace with variable in the future
  confirmLabel: 'Archive', // TODO: Replace with variable in the future
};

const ADD_STAFF = {
  openLabel: 'Add staff user', // TODO: Replace with variable in the future
  title: 'Add staff user', // TODO: Replace with variable in the future
  description: 'They get an email invitation to set up their account.', // TODO: Replace with variable in the future
  nameLabel: 'Full Name', // TODO: Replace with variable in the future
  emailLabel: 'Email', // TODO: Replace with variable in the future
  roleLabel: 'Role', // TODO: Replace with variable in the future
  rolePlaceholder: 'Select an option', // TODO: Replace with variable in the future
  roleOptions: [
    { label: 'Staff', value: 'staff' }, // TODO: Replace with variable in the future
    { label: 'Admin', value: 'admin' }, // TODO: Replace with variable in the future
  ] as ModalSelectOption[],
  confirmLabel: 'Send Invite', // TODO: Replace with variable in the future
};

const REMOVE_STAFF = {
  openLabel: 'Remove staff user', // TODO: Replace with variable in the future
  title: 'Remove staff user?', // TODO: Replace with variable in the future
  description:
    'They lose access to the portal right away. Resources they submitted are kept.', // TODO: Replace with variable in the future
  confirmLabel: 'Remove', // TODO: Replace with variable in the future
};

/**
 * Demo page that opens each of the six Modal configurations from a button.
 * Not linked from anywhere; reach it by typing /modal-demo.
 * The page owns every field value and decides when confirm is disabled.
 * Confirm only closes the modal because the real actions need backend endpoints that don't exist yet.
 *
 * @returns The demo page.
 */
const ModalDemo = () => {
  const [openModal, setOpenModal] = useState<DemoModalId | null>(null);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');

  /** Closes the modal and clears every field so the next open starts empty. */
  const close = () => {
    setOpenModal(null);
    setNotes('');
    setReason('');
    setFullName('');
    setEmail('');
    setRole('');
  };

  return (
    <>
    <Flex as="header" align="center" className="navbar">
        <NavbarLogo />
    </Flex>
    <main className="page-content">
      <Stack align="flex-start" gap="4">
        <Button variant="outline" onClick={() => setOpenModal('approve')}>
          {APPROVE.openLabel}
        </Button>
        <Button variant="outline" onClick={() => setOpenModal('needsChanges')}>
          {NEEDS_CHANGES.openLabel}
        </Button>
        <Button variant="outline" onClick={() => setOpenModal('reject')}>
          {REJECT.openLabel}
        </Button>
        <Button variant="outline" onClick={() => setOpenModal('archive')}>
          {ARCHIVE.openLabel}
        </Button>
        <Button variant="outline" onClick={() => setOpenModal('addStaff')}>
          {ADD_STAFF.openLabel}
        </Button>
        <Button variant="outline" onClick={() => setOpenModal('removeStaff')}>
          {REMOVE_STAFF.openLabel}
        </Button>
      </Stack>

      <Modal
        isOpen={openModal === 'approve'}
        title={APPROVE.title}
        description={APPROVE.description}
        cancelLabel={COMMON.cancelLabel}
        confirmLabel={APPROVE.confirmLabel}
        onConfirm={close}
        onCancel={close}
      />

      <Modal
        isOpen={openModal === 'needsChanges'}
        title={NEEDS_CHANGES.title}
        description={NEEDS_CHANGES.description}
        cancelLabel={COMMON.cancelLabel}
        confirmLabel={NEEDS_CHANGES.confirmLabel}
        confirmDisabled={notes.trim() === ''}
        onConfirm={close}
        onCancel={close}
      >
        <ModalTextAreaField
          required
          label={COMMON.notesLabel}
          value={notes}
          placeholder={COMMON.placeholder}
          onChange={setNotes}
        />
      </Modal>

      <Modal
        isOpen={openModal === 'reject'}
        title={REJECT.title}
        description={REJECT.description}
        cancelLabel={COMMON.cancelLabel}
        confirmLabel={REJECT.confirmLabel}
        confirmDisabled={reason.trim() === ''}
        onConfirm={close}
        onCancel={close}
      >
        <ModalTextAreaField
          required
          label={REJECT.fieldLabel}
          value={reason}
          placeholder={COMMON.placeholder}
          onChange={setReason}
        />
      </Modal>

      <Modal
        isOpen={openModal === 'archive'}
        title={ARCHIVE.title}
        description={ARCHIVE.description}
        cancelLabel={COMMON.cancelLabel}
        confirmLabel={ARCHIVE.confirmLabel}
        onConfirm={close}
        onCancel={close}
      />

      <Modal
        isOpen={openModal === 'addStaff'}
        title={ADD_STAFF.title}
        description={ADD_STAFF.description}
        cancelLabel={COMMON.cancelLabel}
        confirmLabel={ADD_STAFF.confirmLabel}
        confirmDisabled={
          fullName.trim() === '' || email.trim() === '' || role === ''
        }
        onConfirm={close}
        onCancel={close}
      >
        <ModalTextField
          label={ADD_STAFF.nameLabel}
          value={fullName}
          placeholder={COMMON.placeholder}
          onChange={setFullName}
        />
        <ModalTextField
          label={ADD_STAFF.emailLabel}
          value={email}
          placeholder={COMMON.placeholder}
          onChange={setEmail}
        />
        <ModalSelectField
          label={ADD_STAFF.roleLabel}
          value={role}
          placeholder={ADD_STAFF.rolePlaceholder}
          options={ADD_STAFF.roleOptions}
          onChange={setRole}
        />
      </Modal>

      <Modal
        isOpen={openModal === 'removeStaff'}
        title={REMOVE_STAFF.title}
        description={REMOVE_STAFF.description}
        cancelLabel={COMMON.cancelLabel}
        confirmLabel={REMOVE_STAFF.confirmLabel}
        onConfirm={close}
        onCancel={close}
      />
    </main>
    </>
  );
};

export default ModalDemo;
