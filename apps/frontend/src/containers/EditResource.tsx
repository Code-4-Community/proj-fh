import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Flex, Grid } from '@chakra-ui/react';
import EditResourceForm from '@components/editResource/EditResourceForm';
import EditResourceHeader from '@components/editResource/EditResourceHeader';
import NeedsChangesNotes from '@components/editResource/NeedsChangesNotes';
import StatusPanel from '@components/editResource/StatusPanel';
import { getEditResourceRoleConfig } from '@components/editResource/roleConfig';
import {
  ActionDefinition,
  FieldChangeHandler,
  FieldDefinition,
  FieldOption,
  FormValues,
} from '@components/editResource/types';
import '@components/editResource/editResource.css';
import { Category, CATEGORY_LABELS, Status } from '../types';
import { useAuth } from '../auth/AuthProvider';
import { findStaffResource } from './staff/staffResources';

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
  { key: 'languages', label: 'Languages', inputType: 'checkboxGroup', column: 2, options: LANGUAGE_OPTIONS, otherInput: { optionValue: 'other', key: 'otherLanguage', label: 'Other language', placeholder: 'Specify language' } },
];

// TODO: Replace with variable in the future
const INITIAL_VALUES: FormValues = {
  languages: ['english', 'spanish'],
};

// TODO: Replace with variable in the future
const RESOURCE_NAME = 'Resource Name';

// TODO: Replace with variable in the future
const NOT_FOUND_MESSAGE = "We couldn't find that resource.";

/**
 * Page for viewing and editing a single resource. For now all data is hardcoded
 * and nothing is saved. This component owns the form state and passes everything
 * else down as props. The user's role decides which status actions, notes and Back
 * target the page gets, and whether the resource is looked up by the route's
 * resourceId (staff) or is the fixed placeholder (admin).
 *
 * @returns The Edit Resource page.
 */
const EditResourceContent = () => {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleConfig = getEditResourceRoleConfig(user?.status ?? Status.ANONYMOUS);
  const staffResource = roleConfig.usesStaffResources
    ? findStaffResource(resourceId)
    : undefined;

  const [values, setValues] = useState<FormValues>(() =>
    staffResource
      ? {
          ...INITIAL_VALUES,
          organizationName: staffResource.organizationName,
          programName: staffResource.programName,
          category: staffResource.category,
        }
      : INITIAL_VALUES,
  );

  /** Single change handler for every field, keyed by field key. */
  const handleChange: FieldChangeHandler = (key, value) =>
    setValues((previous) => ({ ...previous, [key]: value }));

  const handleBack = () => {
    if (roleConfig.backPath) navigate(roleConfig.backPath);
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
  const statusActions: ActionDefinition[] = roleConfig.showStatusActions
    ? [
        { label: 'Re-verify', variant: 'outline', onClick: handleReverify },
        { label: 'Archive Resource', variant: 'outline', onClick: handleArchive },
        { label: 'Delete Resource', variant: 'outline', onClick: handleDelete },
      ]
    : [];

  if (roleConfig.usesStaffResources && !staffResource) {
    return (
      <Flex className="edit-resource-page">
        <EditResourceHeader
          title="Resource Not Found"
          subtitle={NOT_FOUND_MESSAGE}
          backAction={backAction}
        />
      </Flex>
    );
  }

  return (
    <Flex className="edit-resource-page">
      <EditResourceHeader
        title="Edit Resource"
        subtitle={
          staffResource
            ? `${staffResource.organizationName} — ${staffResource.programName}`
            : RESOURCE_NAME
        }
        backAction={backAction}
      />
      <Grid className="edit-resource-layout">
        <EditResourceForm
          fields={FIELDS}
          values={values}
          onChange={handleChange}
          actions={formActions}
        />
        <StatusPanel
          status={staffResource?.status ?? roleConfig.placeholderStatus}
          actions={statusActions}
        >
          {roleConfig.showNeedsChangesNotes && (
            <NeedsChangesNotes notes={staffResource?.notes ?? ''} />
          )}
        </StatusPanel>
      </Grid>
    </Flex>
  );
};

/**
 * Mounts the page keyed by the route's resourceId, so the form state starts over
 * (and is prefilled again) when the id changes without leaving the route.
 *
 * @returns The Edit Resource page for the current resourceId.
 */
const EditResource = () => {
  const { resourceId } = useParams();
  return <EditResourceContent key={resourceId} />;
};

export default EditResource;