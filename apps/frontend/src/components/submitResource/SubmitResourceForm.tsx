import { Flex } from '@chakra-ui/react';
import FormSectionBlock from './parts/FormSectionBlock';
import { FieldChangeHandler, FormErrors, FormSection, FormValues } from './types';

interface SubmitResourceFormProps {
  /** The sections to render, in order. */
  sections: FormSection[];
  /** The current value of every field, keyed by field key. */
  values: FormValues;
  /** The current validation error of every field, keyed by field key. */
  errors: FormErrors;
  /** Called when any field's value changes. */
  onChange: FieldChangeHandler;
}

/**
 * The fields of the submission form, grouped by section. 
 * Renders whatever sections it's given; it holds no data or state of its own.
 *
 * @param props - The sections to render, with every field's value and error.
 * @returns The rendered form sections.
 */
const SubmitResourceForm = ({ sections, values, errors, onChange }: SubmitResourceFormProps) => (
  <Flex direction="column" className="submit-resource-sections">
    {sections.map((section) => (
        <FormSectionBlock 
            key={section.id}
            section={section}
            values={values}
            errors={errors}
            onChange={onChange}
        />
      ))}
  </Flex>
);

export default SubmitResourceForm;
