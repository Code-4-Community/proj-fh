import { Box, Button, Flex } from '@chakra-ui/react';
import { FieldComponentProps } from '../types';
import FieldWrapper from './FieldWrapper';
import { useRef, useState, type DragEvent } from 'react';

/** Turns MIME types into the extensions shown to users, e.g. 'image/jpeg' → '.jpg'. */
const formatTypes = (types: string[]) => 
    types.map((type) => `.${type.split('/')[1].replace('jpeg', 'jpg')}`).join(', ');

/** Turns a byte count into a short size for messages, e.g. 5242880 → "5MB". */
const formatSize = (bytes: number) => 
    `${Math.round(bytes / (1024 * 1024))}MB`;

/*
 * Drag-and-drop zone for one image, e.g. for "Photo". Clicking the zone opens the file picker.
 * Files with the wrong type or over the size limit are rejected with a message instead of being stored.
 *
 * @param props - The field to render, the chosen file and error, and the change handler.
 * @returns The rendered image upload field.
 */
const ImageUploadField = ({ field, value, error, onChange }: FieldComponentProps<File | null>) => {
    const inputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string>();
  const [isDragging, setIsDragging] = useState(false);

  const acceptedTypes = field.acceptedTypes ?? [];
  const maxSizeBytes = field.maxSizeBytes ?? Infinity;

  // Stores the file if it's allowed; otherwise explains why and keeps the previous file.
  const selectFile = (file: File | undefined) => {
    if (!file) return;
    if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
      setFileError(`Only ${formatTypes(acceptedTypes)} files are allowed.`);
      return;
    }
    if (file.size > maxSizeBytes) {
      setFileError(`Files must be ${formatSize(maxSizeBytes)} or smaller.`);
      return;
    }
    setFileError(undefined);
    onChange(field.key, file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
  };

  return (
    <FieldWrapper field={field} error={fileError ?? error}>
      <input
        ref={inputRef}
        id={field.key}
        name={field.key}
        type="file"
        accept={acceptedTypes.join(',')}
        className="submit-resource-visually-hidden"
        onChange={(event) => {
          selectFile(event.target.files?.[0]);
          // Clears the input so choosing the same file again still triggers a change.
          event.target.value = '';
        }}
      />
      <Flex
        direction="column"
        align="center"
        justify="center"
        role="button"
        tabIndex={0}
        className={
          isDragging
            ? 'submit-resource-dropzone submit-resource-dropzone-active'
            : 'submit-resource-dropzone'
        }
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <span className="submit-resource-dropzone-icon" aria-hidden="true">
          ⇪
        </span>
        <Box className="submit-resource-dropzone-text">Drag and drop here to upload</Box>
        <Box className="submit-resource-dropzone-hint">
          {formatTypes(acceptedTypes)} up to {formatSize(maxSizeBytes)}
        </Box>
      </Flex>

      {value && (
        <Flex align="center" className="submit-resource-file">
          <span className="submit-resource-file-name">{value.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(field.key, null)}
          >
            Remove
          </Button>
        </Flex>
      )}
    </FieldWrapper>
  );
};

export default ImageUploadField;
