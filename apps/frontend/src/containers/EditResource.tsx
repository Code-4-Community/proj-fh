import { useState } from 'react';
import { Flex, Grid } from '@chakra-ui/react';
import EditResourceForm from '@components/editResource/EditResourceForm';
import EditResourceHeader from '@components/editResource/EditResourceHeader';
import StatusPanel from '@components/editResource/StatusPanel';
import {
  ActionDefinition,
  FieldChangeHandler,
  FieldDefinition,
  FieldOption,
  FormValues,
} from '@components/editResource/types';
import '@components/editResource/editResource.css';
import { Category, CATEGORY_LABELS, ResourceStatus } from '../types';

/** Category choices, built from the Category enum and its display labels. */
const CATEGORY_OPTIONS: FieldOption[] = Object.values(Category).map(
  (value) => ({ label: CATEGORY_LABELS[value], value }),
);

// TODO: Replace with variable in the future
const LANGUAGE_OPTIONS: FieldOption[] = [
  { label: 'English', value: 'english' },
  { label: 'Spanish', value: 'spanish' },
  { label: 'Other', value: 'other' },
];

// TODO: Replace with variable in the future
const FIELDS: FieldDefinition[] = [
  { key: 'organizationName', label: 'Organization Name', inputType: 'text', column: 1, placeholder: '[value]' },
  { key: 'programName', label: 'Program Name', inputType: 'text', column: 1, placeholder: '[value]' },
  { key: 'category', label: 'Category', inputType: 'select', column: 1, placeholder: 'Select an option', options: CATEGORY_OPTIONS },
  { key: 'description', label: 'Description', inputType: 'textarea', column: 1, placeholder: '[1 sentence description]' },
  { key: 'address', label: 'Address', inputType: 'text', column: 1, placeholder: '[value]' },
  { key: 'phone', label: 'Phone', inputType: 'tel', column: 2, placeholder: '[value]' },
  { key: 'email', label: 'Email', inputType: 'email', column: 2, placeholder: '[value]' },
  { key: 'website', label: 'Website', inputType: 'text', column: 2, placeholder: '[value]' },
  { key: 'eligibilityInfo', label: 'Eligibility Info', inputType: 'text', column: 2, placeholder: '[value]' },
  { key: 'languages', label: 'Languages', inputType: 'checkboxGroup', column: 2, options: LANGUAGE_OPTIONS },
];

// TODO: Replace with variable in the future
const INITIAL_VALUES: FormValues = {
  languages: ['english', 'spanish'],
};

// TODO: Replace with variable in the future
const RESOURCE_NAME = 'Resource Name';

// TODO: Replace with variable in the future
const RESOURCE_STATUS = ResourceStatus.APPROVED_PUBLISHED;

/**
 * Page for viewing and editing a single resource. For now all data is hardcoded
 * and nothing is saved. This component owns the form state and passes everything
 * else down as props.
 *
 * @returns The Edit Resource page.
 */
const EditResource = () => {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);

  /** Single change handler for every field, keyed by field key. */
  const handleChange: FieldChangeHandler = (key, value) =>
    setValues((previous) => ({ ...previous, [key]: value }));

  const handleBack = () => {
    // TODO: implement in the future
  };
  const handleSave = () => {
    // TODO: implement in the future
  };
  const handleCancel = () => {
    // TODO: implement in the future
  };
  const handleReverify = () => {
    // TODO: implement in the future
  };
  const handleArchive = () => {
    // TODO: implement in the future
  };
  const handleDelete = () => {
    // TODO: implement in the future
  };

  // TODO: Replace with variable in the future
  const backAction: ActionDefinition = {
    label: '< Back',
    variant: 'link',
    onClick: handleBack,
  };

  // TODO: Replace with variable in the future
  const formActions: ActionDefinition[] = [
    { label: 'Save Changes', variant: 'primary', onClick: handleSave },
    { label: 'Cancel', variant: 'outline', onClick: handleCancel },
  ];

  // TODO: Replace with variable in the future
  const statusActions: ActionDefinition[] = [
    { label: 'Re-verify', variant: 'outline', onClick: handleReverify },
    { label: 'Archive Resource', variant: 'outline', onClick: handleArchive },
    { label: 'Delete Resource', variant: 'outline', onClick: handleDelete },
  ];

  return (
    <Flex className="edit-resource-page">
      <EditResourceHeader
        title="Edit Resource"
        subtitle={RESOURCE_NAME}
        backAction={backAction}
      />
      <Grid className="edit-resource-layout">
        <EditResourceForm
          fields={FIELDS}
          values={values}
          onChange={handleChange}
          actions={formActions}
        />
        <StatusPanel status={RESOURCE_STATUS} actions={statusActions} />
      </Grid>
    </Flex>
  );
};

export default EditResource;