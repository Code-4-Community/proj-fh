import { Flex, Heading } from '@chakra-ui/react';
import FieldRowBlock from './FieldRowBlock';
import { FieldChangeHandler, FormErrors, FormSection, FormValues } from '../types';

interface FormSectionBlockProps {
  /** The section to render. */
  section: FormSection;
  /** The current value of every field, keyed by field key. */
  values: FormValues;
  /** The current validation error of every field, keyed by field key. */
  errors: FormErrors;
  /** Called when any field's value changes. */
  onChange: FieldChangeHandler;
}

/**
 * One section of the form: a heading followed by its rows of fields.
 * The section's id is used as the element's id, so the table of contents can link to it later.
 *
 * @param props - The section to render, with every field's value and error.
 * @returns The rendered section.
 */
const FormSectionBlock = ({ section, values, errors, onChange }: FormSectionBlockProps) => (
  <Flex 
    as="section" 
    id={section.id}
    direction="column" 
    className="submit-resource-section"
  >
    <Heading as="h2" className="submit-resource-section-title">
      {section.title}
    </Heading>
    {section.rows.map((row) => (
        <FieldRowBlock 
            key={row.map((field) => field.key).join('-')}
            row={row}
            values={values}
            errors={errors}
            onChange={onChange}
        />
      ))}
  </Flex>
);

export default FormSectionBlock;
