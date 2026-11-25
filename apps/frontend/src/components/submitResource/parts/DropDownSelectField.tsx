import { NativeSelect } from '@chakra-ui/react';
import { FieldComponentProps } from '../types';
import FieldWrapper from './FieldWrapper';

/**
 * Dropdown where one option is picked, e.g. "Frequency of services".
 * Shows the field's placeholder until option is picked.
 * 
 * @param props - The field to render, the chosen option's value and error, and the change handler.
 * @returns The rendered dropdown field.
 */
const DropDownSelectField = ({ field, value, error, onChange }: FieldComponentProps<string>) => (
    <FieldWrapper field={field} error={error}>
        <NativeSelect.Root className="submit-resource-select">
          <NativeSelect.Field
            id={field.key}
            name={field.key}
            value={value}
            placeholder={field.placeholder}
            aria-invalid={Boolean(error)}
            onChange={(event) => onChange(field.key, event.target.value)}
          >
            {(field.options ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
    </FieldWrapper>
);

export default DropDownSelectField;
