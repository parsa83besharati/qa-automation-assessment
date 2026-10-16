import { BookingTemplates } from '../templates/booking.templates';

/** Declarative Booking scenarios — specs iterate these, no logic in specs. */
export const bookingScenarios = {
  smoke: [
    {
      id: 'TC-SMOKE-001',
      title: 'Homepage loads and search widget is visible',
      data: BookingTemplates.smoke(),
    },
    {
      id: 'TC-SMOKE-002',
      title: 'Task happy path opens 3rd hotel availability',
      data: BookingTemplates.taskHappyPath(),
    },
  ],
  negative: BookingTemplates.negative().map((data, i) => ({
    id: `TC-NEG-00${i + 1}`,
    title: `Invalid search input is handled gracefully (${i + 1})`,
    data,
  })),
  edge: BookingTemplates.edge().map((data, i) => ({
    id: `TC-EDGE-00${i + 1}`,
    title: `Boundary occupancy / hotel index (${i + 1})`,
    data,
  })),
};
