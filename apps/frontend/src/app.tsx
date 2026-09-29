import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import Root from '@containers/root';
import NotFound from '@containers/404';
import Test from '@containers/test';
import Success from '@containers/success';

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

export const App: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default App;
