import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectorRef,
  OnInit,
  ViewChild
} from '@angular/core';

import { HeaderComponent } from '../components/header/header';
import { ChatComponent } from '../components/chat/chat';
import { DayUseComponent } from '../components/day-use/day-use';

import { DayUseService } from '../services/day-use.service';
import { Place } from '../models/place.model';

@Component({
  selector: 'app-day-use-page',
  standalone: true,

  imports: [
    CommonModule,
    HeaderComponent,
    ChatComponent,
    DayUseComponent
  ],

  templateUrl: './day-use-page.html',
  styleUrl: './day-use-page.css'
})
export class DayUsePageComponent implements OnInit {

  @ViewChild('chat')
  chatComponent?: ChatComponent;

  places: Place[] = [];

  loadingPlaces = false;

  placesError = '';

  constructor(
    private dayUseService: DayUseService,
    private cdr: ChangeDetectorRef
  ) {}


  ngOnInit(): void {
    void this.loadPlaces();
  }


  async loadPlaces(): Promise<void> {

    this.loadingPlaces = true;

    this.placesError = '';

    this.cdr.markForCheck();

    try {

      const result =
        await this.dayUseService.loadPlaces();

      this.places =
        Array.isArray(result)
          ? [...result]
          : [];

      console.log(
        'Places rendered:',
        this.places.length
      );

    } catch (error) {

      console.error(
        'Failed to load places:',
        error
      );

      this.places = [];

      this.placesError =
        'حصل خطأ أثناء تحميل الأماكن.';

    } finally {

      this.loadingPlaces = false;

      this.cdr.markForCheck();

    }

  }


  async onPlaceSelected(
    place: Place
  ): Promise<void> {

    if (!this.chatComponent) {
      return;
    }

    await this.chatComponent
      .openPlaceFromDayUse(
        place,
        false
      );

    this.scrollToChat();

  }


  private scrollToChat(): void {

    setTimeout(() => {

      document
        .querySelector('.chat-panel')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

    }, 80);

  }

}