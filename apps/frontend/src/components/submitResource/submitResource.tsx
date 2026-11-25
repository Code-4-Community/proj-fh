import { useNavigate } from "react-router-dom";
import { Category } from "../../types";
import { useState } from "react";
import { FieldDefinition, FormErrors, FormSection, FormValue, FormValues, TextFormat, YesNoUnsureAnswer } from "./types";

// Path for Back button
const MY_RESOURCES_PATH = '/my-resources';

/** Pattern and error message for each TextFormat. Zip code format matches backend rule. */
const TEXT_FORMATS: Record<TextFormat, { pattern: RegExp; message: string }> = {
    zipCode: {
        pattern: /^\d{5}(-\d{4})?$/,
        message: 'Must be a 5-digit or ZIP+4 code.'
    }
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
                {key: 'first_name', label: 'First name ', inputType: 'shortText', 
                    required: true, placeholder: '[value]'},
                {key: 'last_name', label: 'Last name ', inputType: 'shortText',
                    placeholder: '[value]'},
            ],
            // Two DropDownSelect fields side by side.
            [
                {
                    key: 'service_frequency', 
                    label: 'Frequency of services ', 
                    inputType: 'dropDownSelect', 
                    required: true, 
                    placeholder: 'Choose how often',
                    options: [
                        { label: 'Not often', value: 'not_often' },
                        { label: 'On occasion', value: 'on_occasion' },
                        { label: 'Frequently', value: 'frequent' },
                    ],
                },
                {
                    key: 'service_range', 
                    label: 'Range of services ', 
                    inputType: 'dropDownSelect', 
                    required: true, 
                    placeholder: 'Choose the range of services',
                    options: [
                        { label: '1-20', value: 'low' },
                        { label: '20-50', value: 'medium' },
                        { label: '50+', value: 'high' },
                    ],
                },
            ],
        ]
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
    switch(field.inputType) {
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
    switch(field.inputType) {
        case 'multipleSelect':
            return !Array.isArray(value) || value.length === 0;
        case 'imageUpload':
            return value === null;
        case 'yesNoUnsure': {
            // Check each row has an answer.
            const answers = (value ?? {}) as 
                Partial<Record<string, YesNoUnsureAnswer>>;
            return (field.rows ?? []).some((row) => !answers[row.key]) 
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
    const errors : FormErrors = {};
    for (const field of allFields(sections)) {
        const value = values[field.key];

        if (field.required && isEmpty(field, value)) {
            errors[field.key] = 'This field is required';
            continue;
        }

        if (field.format && typeof value == 'string' && value.trim() !== '') {
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
