import { Input } from '@chakra-ui/react';
import { FieldComponentProps } from '../types';
import FieldWrapper from './FieldWrapper';

/**
 * Single-line text input, e.g. for "Organization Name".
 * Fields with a format (like zip codes) look the same; their format is checked on submit.
 *
 * @param props - The field to render, its text and error, and the change handler.
 * @returns The rendered short text field.
 */
const ShortTextField = ({ field, value, error, onChange }: FieldComponentProps<string>) => (
    <FieldWrapper field={field} error={error}>
        <Input
          id={field.key}
          name={field.key}
          className="submit-resource-input"
          value={value}
          placeholder={field.placeholder}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
    </FieldWrapper>
);

export default ShortTextField;
