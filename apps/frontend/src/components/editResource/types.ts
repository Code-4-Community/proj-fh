import { ResourceStatus } from '../../types';

/** The kinds of input a field definition can ask for. */
export type FieldInputType =
  | 'text'
  | 'tel'
  | 'email'
  | 'textarea'
  | 'select'
  | 'checkboxGroup';

/** One choice in a select or checkbox group. */
export interface FieldOption {
  
  label: string;
  
  value: string;
}

/**
 * Describes one form field. The form is rendered from a list of these,
 * so adding, removing or reordering fields only means editing the list.
 */
export interface FieldDefinition {
  /** Unique key; the form state, input id and label htmlFor all derive from it. */
  key: string;
  
  label: string;
  
  inputType: FieldInputType;
  
  column: number;
  
  placeholder?: string;

  options?: FieldOption[];
}

/** a field's value: a string, or a list of strings for checkbox groups. */
export type FormValue = string | string[];

/** the whole form's state, keyed by field key. */
export type FormValues = Record<string, FormValue>;

/** called by field components when their value changes. */
export type FieldChangeHandler = (key: string, value: FormValue) => void;

/** appearance variants for the status badge, named by look rather than status. */
export type StatusBadgeVariant =
  | 'filled-dark'
  | 'filled-light'
  | 'filled-muted'
  | 'outlined'
  | 'outlined-dark';

/** which badge variant each ResourceStatus uses. */
export const STATUS_BADGE_VARIANTS: Record<ResourceStatus, StatusBadgeVariant> = {
  [ResourceStatus.PENDING_REVIEW]: 'outlined',
  [ResourceStatus.APPROVED_PUBLISHED]: 'filled-dark',
  [ResourceStatus.NEEDS_CHANGES]: 'filled-light',
  [ResourceStatus.REJECTED]: 'outlined-dark',
  [ResourceStatus.ARCHIVED]: 'filled-muted',
};

/** appearance variants for action buttons. */
export type ActionVariant = 'primary' | 'outline' | 'link';

/** one button: its text, how it looks, and what it does when clicked. */
export interface ActionDefinition {
  label: string;
  variant: ActionVariant;
  onClick: () => void;
}