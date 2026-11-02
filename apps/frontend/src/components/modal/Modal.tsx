import { ReactNode } from 'react';
import { Button, Dialog, Portal } from '@chakra-ui/react';
import { ModalConfirmVariant } from './types';
import './modal.css';

interface ModalProps {
  /** Whether the modal is visible. The caller owns this state. */
  isOpen: boolean;
  /** Heading of the modal. */
  title: string;
  /** Short explanation shown under the title. */
  description: string;
  /** Label of the cancel button. */
  cancelLabel: string;
  /** Label of the confirm button. */
  confirmLabel: string;
  /** Style of the confirm button. Defaults to `primary`. */
  confirmVariant?: ModalConfirmVariant;
  /** Disables the confirm button, e.g. while a required field is empty. Defaults to false. */
  confirmDisabled?: boolean;
  /** Called when the confirm button is clicked. */
  onConfirm: () => void;
  /** Called when the cancel button is clicked, Escape is pressed, or the backdrop is clicked. */
  onCancel: () => void;
  /** Optional body content, usually the field parts from `parts/`. */
  children?: ReactNode;
}

/**
 * Reusable modal dialog: a dimmed backdrop, a panel with title, description,
 * an optional body, and a footer with Cancel and confirm buttons.
 * Every specific dialog (approve, reject, archive, add staff, ...) is a configuration of this
 * one component. It knows nothing about fields or validation: the caller passes the fields as
 * children, owns their values, and decides when confirm is disabled.
 * It renders through a portal to `document.body`, so it covers the whole screen including the navbar.
 *
 * @param props - The open state, text, button configuration, handlers and optional body content.
 * @returns The modal, or nothing while closed.
 */
const Modal = ({
  isOpen,
  title,
  description,
  cancelLabel,
  confirmLabel,
  confirmVariant = 'primary',
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}: ModalProps) => (
  <Dialog.Root
    open={isOpen}
    placement="center"
    onOpenChange={(details) => {
      if (!details.open) onCancel();
    }}
  >
    <Portal>
      <Dialog.Backdrop className="modal-backdrop" />
      <Dialog.Positioner className="modal-positioner">
        <Dialog.Content className="modal-panel">
          <Dialog.Title className="modal-title">{title}</Dialog.Title>
          <Dialog.Description className="modal-description">
            {description}
          </Dialog.Description>
          {children && (
            <Dialog.Body className="modal-body">{children}</Dialog.Body>
          )}
          <Dialog.Footer className="modal-footer">
            <Button
              unstyled
              className="modal-button modal-cancel"
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
            <Button
              unstyled
              className={`modal-button modal-confirm modal-confirm-${confirmVariant}`}
              disabled={confirmDisabled}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Portal>
  </Dialog.Root>
);

export default Modal;
