import { Stack } from '@chakra-ui/react';
import FieldRenderer from './parts/FieldRenderer';
import { FieldChangeHandler, FieldDefinition, FormValues } from './types';

interface FormColumnProps {
  /** The fields to show in this column, in order. */
  fields: FieldDefinition[];
  /** The whole form's current values, keyed by field key. */
  values: FormValues;
  /** Called with the field key and new value on every change. */
  onChange: FieldChangeHandler;
}

/**
 * One generic column of form fields. It doesn't know which fields it holds;
 * the parent decides placement using each definition's column value.
 *
 * @param props - The fields to render, the form values, and the change handler.
 * @returns A vertical stack of fields.
 */
const FormColumn = ({ fields, values, onChange }: FormColumnProps) => (
  <Stack className="edit-resource-column">
    {fields.map((field) => (
      <FieldRenderer
        key={field.key}
        field={field}
        value={values[field.key]}
        onChange={onChange}
      />
    ))}
  </Stack>
);

export default FormColumn;