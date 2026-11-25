import { useNavigate } from 'react-router-dom';
import { Category } from '../../types';
import { type FormEvent, useState } from 'react';
import {
  FieldChangeHandler,
  FieldDefinition,
  FormErrors,
  FormSection,
  FormValue,
  FormValues,
  TextFormat,
  YesNoUnsureAnswer,
} from './types';
import { Button, Flex, Heading } from '@chakra-ui/react';
import BackButton from './parts/BackButton';
import TableOfContents from './parts/TableOfContents';
import SubmitResourceForm from './SubmitResourceForm';
import './submitResource.css';

// TODO: Replace with variable in the future
const MY_RESOURCES_PATH = '/my-resources';

/** Pattern and error message for each TextFormat. Zip code format matches backend rule. */
const TEXT_FORMATS: Record<TextFormat, { pattern: RegExp; message: string }> = {
  zipCode: {
    pattern: /^\d{5}(-\d{4})?$/,
    message: 'Must be a 5-digit or ZIP+4 code.',
  },
};

/**
 * Builds one example of every field type, so the components can be reviewed together.
 * Keys are suffixed so the required and not-required copies don't collide.
 */
const exampleFields = (required: boolean): FieldDefinition[] => {
  const suffix = required ? 'required' : 'optional';
  return [
    {
      // TODO: Replace with variable in the future
      key: `organization_name_${suffix}`,
      label: 'Organization Name',
      inputType: 'shortText',
      placeholder: '[value]',
      required,
    },
    {
      // TODO: Replace with variable in the future
      key: `zip_code_${suffix}`,
      label: 'Zip code',
      inputType: 'shortText',
      format: 'zipCode',
      placeholder: '[value]',
      required,
    },
    {
      // TODO: Replace with variable in the future
      key: `description_${suffix}`,
      label: 'Description of the Program',
      inputType: 'longText',
      placeholder: 'Hello',
      required,
    },
    {
      // TODO: Replace with variable in the future
      key: `photo_${suffix}`,
      label: 'Photo',
      inputType: 'imageUpload',
      acceptedTypes: ['image/png', 'image/jpeg'],
      maxSizeBytes: 5 * 1024 * 1024,
      required,
    },
    {
      // TODO: Replace with variable in the future
      key: `required_documentation_${suffix}`,
      label: 'Required documentation',
      inputType: 'multipleSelect',
      helperText: 'Select all that apply.',
      options: [
        { label: 'Government-issued ID', value: 'government_id' },
        { label: 'Proof of address', value: 'proof_of_address' },
        { label: 'Proof of income', value: 'proof_of_income' },
        { label: 'Insurance information', value: 'insurance_information' },
        { label: 'Social Security number', value: 'social_security_number' },
        {
          label: 'Immigration documentation',
          value: 'immigration_documentation',
        },
        { label: 'Referral form', value: 'referral_form' },
        { label: 'No documentation required', value: 'none' },
        { label: 'Other', value: 'other' },
      ],
      required,
    },
    {
      // TODO: Replace with variable in the future
      key: `frequency_of_services_${suffix}`,
      label: 'Frequency of services',
      inputType: 'dropDownSelect',
      placeholder: 'Choose how often',
      options: [
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
      ],
      required,
    },
    {
      // TODO: Replace with variable in the future
      key: `referral_comfort_${suffix}`,
      label:
        'Would you feel comfortable referring Fenway Health patients here?',
      inputType: 'singleSelect',
      options: [
        { label: 'Yes – strongly recommend', value: 'strongly_recommend' },
        {
          label: 'Yes – recommend with minor concerns',
          value: 'recommend_with_concerns',
        },
        { label: 'Recommend with caution', value: 'recommend_with_caution' },
        { label: 'No – not recommended currently', value: 'not_recommended' },
        { label: 'Needs additional review', value: 'needs_review' },
      ],
      required,
    },
    {
      // TODO: Replace with variable in the future
      key: `observations_${suffix}`,
      label: 'What did you observe?',
      inputType: 'yesNoUnsure',
      rows: [
        {
          key: 'near_public_transportation',
          label: 'Near public transportation',
        },
        { key: 'ada_accessible', label: 'ADA accessible' },
      ],
      required,
    },
  ];
};

// TODO: Replace with variable in the future
const SECTIONS: FormSection[] = [
  {
    id: 'not-required',
    title: 'Not Required',
    rows: [
      ...exampleFields(false).map((field): [FieldDefinition] => [field]),
      // Two shortText fields side by side.
      [
        // TODO: Replace with variable in the future
        {
          key: 'first_name',
          label: 'First name ',
          inputType: 'shortText',
          placeholder: '[value]',
        },
        // TODO: Replace with variable in the future
        {
          key: 'last_name',
          label: 'Last name ',
          inputType: 'shortText',
          placeholder: '[value]',
        },
      ],
      // Two DropDownSelect fields side by side.
      [
        // TODO: Replace with variable in the future
        {
          key: 'service_frequency',
          label: 'Frequency of services ',
          inputType: 'dropDownSelect',
          placeholder: 'Choose how often',
          options: [
            { label: 'Not often', value: 'not_often' },
            { label: 'On occasion', value: 'on_occasion' },
            { label: 'Frequently', value: 'frequent' },
          ],
        },
        // TODO: Replace with variable in the future
        {
          key: 'service_range',
          label: 'Range of services ',
          inputType: 'dropDownSelect',
          placeholder: 'Choose the range of services',
          options: [
            { label: '1-20', value: 'low' },
            { label: '20-50', value: 'medium' },
            { label: '50+', value: 'high' },
          ],
        },
      ],
    ],
  },
  {
    id: 'required',
    title: 'Required',
    rows: exampleFields(true).map((field): [FieldDefinition] => [field]),
  },
];

/** The starting value for each kind of field:
 *  empty text, no choices, no file, no grid answers. */
const emptyValueFor = (field: FieldDefinition): FormValue => {
  switch (field.inputType) {
    case 'multipleSelect':
      return [];
    case 'imageUpload':
      return null;
    case 'yesNoUnsure':
      return {};
    default:
      return '';
  }
};

/** Every field on the page, in order. */
const allFields = (sections: FormSection[]): FieldDefinition[] =>
  sections.flatMap((section) => section.rows.flat());

/** Whether a field has no answer yet. Whitespace-only text counts as empty. */
const isEmpty = (field: FieldDefinition, value: FormValue): boolean => {
  switch (field.inputType) {
    case 'multipleSelect':
      return !Array.isArray(value) || value.length === 0;
    case 'imageUpload':
      return value === null;
    case 'yesNoUnsure': {
      // Check each row has an answer.
      const answers = (value ?? {}) as Partial<
        Record<string, YesNoUnsureAnswer>
      >;
      return (field.rows ?? []).some((row) => !answers[row.key]);
    }
    default:
      return typeof value !== 'string' || value.trim() === '';
  }
};

/**
 * Checks every field and returns an error for each that fails:
 * required fields must be filled in, and text must match any indicated format.
 */
const validate = (sections: FormSection[], values: FormValues): FormErrors => {
  const errors: FormErrors = {};
  for (const field of allFields(sections)) {
    const value = values[field.key];

    if (field.required && isEmpty(field, value)) {
      errors[field.key] = 'This field is required';
      continue;
    }

    if (field.format && typeof value === 'string' && value.trim() !== '') {
      const { pattern, message } = TEXT_FORMATS[field.format];
      if (!pattern.test(value.trim())) {
        errors[field.key] = message;
      }
    }
  }

  return errors;
};

interface SubmitResourceProps {
  /** The kind of resource being submitted.
   * For now, only decides the page title. */
  category: Category.FOOD_ACCESS | Category.HOUSING;
}

/**
 * Resource submission page: back button, title, table of contents and the form.
 * Holds the form's values and errors, validates on submit and passes everything else down as props.
 * All the sections and fields are hardcoded for now, so every field type can be reviewed on one page.
 *
 * @param props - The category of resource being submitted.
 * @returns The rendered submission page.
 */
const SubmitResource = ({ category }: SubmitResourceProps) => {
  const navigate = useNavigate();
  const [values, setValues] = useState<FormValues>(() =>
    Object.fromEntries(
      allFields(SECTIONS).map((field) => [field.key, emptyValueFor(field)]),
    ),
  );
  const [errors, setErrors] = useState<FormErrors>({});

  const title = `${category === Category.FOOD_ACCESS ? 'Food' : 'Housing'} Resource Submission Form`;

  // Updates one field's value and clears error so it disappears as soon as user fixes it.
  const handleChange: FieldChangeHandler = (key, value) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  // Stubbed: validates then logs values instead of sending to backend
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const newErrors = validate(SECTIONS, values);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    // TODO: Send the submission to the backend.
    console.log('Submitting resource', values);
  };

  return (
    <Flex className="submit-resource">
      <Flex direction="column" className="submit-resource-sidebar">
        <BackButton label="Back" to={MY_RESOURCES_PATH} />
        <TableOfContents sections={SECTIONS} />
      </Flex>

      <Flex direction="column" className="submit-resource-main">
        <Heading as="h1" className="submit-resource-title">
          {title}
        </Heading>

        <Flex asChild direction="column" className="submit-resource-form">
          <form onSubmit={handleSubmit} noValidate>
            <SubmitResourceForm
              sections={SECTIONS}
              values={values}
              errors={errors}
              onChange={handleChange}
            />

            <Flex justify="flex-end" className="submit-resource-actions">
              <Button
                type="button"
                variant="outline"
                className="submit-resource-cancel"
                onClick={() => navigate(MY_RESOURCES_PATH)}
              >
                Cancel
              </Button>
              <Button type="submit" className="submit-resource-submit">
                Submit
              </Button>
            </Flex>
          </form>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default SubmitResource;
