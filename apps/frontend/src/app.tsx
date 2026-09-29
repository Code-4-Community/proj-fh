import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import Root from '@containers/root';
import NotFound from '@containers/404';
import Test from '@containers/test';
import Success from '@containers/success';

/**
 * The main application component that sets up the router and provides it to the React application.
 * This component uses React Router to define the application's routes and their corresponding components.
 * 
 * Root route: Renders the main application container (Root component). This is necessary but the components may change
 * Test route: Temporary test component that comes from Scaffolding
 * Success route: Temporary route that displays a success page, right now configured specifically for success in signing in.
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <NotFound />,
  },
  {
    path: '/test',
    element: <Test />,
  },
  {
    path: '/success',
    element: <Success />,
  },
]);

/**
 * The App component is responsible for initializing the router and providing it to the rest of the application.
 * This component is the entry point of the React application and ensures that the routing is properly configured.
 * 
 * @returns The main application component that provides the router to the React application.
 */
export const App: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default App;
