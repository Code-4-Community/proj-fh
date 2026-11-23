import { Button, Menu } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { ReviewQueueAddMenuProps } from '../types';

/**
 * A button that opens a menu of links, e.g. the types of resource to add.
 * Chakra's Menu supplies the keyboard support and ARIA roles. The menu is not
 * portaled, so it stays inside the page and picks up reviewQueue.css's variables.
 * `unstyled` leaves styling to reviewQueue.css.
 *
 * @param props - The button label and the menu items.
 * @returns The button and its menu.
 */
const ReviewQueueAddMenu = ({ label, items }: ReviewQueueAddMenuProps) => {
  const navigate = useNavigate();

  return (
    <Menu.Root positioning={{ placement: 'bottom-end' }}>
      <Menu.Trigger asChild>
        <Button unstyled className="review-queue-add-button">
          {label}
        </Button>
      </Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content unstyled className="review-queue-menu">
          {items.map(({ label: itemLabel, path }) => (
            <Menu.Item
              unstyled
              key={path}
              value={path}
              className="review-queue-menu-item"
              onSelect={() => navigate(path)}
            >
              {itemLabel}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
};

export default ReviewQueueAddMenu;
