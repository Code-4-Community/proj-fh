import { Flex, Heading, Text } from '@chakra-ui/react';
import { ReviewQueueHeaderProps } from '../types';

/**
 * Page header: the title with the subtitle beneath it.
 *
 * @param props - The title and subtitle text.
 * @returns The page header.
 */
const ReviewQueueHeader = ({ title, subtitle }: ReviewQueueHeaderProps) => (
  <Flex direction="column" className="review-queue-heading">
    <Heading as="h1" className="review-queue-title">
      {title}
    </Heading>
    <Text className="review-queue-subtitle">{subtitle}</Text>
  </Flex>
);

export default ReviewQueueHeader;