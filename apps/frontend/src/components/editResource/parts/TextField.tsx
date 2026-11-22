import { Field, Input } from '@chakra-ui/react';
import { FieldChangeHandler } from '../types';

interface TextFieldProps {
  
  fieldKey: string;
  
  label: string;
  
  value: string;
  
  onChange: FieldChangeHandler;
  
  placeholder?: string;
  
  type?: 'text' | 'tel' | 'email';
}

/**
 * A labeled single-line text input. Presentational: the parent owns the value.
 *
 * @param props - The field key, label, value, change handler, and optional placeholder and type.
 * @returns The labeled input.
 */
const TextField = ({
  fieldKey,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: TextFieldProps) => (
  <Field.Root className="edit-resource-field">
    <Field.Label htmlFor={fieldKey} className="edit-resource-label">
      {label}
    </Field.Label>
    <Input
      id={fieldKey}
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(fieldKey, event.target.value)}
      className="edit-resource-input"
    />
  </Field.Root>
);

export default TextField;