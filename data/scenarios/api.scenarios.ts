import { ApiTemplates } from '../templates/api.templates';

/** Declarative API scenarios for AutomationExercise. */
export const apiScenarios = {
  productsList: [
    {
      id: 'TC-API-001',
      title: 'GET productsList returns Polo brand products',
      ...ApiTemplates.poloBrand(),
    },
  ],
  searchProduct: [
    {
      id: 'TC-API-002',
      title: 'POST searchProduct finds Tshirts category',
      ...ApiTemplates.tshirtsCategory(),
    },
  ],
  negative: ApiTemplates.invalidSearchQueries().map((q, i) => ({
    id: `TC-API-NEG-00${i + 1}`,
    title: `Search handles ${q.label}`,
    query: q.query,
  })),
};
