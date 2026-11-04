import { Field, NativeSelect } from '@chakra-ui/react';
import { FieldChangeHandler, FieldOption } from '../types';

interface SelectFieldProps {
  /** Field key; the select id and the label's htmlFor are derived from it. */
  fieldKey: string;
  /** Label text. */
  label: string;
  /** Currently selected option value, or an empty string for none. */
  value: string;
  /** The choices to show. */
  options: FieldOption[];
  /** Called with the field key and new value on every change. */
  onChange: FieldChangeHandler;
  /** Text shown while nothing is selected. */
  placeholder?: string;
}

/**
 * A labeled dropdown. Presentational: the parent owns the value and the options.
 *
 * @param props - The field key, label, value, options, change handler, and optional placeholder.
 * @returns The labeled dropdown.
 */
const SelectField = ({
  fieldKey,
  label,
  value,
  options,
  onChange,
  placeholder,
}: SelectFieldProps) => (
  <Field.Root className="edit-resource-field">
    <Field.Label htmlFor={fieldKey} className="edit-resource-label">
      {label}
    </Field.Label>
    <NativeSelect.Root className="edit-resource-select">
      <NativeSelect.Field
        id={fieldKey}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(fieldKey, event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  </Field.Root>
);

export default SelectField;