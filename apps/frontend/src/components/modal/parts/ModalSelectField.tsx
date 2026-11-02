import { useMemo } from 'react';
import { Field, Select, createListCollection } from '@chakra-ui/react';
import { ModalFieldProps, ModalSelectOption } from '../types';

interface ModalSelectFieldProps extends ModalFieldProps {
  options: ModalSelectOption[];
}

/**
 * A dropdown select with a label above it, for use in a Modal body.
 * The caller owns the selected value ('' means nothing selected) and
 * handles changes. The options list renders inside the modal rather
 * than in a separate portal, so it always stacks above the modal panel.
 * When `required` is set, "(required)" is added to the label.
 *
 * @param props - The label, value, placeholder, options, change handler and optional required flag.
 * @returns The labeled select.
 */
const ModalSelectField = ({
  label,
  value,
  placeholder,
  options,
  onChange,
  required = false,
}: ModalSelectFieldProps) => {
  const collection = useMemo(
    () => createListCollection({ items: options }),
    [options],
  );

  return (
    <Field.Root required={required} className="modal-field">
      <Field.Label className="modal-field-label">
        {label}
        <Field.RequiredIndicator className="modal-field-required">
          (required)
        </Field.RequiredIndicator>
      </Field.Label>
      <Select.Root
        collection={collection}
        value={value ? [value] : []}
        onValueChange={(details) => onChange(details.value[0] ?? '')}
        positioning={{ sameWidth: true }}
        className="modal-select"
      >
        <Select.HiddenSelect />
        <Select.Control>
          <Select.Trigger className="modal-select-trigger">
            <Select.ValueText placeholder={placeholder} />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Select.Positioner>
          <Select.Content className="modal-select-content">
            {collection.items.map((item) => (
              <Select.Item
                key={item.value}
                item={item}
                className="modal-select-item"
              >
                {item.label}
                <Select.ItemIndicator className="modal-select-item-indicator" />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select.Root>
    </Field.Root>
  );
};

export default ModalSelectField;
