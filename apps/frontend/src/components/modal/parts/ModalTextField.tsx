import { Field, Input } from '@chakra-ui/react';
import { ModalFieldProps } from '../types';

/**
 * A single-line text input with a label above it, for use in a Modal body.
 * Presentational only: the caller owns the value and handles changes.
 * When `required` is set, "(required)" is added to the label.
 *
 * @param props - The label, value, placeholder, change handler and optional required flag.
 * @returns The labeled text input.
 */
const ModalTextField = ({
  label,
  value,
  placeholder,
  onChange,
  required = false,
}: ModalFieldProps) => (
  <Field.Root required={required} className="modal-field">
    <Field.Label className="modal-field-label">
      {label}
      <Field.RequiredIndicator className="modal-field-required">
        (required)
      </Field.RequiredIndicator>
    </Field.Label>
    <Input
      className="modal-input"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  </Field.Root>
);

export default ModalTextField;
