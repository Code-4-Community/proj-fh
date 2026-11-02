import {
  FieldChangeHandler,
  FieldDefinition,
  FormValue,
} from '../types';
import TextField from './TextField';
import TextAreaField from './TextAreaField';
import SelectField from './SelectField';
import CheckboxGroupField from './CheckboxGroupField';

interface FieldRendererProps {
  /** The definition describing which input to render. */
  field: FieldDefinition;
  /** The field's current value, or undefined if the form has none yet. */
  value: FormValue | undefined;
  /** Called with the field key and new value on every change. */
  onChange: FieldChangeHandler;
}

/** Returns the value as a string, or an empty string if it is not one. */
const asString = (value: FormValue | undefined): string =>
  typeof value === 'string' ? value : '';

/** Returns the value as a list, or an empty list if it is not one. */
const asList = (value: FormValue | undefined): string[] =>
  Array.isArray(value) ? value : [];

/**
 * Picks the right field component for a field definition's input type.
 * Missing values fall back to empty, so adding a field needs no other changes.
 *
 * @param props - The field definition, its current value, and the change handler.
 * @returns The matching field component.
 */
const FieldRenderer = ({ field, value, onChange }: FieldRendererProps) => {
  const { key, label, inputType, placeholder, options = [] } = field;

  switch (inputType) {
    case 'textarea':
      return (
        <TextAreaField
          fieldKey={key}
          label={label}
          value={asString(value)}
          onChange={onChange}
          placeholder={placeholder}
        />
      );
    case 'select':
      return (
        <SelectField
          fieldKey={key}
          label={label}
          value={asString(value)}
          options={options}
          onChange={onChange}
          placeholder={placeholder}
        />
      );
    case 'checkboxGroup':
      return (
        <CheckboxGroupField
          fieldKey={key}
          label={label}
          value={asList(value)}
          options={options}
          onChange={onChange}
        />
      );
    default:
      return (
        <TextField
          fieldKey={key}
          label={label}
          value={asString(value)}
          onChange={onChange}
          placeholder={placeholder}
          type={inputType}
        />
      );
  }
};

export default FieldRenderer;
