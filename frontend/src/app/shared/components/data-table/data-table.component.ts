import { Component, Input } from '@angular/core';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { LoadingStateComponent } from '../loading-state/loading-state.component';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [EmptyStateComponent, LoadingStateComponent],
  template: `
    @if (error) {
      <div class="alert alert-error" role="alert">{{ error }}</div>
    }
    @if (loading) {
      <app-loading-state [message]="loadingMessage" />
    } @else if (empty) {
      <app-empty-state [title]="emptyTitle" [message]="emptyMessage" [icon]="emptyIcon" />
    } @else {
      <div class="table-wrap"><ng-content /></div>
    }
  `,
})
export class DataTableComponent {
  @Input() loading = false;
  @Input() loadingMessage = 'Loading records…';
  @Input() empty = false;
  @Input() emptyTitle = 'No records found';
  @Input() emptyMessage = 'Try adjusting your filters.';
  @Input() emptyIcon = 'info';
  @Input() error = '';
}
