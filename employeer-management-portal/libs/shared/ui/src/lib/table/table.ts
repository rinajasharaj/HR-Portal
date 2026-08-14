import {Component, computed, input, signal} from '@angular/core';
import { TuiTable } from '@taiga-ui/addon-table';
import { TuiPagination } from '@taiga-ui/kit';

@Component({
  selector: 'lib-table',
  imports: [TuiTable, TuiPagination],
  templateUrl: './table.html',
  styleUrl: './table.css',
})
export class Table {
  columns = input<string[]>([]);
  totalItems = input<number>(0);
  pageSize = input<number>(10);

  currentPage = signal(0);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));
}
