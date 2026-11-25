import type { ReactNode } from 'react';
import { Flex } from '@chakra-ui/react';
import { FieldDefinition } from '../types';

interface FieldWrapperProps {
  /** The field being wrapped; its label, helper text and required flag are shown. */
  field: FieldDefinition;
  /** The field's validation error, shown under the input if present. */
  error?: string;
  /** The input itself. */
  children: ReactNode;
  /**
   * Whether the label points at one input with htmlFor. Groups of inputs (checkboxes, radios,
   * grids) have no single input to point at, so their label is rendered as a legend instead.
   */
  isGroup?: boolean;
}

/**
 * Shared frame around every field: label (with a red asterisk if required),
 * optional helper text, the input, and the error message.
 *
 * @param props - The field to label, its error and its input.
 * @returns The rendered field frame.
 */
const FieldWrapper = ({ field, error, children, isGroup = false }: FieldWrapperProps) => {
  const label = (
    <>
      {field.label}
      {field.required && (
        <span className="submit-resource-required" aria-hidden="true">
          *
        </span>
      )}
    </>
  );

  return (
    <Flex
      as={isGroup ? 'fieldset' : 'div'}
      direction="column"
      className="submit-resource-field"
    >
      {isGroup ? (
        <legend className="submit-resource-label">{label}</legend>
      ) : (
        <label htmlFor={field.key} className="submit-resource-label">
          {label}
        </label>
      )}
      {field.helperText && (
        <p className="submit-resource-helper">{field.helperText}</p>
      )}
      {children}
      {error && (
        <p className="submit-resource-error" role="alert">
          {error}
        </p>
      )}
    </Flex>
  );
};

export default FieldWrapper;