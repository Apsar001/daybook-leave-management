import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  template: `
    @if (open) {
      <div class="modal-backdrop" (click)="onBackdrop($event)">
        <section class="modal" role="alertdialog" aria-modal="true" [attr.aria-label]="title">
          <header class="modal-header">
            <h2>{{ title }}</h2>
            <button type="button" class="icon-button" (click)="cancelled.emit()" aria-label="Close dialog">
              <app-icon name="x" [size]="16" />
            </button>
          </header>
          <div class="modal-body">
            <p>{{ message }}</p>
            @if (requireComment || allowComment) {
              <div class="form-field" style="margin-top: 16px;">
                <label class="form-label" for="confirm-comment">
                  {{ commentLabel }}<span class="required" [style.display]="requireComment ? 'inline' : 'none'">*</span>
                </label>
                <textarea
                  id="confirm-comment"
                  class="form-control"
                  [formControl]="commentControl"
                  placeholder="Add a short note…"
                  rows="3"
                ></textarea>
                @if (commentControl.invalid && commentControl.touched) {
                  <span class="form-error" role="alert">A comment is required.</span>
                }
              </div>
            }
          </div>
          <footer class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="cancelled.emit()">Cancel</button>
            <button type="button" class="btn" [class.btn-danger]="danger" [class.btn-primary]="!danger" (click)="confirm()">
              {{ confirmLabel }}
            </button>
          </footer>
        </section>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  private isOpen = false;

  @Input()
  set open(value: boolean) {
    this.isOpen = value;
    if (value) {
      this.commentControl.setValue('');
      this.commentControl.markAsUntouched();
    }
  }
  get open(): boolean {
    return this.isOpen;
  }

  @Input() title = 'Are you sure?';
  @Input() message = '';
  @Input() confirmLabel = 'Confirm';
  @Input() danger = false;
  @Input() requireComment = false;
  @Input() allowComment = false;
  @Input() commentLabel = 'Comment';
  @Output() readonly confirmed = new EventEmitter<string>();
  @Output() readonly cancelled = new EventEmitter<void>();

  readonly commentControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  confirm(): void {
    if (this.requireComment) {
      if (!this.commentControl.value.trim()) {
        this.commentControl.markAsTouched();
        return;
      }
      this.confirmed.emit(this.commentControl.value.trim());
      return;
    }
    this.confirmed.emit('');
  }

  onBackdrop(event: Event): void {
    if (event.target === event.currentTarget) {
      this.cancelled.emit();
    }
  }
}
