import { Textarea } from '@chakra-ui/react';
import { FieldComponentProps } from '../types';
import FieldWrapper from './FieldWrapper';

/**
 * Multi-line text input that grows downward as user types, e.g. for "Description".
 *
 * @param props - The field to render, its text and error, and the change handler.
 * @returns The rendered long text field.
 */
const LongTextField = ({ field, value, error, onChange }: FieldComponentProps<string>) => (
    <FieldWrapper field={field} error={error}>
        <Textarea
          id={field.key}
          name={field.key}
          className="submit-resource-textarea"
          value={value}
          placeholder={field.placeholder}
          autoresize
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
    </FieldWrapper>
);

export default LongTextField;
