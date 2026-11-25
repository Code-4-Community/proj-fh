import { SubmitResource } from '@components/submitResource/SubmitResource';
import { Category } from "../../types";

/**
 * Staff page for submitting a new food resource.
 * Renders the shared submission form with the food category.
 *
 * @returns The food resource submission page.
 */
const SubmitFoodResource = () => (
    <SubmitResource category ={Category.FOOD_ACCESS} />
);

export default SubmitFoodResource;
