import { Flex, Heading } from '@chakra-ui/react';
import FormField from './FormField';
import { FieldChangeHandler, FormErrors, FieldRow, FormValues } from '../types';

interface FieldRowBlockProps {
  /** One field, or two fields to show side by side. */
  row: FieldRow;
  /** The current value of every field, keyed by field key. */
  values: FormValues;
  /** The current validation error of every field, keyed by field key. */
  errors: FormErrors;
  /** Called when any field's value changes. */
  onChange: FieldChangeHandler;
}

/**
 * One row of the form. A row with two fields shows them side by side, each taking half the width.
 *
 * @param props - The row's fields, with their values and errors.
 * @returns The rendered row.
 */
const FieldRowBlock = ({ row, values, errors, onChange }: FieldRowBlockProps) => (
  <Flex 
    className={
        row.length === 2 
            ? 'submit-resource-row submit-resource-row-split' 
            : 'submit-resource-row'
    }
  >
    {row.map((field) => (
        <FormField 
            key={field.key}
            field={field}
            values={values[field.key]}
            errors={errors[field.key]}
            onChange={onChange}
        />
      ))}
  </Flex>
);

export default FieldRowBlock;