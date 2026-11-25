/** The kinds of fields the submission form can render. */
export type FieldInputType =
  | 'shortText'
  | 'longText'
  | 'imageUpload'
  | 'singleSelect'
  | 'multipleSelect'
  | 'dropDownSelect'
  | 'yesNoUnsure';

/** One choice in a dropdown, single-select or multiple-select field. */
export interface FieldOption {
  /** Text shown for the option. */
  label: string;
  /** Saved as the field's answer when this option is picked. */
  value: string;
}

/** An answer in a YesNoUnsure grid. */
export type YesNoUnsureAnswer = 'yes' | 'no' | 'unsure';

/** A question in a YesNoUnsure grid, e.g. Near public transportation. 
 * Each row gets its own yes, no, unsure answer.
*/
export interface YesNoUnsureRow {
    /** Name the question is saved under, e.g. near_public_transportation */
    key: string;
    /** Text displayed on page at start of row, e.g. Near public transportation */
    label: string;
}

/** Extra formatting verification a shortText field can enforce on submit. */
export type TextFormat = 'zipCode';

/**
 * Describes one form field. The form is rendered from a list of these,
 * so adding, removing or reordering fields only means editing the list.
 */
export interface FieldDefinition {
    /** Unique key; the form state, input id and label htmlFor all derive from it. */
    key: string;
    label: string;
    inputType: FieldInputType;
    /** whether field must be filled in before submitting. displays red asterisk after label if true. */
    required?: boolean;
    /** helper text shown under the label, e.g. 'Select all that apply'. */
    helperText?: string;
    placeholder?: string;
    /** for shortText fields: a format the value must match, e.g. 'zipCode'. */
    format?: TextFormat;
    /** for dropDownSelect, singleSelect, and multipleSelect fields. */
    options?: FieldOption[];
    /** for yesNoUnsure fields: the questions, one per row. */
    rows?: YesNoUnsureRow[];
    /** for imageUpload fields: allowed file types, e.g. ['image/png', 'image/jpeg'] */
    acceptedTypes?: string[];
    /** for imageUpload fields: largest allowed file size in bytes. */
    maxSizeBytes?: number;
}

/**
 * One row of the form: a single field, or two fields shown side by side.
 */
export type FieldRow = [FieldDefinition] | [FieldDefinition, FieldDefinition];  

/** A section of the form: the table of contents entry, title heading, and its rows of fields. */
export interface FormSection {
    /** Used as the section's HTML id, so the table of contents can link to it later. */
    id: string;
    title: string;
    rows: FieldRow[];
}

/**
 * A field's value: text for text and select fields, a list for multiple selects,
 * a file (or null) for image uploads, and one answer per row for YesNoUnsure grids.
*/
export type FormValue = 
  | string 
  | string[]
  | File
  | null
  | Partial<Record<string, YesNoUnsureAnswer>>;

/** the whole form's state, keyed by field key. */
export type FormValues = Record<string, FormValue>;

/** the whole form's validation errors, keyed by field key. Fields with no errors are missing. */
export type FormError = Partial<Record<string, string>>;

/** called by field components when their value changes. */
export type FieldChangeHandler = (key: string, value: FormValue) => void;