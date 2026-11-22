import { Field, Textarea } from '@chakra-ui/react';
import { FieldChangeHandler } from '../types';

interface TextAreaFieldProps {
  
  fieldKey: string;
  
  label: string;
  
  value: string;
  
  onChange: FieldChangeHandler;
  
  placeholder?: string;
}

/**
 * A labeled multi-line text input. Presentational: the parent owns the value.
 *
 * @param props - The field key, label, value, change handler, and optional placeholder.
 * @returns The labeled textarea.
 */
const TextAreaField = ({
  fieldKey,
  label,
  value,
  onChange,
  placeholder,
}: TextAreaFieldProps) => (
  <Field.Root className="edit-resource-field">
    <Field.Label htmlFor={fieldKey} className="edit-resource-label">
      {label}
    </Field.Label>
    <Textarea
      id={fieldKey}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(fieldKey, event.target.value)}
      className="edit-resource-textarea"
    />
  </Field.Root>
);

export default TextAreaField;