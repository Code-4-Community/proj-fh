/**
 * Visual style of the modal's confirm button.
 * - `primary`: the standard accent button.
 * - `danger`: for destructive confirmations such as rejecting or removing.
 */
export type ModalConfirmVariant = 'primary' | 'danger';

/**
 * Props shared by every labeled field part. Fields are presentational:
 * the caller owns the value and decides what a change means.
 */
export interface ModalFieldProps {
  /** Text shown above the field. */
  label: string;
  /** Current value of the field. */
  value: string;
  /** Hint shown while the field has no value. */
  placeholder: string;
  /** Called with the new value whenever the user changes the field. */
  onChange: (value: string) => void;
  /** Appends "(required)" to the label. Does not validate; the caller disables confirm. */
  required?: boolean;
}

/**
 * A single choice in a select field.
 */
export interface ModalSelectOption {
  /** Text displayed for the option. */
  label: string;
  /** Value passed to `onChange` when the option is picked. */
  value: string;
}
