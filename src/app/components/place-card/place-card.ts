
import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';

import { Place } from '../../models/place.model';

@Component({
  selector: 'app-place-card',
  standalone: true,
  templateUrl: './place-card.html',
  styleUrl: './place-card.css'
})
export class PlaceCardComponent {

  @Input() place!: Place;

  @Output() selected = new EventEmitter<Place>();

  select(): void {
    this.selected.emit(this.place);
  }
}
