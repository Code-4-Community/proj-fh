import { RadioGroup } from '@chakra-ui/react';
import { FieldComponentProps } from '../types';
import FieldWrapper from './FieldWrapper';

/**
 * List of radio options where exactly one can be picked,
 * e.g. "Would you feel comfortable referring Fenway Health patients here?"
 *
 * @param props - The field to render, the chosen option's value and error, and the change handler.
 * @returns The rendered single select field.
 */
const SingleSelectField = ({ field, value, error, onChange }: FieldComponentProps<string>) => (
    <FieldWrapper field={field} error={error} isGroup>
        <RadioGroup.Root
          name={field.key}
          className="submit-resource-radio-group"
          value={value}
          onValueChange={(details) => onChange(field.key, details.value ?? '')}
        >
          {(field.options ?? []).map((option) => (
            <RadioGroup.Item
                key={option.value}
                value={option.value}
                className="submit-resource-radio-option"
            >
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemIndicator />
              <RadioGroup.ItemText>{option.label}</RadioGroup.ItemText>
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root> 
    </FieldWrapper>
);

export default SingleSelectField;
