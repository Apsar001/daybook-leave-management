import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (open) {
      <div class="modal-backdrop" (click)="onBackdrop($event)">
        <section class="modal" [class.wide]="wide" role="dialog" aria-modal="true" [attr.aria-label]="title">
          <header class="modal-header">
            <h2>{{ title }}</h2>
            <button type="button" class="icon-button" (click)="closed.emit()" aria-label="Close dialog">
              <app-icon name="x" [size]="16" />
            </button>
          </header>
          <div class="modal-body"><ng-content select="[modal-body]" /></div>
          @if (footer) {
            <footer class="modal-footer"><ng-content select="[modal-footer]" /></footer>
          }
          <ng-content />
        </section>
      </div>
    }
  `,
})
export class ModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() wide = false;
  @Input() footer = true;
  @Output() readonly closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.closed.emit();
    }
  }

  onBackdrop(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
