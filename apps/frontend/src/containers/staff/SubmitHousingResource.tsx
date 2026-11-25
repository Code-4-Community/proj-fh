import { SubmitResource } from '@components/submitResource/SubmitResource';
import { Category } from "../../types";

/**
 * Staff page for submitting a new housing resource.
 * Renders the shared submission form with the housing category.
 *
 * @returns The housing resource submission page.
 */
const SubmitHousingResource = () => (
    <SubmitResource category ={Category.HOUSING_ACCESS} />
);

export default SubmitHousingResource;
