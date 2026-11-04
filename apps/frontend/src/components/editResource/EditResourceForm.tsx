import { Flex, Grid } from '@chakra-ui/react';
import ActionButton from './parts/ActionButton';
import FormColumn from './FormColumn';
import {
  ActionDefinition,
  FieldChangeHandler,
  FieldDefinition,
  FormValues,
} from './types';

interface EditResourceFormProps {
  /** Every field in the form, in display order. */
  fields: FieldDefinition[];
  /** The form's current values, keyed by field key. */
  values: FormValues;
  /** Called with the field key and new value on every change. */
  onChange: FieldChangeHandler;
  /** Buttons shown under the fields, such as Save and Cancel. */
  actions: ActionDefinition[];
}

/**
 * The form: fields grouped into columns by their column value, with action buttons below.
 * Columns are derived from the field list, so the layout needs no changes when fields change.
 *
 * @param props - The field list, form values, change handler, and bottom action buttons.
 * @returns The form.
 */
const EditResourceForm = ({
  fields,
  values,
  onChange,
  actions,
}: EditResourceFormProps) => {
  const columns = [...new Set(fields.map((field) => field.column))].sort(
    (a, b) => a - b,
  );

  return (
    <Flex
      as="form"
      direction="column"
      className="edit-resource-form"
      onSubmit={(event) => event.preventDefault()}
    >
      <Grid className="edit-resource-form-columns">
        {columns.map((column) => (
          <FormColumn
            key={column}
            fields={fields.filter((field) => field.column === column)}
            values={values}
            onChange={onChange}
          />
        ))}
      </Grid>
      <Flex className="edit-resource-form-actions">
        {actions.map((action) => (
          <ActionButton key={action.label} {...action} />
        ))}
      </Flex>
    </Flex>
  );
};

export default EditResourceForm;