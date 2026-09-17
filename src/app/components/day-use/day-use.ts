import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Place } from '../../models/place.model';
import { PlaceCardComponent } from '../place-card/place-card';

@Component({
  selector: 'app-day-use',
  standalone: true,
  imports: [
    CommonModule,
    PlaceCardComponent
  ],
  templateUrl: './day-use.html',
  styleUrl: './day-use.css'
})
export class DayUseComponent {

  @Input() places: Place[] = [];

  // أي زر اختيار/حجز داخل PlaceCard لازم في النهاية يعمل emit للـselected.
  @Output() placeSelected = new EventEmitter<Place>();

  activeFilter = 'all';

  filters = [
    { key: 'all', label: 'الكل' },
    { key: 'family', label: 'عائلي' },
    { key: 'couple', label: 'Couples' },
    { key: 'waterPark', label: 'Aqua Park' },
    { key: 'spa', label: 'Spa' },
    { key: 'luxury', label: 'Luxury' }
  ];

  get filteredPlaces(): Place[] {
    if (this.activeFilter === 'all') {
      return this.places;
    }

    return this.places.filter(place =>
      Boolean(place[this.activeFilter as keyof Place])
    );
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
  }

  selectPlace(place: Place): void {
    this.placeSelected.emit(place);
  }
}
