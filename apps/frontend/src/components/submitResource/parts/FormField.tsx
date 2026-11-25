import { Flex } from '@chakra-ui/react';
import { FieldDefinition, FieldChangeHandler, FormValue, YesNoUnsureAnswer } from '../types';
import ShortTextField from './ShortTextField';

interface FormFieldProps {
  /** The field to render. */
  field: FieldDefinition;
  /** The field's current value. */
  value: FormValue;
  /** The field's validation error, if any. */
  error?: string;
  /** Called when the field's value changes. */
  onChange: FieldChangeHandler;
}

/**
 * Renders the right field component for a field definition, based on its inputType.
 * Each case narrows the value to the type that field holds.
 *
 * @param props - The field definition, its value and error, and the change handler.
 * @returns The rendered field.
 */
const FormField = ({ field, value, error, onChange }: FormFieldProps) => {
    const shared = {field, error, onChange};

    switch(field.inputType) {
        case 'shortText':
          return <ShortTextField {...shared} value={value as string} />;
        case 'longText':
          return <LongTextField {...shared} value={value as string} />;
        case 'imageUpload':
          return <ImageUploadField {...shared} value={value as File | null} />;
        case 'singleSelect':
          return <SingleSelectField {...shared} value={value as string} />;
        case 'multipleSelect':
          return <MultipleSelectField {...shared} value={value as string[]} />;
        case 'dropDownSelect':
          return <DropDownSelectField {...shared} value={value as string} />;
        case 'yesNoUnsure':
          return <YesNoUnsureField {...shared} value={value as Partial<Record<string, YesNoUnsureAnswer>>} />;
    }
};

export default FormField;
