import { Checkbox, CheckboxGroup, Flex } from '@chakra-ui/react';
import { FieldComponentProps } from '../types';
import FieldWrapper from './FieldWrapper';

/**
 * Checkboxes where any number of options can be picked, e.g. for "Required documentation".
 *
 * @param props - The field to render, the chosen options' values and error, and the change handler.
 * @returns The rendered multiple select field.
 */
const MultipleSelectField = ({ field, value, error, onChange }: FieldComponentProps<string[]>) => (
    <FieldWrapper field={field} error={error} isGroup>
        <CheckboxGroup
          name={field.key}
          value={value}
          onValueChange={(selected) => onChange(field.key, selected)}
        >
          <Flex wrap="wrap" className="submit-resource-checkbox-group">
            {(field.options ?? []).map((option) => (
              <Checkbox.Root
                  key={option.value}
                  value={option.value}
                  className="submit-resource-checkbox-option"
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label>{option.label}</Checkbox.Label>
              </Checkbox.Root>
            ))}
          </Flex>
        </CheckboxGroup> 
    </FieldWrapper>
);

export default MultipleSelectField;
