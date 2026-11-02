import { Field, Textarea } from '@chakra-ui/react';
import { ModalFieldProps } from '../types';

/**
 * A multi-line text area with a label above it, for use in a Modal body.
 * Presentational only: the caller owns the value and handles changes.
 * When `required` is set, "(required)" is added to the label.
 *
 * @param props - The label, value, placeholder, change handler and optional required flag.
 * @returns The labeled textarea.
 */
const ModalTextAreaField = ({
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
    <Textarea
      className="modal-textarea"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  </Field.Root>
);

export default ModalTextAreaField;
