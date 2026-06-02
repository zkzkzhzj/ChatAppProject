import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AudioControls from './AudioControls';

vi.mock('@/three/audio/master-volume-store', () => ({
  loadMasterVolume: () => 0.5,
  saveMasterVolume: vi.fn(),
}));

describe('AudioControls', () => {
  it('sits above chat and mail in the lower-right control stack', () => {
    render(<AudioControls sceneManager={null} />);

    const button = screen.getByRole('button');

    expect(button.parentElement).toHaveStyle({
      bottom: 'calc(144px + env(safe-area-inset-bottom))',
    });
  });
});
