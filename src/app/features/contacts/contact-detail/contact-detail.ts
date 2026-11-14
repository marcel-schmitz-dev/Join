import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ContactInterface } from '../../../interface/contact-interface';
import { getInitials } from '../../../shared/contact-utils';

@Component({
  selector: 'app-contact-detail',
  standalone: true,
  templateUrl: './contact-detail.html',
  styleUrls: ['./contact-detail.scss'],
})
export class ContactDetailComponent {
  @Input() contact: ContactInterface | null = null;
  /** Zeigt Edit und Delete nur, wenn der User den Kontakt verwalten darf. */
  @Input() canManage = false;
  @Output() editClicked = new EventEmitter<void>();
  @Output() deleteClicked = new EventEmitter<void>();
  readonly initialsOf = getInitials;


  /** Meldet der Kontaktliste, dass der Kontakt bearbeitet werden soll. */
  onEdit(): void {
    this.editClicked.emit();
  }


  /** Meldet der Kontaktliste, dass der Kontakt gelöscht werden soll. */
  onDelete(): void {
    this.deleteClicked.emit();
  }
}
