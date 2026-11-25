import { Box } from '@chakra-ui/react';
import { FormSection } from '../types';

interface TableOfContentsProps {
  /** The sections on the page, listed in the same order. */
  sections: FormSection[];
}

/**
 * List of the form's sections, shown beside the form.
 * Not clickable yet; it lists whatever sections the form actually has, so the two stay in sync.
 *
 * @param props - The sections to list.
 * @returns The rendered table of contents.
 */
const TableOfContents = ({ sections }: TableOfContentsProps) => (
  <Box as="nav" className="submit-resource-toc" aria-label="Form sections">
    <Box as="ul" className="submit-resource-toc-list">
      {sections.map((section) => (
        <Box as="li" key={section.id} className="submit-resource-toc-item">
          {section.title}
        </Box>
      ))}
    </Box>
  </Box>
);

export default TableOfContents;
