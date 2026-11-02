import { Field, NativeSelect } from '@chakra-ui/react';
import { ReviewQueueFilterSelectProps } from '../types';

/**
 * A labeled dropdown filter. "Select an option" means the filter is off, and
 * picking it again clears the filter. Generic over the value type, so a Category
 * dropdown hands back a Category. The one cast below is safe because every
 * option's value comes from the typed options list. Chakra keeps positioning the
 * chevron; reviewQueue.css sets the visible styles.
 *
 * @param props - The label, current value, options, and change handler.
 * @returns The labeled dropdown.
 */
const ReviewQueueFilterSelect = <T extends string>({
  label,
  value,
  options,
  onChange,
}: ReviewQueueFilterSelectProps<T>) => (
  <Field.Root className="review-queue-filter-field">
    <Field.Label className="review-queue-filter-label">{label}</Field.Label>
    <NativeSelect.Root>
      <NativeSelect.Field
        className={
          value === ''
            ? 'review-queue-select review-queue-select-empty'
            : 'review-queue-select'
        }
        value={value}
        onChange={(event) => onChange(event.target.value as T | '')}
      >
        <option value="" className="review-queue-select-option">
          Select an option
        </option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="review-queue-select-option"
          >
            {option.label}
          </option>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  </Field.Root>
);

export default ReviewQueueFilterSelect;