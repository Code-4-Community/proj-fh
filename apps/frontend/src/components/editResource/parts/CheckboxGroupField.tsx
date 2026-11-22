import { Checkbox, Fieldset, Flex } from '@chakra-ui/react';
import { FieldChangeHandler, FieldOption, OtherInputDefinition } from '../types';
import TextField from './TextField';

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
  /** Optional text input shown under the boxes while its option is checked. */
  otherInput?: OtherInputDefinition;
  /** The text typed into the other input. */
  otherValue?: string;
}

/**
 * A labeled group of checkboxes. Each box toggles independently.
 * If given an other input, it is shown under the boxes while its option is checked,
 * and its text is cleared when the option is unchecked.
 * Presentational: the parent owns the list of checked values and the other text.
 *
 * @param props - The field key, label, checked values, options, change handler, and optional other input.
 * @returns The fieldset containing the checkboxes.
 */
const CheckboxGroupField = ({
  fieldKey,
  label,
  value,
  options,
  onChange,
  otherInput,
  otherValue = '',
}: CheckboxGroupFieldProps) => {
  const toggle = (optionValue: string) => {
    const isChecked = value.includes(optionValue);
    const next = isChecked
      ? value.filter((item) => item !== optionValue)
      : [...value, optionValue];
    onChange(fieldKey, next);
    if (isChecked && otherInput?.optionValue === optionValue) {
      onChange(otherInput.key, '');
    }
  };

  const showOtherInput =
    otherInput !== undefined && value.includes(otherInput.optionValue);

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
        {showOtherInput && (
          <div className="edit-resource-other-input">
            <TextField
              fieldKey={otherInput.key}
              label={otherInput.label}
              value={otherValue}
              onChange={onChange}
              placeholder={otherInput.placeholder}
            />
          </div>
        )}
      </Fieldset.Content>
    </Fieldset.Root>
  );
};

export default CheckboxGroupField;