export type ViewportPreset = 'desktop' | 'tablet' | 'mobile';

export const viewports: Record<ViewportPreset, { width: number; height: number }> = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 1024, height: 768 },
  mobile: { width: 390, height: 844 },
};
