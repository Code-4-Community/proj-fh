import { Flex, RadioGroup } from "@chakra-ui/react";
import { FieldComponentProps, YesNoUnsureAnswer } from "../types";
import FieldWrapper from "./FieldWrapper";

/** The answer columns, in the order they're shown. */
const ANSWERS: { value: YesNoUnsureAnswer; label: string }[] = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
    { value: 'unsure', label: 'Unsure' },
];

/**
 * Grid of questions, each answered Yes, No or Unsure, e.g. "What did you observe?"
 * Each row is its own radio group, so every question gets its own answer.
 *
 * @param props - The field to render, each row's answer and the error, and the change handler.
 * @returns The rendered Yes/No/Unsure grid.
 */
const YesNoUnsureField = ({ field, value, error, onChange }: FieldComponentProps<Partial<Record<string, YesNoUnsureAnswer>>>) => (
    <FieldWrapper field={field} error={error} isGroup>
        <Flex direction="column" className="submit-resource-grid">
            <Flex className="submit-resource-grid-row" aria-hidden="true">
              <span className="submit-resource-grid-question"/>
                 {ANSWERS.map((answer) => (
                    <span key={answer.value} className="submit-resource-grid-heading">
                        {answer.label}
                    </span>
                 ))}
            </Flex>

            
            {(field.rows ?? []).map((row) => (
                <RadioGroup.Root
                    key={row.key}
                    name={`${field.key}-${row.key}`}
                    value={value[row.key] ?? ''}
                    aria-label={row.label}
                    onValueChange={(details) => onChange(field.key, { ...value, 
                        [row.key]: details.value as YesNoUnsureAnswer })}
                >

                <Flex align="center" className="submit-resource-grid-row">
                    <span className="submit-resource-grid-question">{row.label}</span>
                    {ANSWERS.map((answer) => (
                      <RadioGroup.Item
                        key={answer.value}
                        value={answer.value}
                        className="submit-resource-grid-cell"
                      >
                        <RadioGroup.ItemHiddenInput />
                        <RadioGroup.ItemIndicator />
                        {/* Visible only to screen readers; sighted users read the column heading. */}
                        <RadioGroup.ItemText className="submit-resource-visually-hidden">
                          {answer.label}
                        </RadioGroup.ItemText>
                      </RadioGroup.Item>
                    ))}
                </Flex>
              </RadioGroup.Root>
            ))}
        </Flex> 
    </FieldWrapper>
);

export default YesNoUnsureField;