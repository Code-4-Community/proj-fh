import { useParams } from 'react-router-dom';

/**
 * Stub page for viewing and editing a single resource.
 *
 * @returns A placeholder showing the resource id from the URL.
 */
const ResourceEdit = () => {
  const { resourceId } = useParams();
  return <h1>Edit Resource {resourceId}</h1>;
};

export default ResourceEdit;