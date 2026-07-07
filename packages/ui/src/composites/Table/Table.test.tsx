import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './Table';

describe('Table Component', () => {
  it('renders standard table layout correctly', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Header Item</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Cell Item</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    expect(screen.getByText('Header Item')).toBeInTheDocument();
    expect(screen.getByText('Cell Item')).toBeInTheDocument();
  });
});
