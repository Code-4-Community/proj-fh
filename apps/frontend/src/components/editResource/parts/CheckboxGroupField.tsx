import { Checkbox, Fieldset, Flex } from '@chakra-ui/react';
import { FieldChangeHandler, FieldOption } from '../types';

interface CheckboxGroupFieldProps {
  /** Field key; each checkbox id is derived from it plus the option value. */
  fieldKey: string;
  /** Legend text for the group. */
  label: string;
  /** The values that are currently checked. */
  value: string[];
  /** The checkboxes to show. */
  options: FieldOption[];
  /** Called with the field key and the new list of checked values. */
  onChange: FieldChangeHandler;
}

/**
 * A labeled group of checkboxes. Each box toggles independently.
 * Presentational: the parent owns the list of checked values.
 *
 * @param props - The field key, label, checked values, options, and change handler.
 * @returns The fieldset containing the checkboxes.
 */
const CheckboxGroupField = ({
  fieldKey,
  label,
  value,
  options,
  onChange,
}: CheckboxGroupFieldProps) => {
  const toggle = (optionValue: string) => {
    const next = value.includes(optionValue)
      ? value.filter((item) => item !== optionValue)
      : [...value, optionValue];
    onChange(fieldKey, next);
  };

  return (
    <Fieldset.Root className="edit-resource-field">
      <Fieldset.Legend className="edit-resource-label">{label}</Fieldset.Legend>
      <Fieldset.Content>
        <Flex className="edit-resource-checkbox-group">
          {options.map((option) => (
            <Checkbox.Root
              key={option.value}
              ids={{ hiddenInput: `${fieldKey}-${option.value}` }}
              checked={value.includes(option.value)}
              onCheckedChange={() => toggle(option.value)}
              className="edit-resource-checkbox"
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control className="edit-resource-checkbox-control" />
              <Checkbox.Label className="edit-resource-checkbox-label">{option.label}</Checkbox.Label>
            </Checkbox.Root>
          ))}
        </Flex>
      </Fieldset.Content>
    </Fieldset.Root>
  );
};

export default CheckboxGroupField;