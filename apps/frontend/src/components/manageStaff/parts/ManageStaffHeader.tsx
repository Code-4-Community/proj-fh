import { Button, Flex, Heading, Text, Stack } from '@chakra-ui/react';
import { ManageStaffHeaderProps } from '../types';


/**
 * Page header: the Staff Management title and subtitle on the left and the
 * Add Staff button on the right. `unstyled` leaves the button's styling to
 * manageStaff.css.
 *
 * @param props - The handler for the Add Staff button.
 * @returns The page header.
 */

const ManageStaffHeader = ({ onAddStaffClick }: ManageStaffHeaderProps) => (
  <Flex justify="space-between" align="center">
    <Stack className="manage-staff-heading">
      <Heading as="h1" className="manage-staff-title">
        Staff Management
      </Heading>
      <Text className="manage-staff-subtitle">Add or remove staff users</Text>
    </Stack>
    <Button
      unstyled
      className="manage-staff-add-button"
      onClick={onAddStaffClick}
    >
        Add Staff
    </Button>
  </Flex>
);

export default ManageStaffHeader;
