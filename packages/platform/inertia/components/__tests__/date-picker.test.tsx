import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { DatePicker } from '~/components/date-picker';

describe('DatePicker', () => {
  it('renders with placeholder when no value', async () => {
    render(<DatePicker value={undefined} onChange={() => {}} />);

    await expect.element(page.getByRole('button', { name: /pick a date/i })).toBeInTheDocument();
  });

  it('renders with custom placeholder', async () => {
    render(<DatePicker value={undefined} onChange={() => {}} placeholder="Select start date" />);

    await expect
      .element(page.getByRole('button', { name: /select start date/i }))
      .toBeInTheDocument();
  });

  it('displays formatted date when value provided', async () => {
    render(<DatePicker value={new Date(2026, 2, 15)} onChange={() => {}} />);

    await expect.element(page.getByRole('button')).toHaveTextContent('March 15th, 2026');
  });

  it('opens calendar popover on click', async () => {
    render(<DatePicker value={undefined} onChange={() => {}} />);

    await page.getByRole('button', { name: /pick a date/i }).click();

    await expect.element(page.getByRole('grid')).toBeInTheDocument();
  });

  it('calls onChange when a date is selected', async () => {
    const onChange = vi.fn();

    render(<DatePicker value={new Date(2026, 2, 1)} onChange={onChange} />);

    await page.getByRole('button').click();

    await page.getByRole('gridcell', { name: '15' }).getByRole('button').click();

    expect(onChange).toHaveBeenCalledWith(expect.any(Date));
  });

  it('renders with the provided id', async () => {
    render(<DatePicker value={undefined} onChange={() => {}} id="start-date" />);

    await expect
      .element(page.getByRole('button', { name: /pick a date/i }))
      .toHaveAttribute('id', 'start-date');
  });
});
