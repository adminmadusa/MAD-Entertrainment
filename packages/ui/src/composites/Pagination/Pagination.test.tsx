import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Pagination, TablePagination } from './Pagination';

describe('Pagination Component', () => {
  it('renders correctly with page information', () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={10}
        totalRecords={100}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByText(/100 records/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Page 2/i })).toHaveAttribute('aria-current', 'page');
  });

  it('triggers onPageChange when clicking next and prev buttons', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        currentPage={3}
        totalPages={5}
        onPageChange={onPageChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Go to previous page/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByRole('button', { name: /Go to next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('disables prev/first button on first page', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Go to previous page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Go to first page/i })).toBeDisabled();
  });

  it('disables next/last button on last page', () => {
    render(
      <Pagination
        currentPage={5}
        totalPages={5}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Go to next page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Go to last page/i })).toBeDisabled();
  });

  it('handles page size selection', () => {
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        onPageSizeChange={onPageSizeChange}
        onPageChange={vi.fn()}
      />
    );

    const select = screen.getByRole('combobox', { name: /Rows per page/i });
    fireEvent.change(select, { target: { value: '25' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it('renders TablePagination backward compatibility component', () => {
    const onPageChange = vi.fn();
    render(
      <TablePagination
        currentPage={1}
        totalPages={3}
        onPageChange={onPageChange}
        totalRecords={30}
      />
    );

    expect(screen.getByText(/Total 30 records/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
