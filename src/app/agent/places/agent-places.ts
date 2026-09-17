import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  Router
} from '@angular/router';

import {
  LucideAngularModule,
  Search,
  MapPin,
  Eye,
  X,
  Building2,
  BookOpen
} from 'lucide-angular';

import {
  AgentWorkspaceService
} from '../services/agent-workspace.service';


@Component({
  selector: 'app-agent-places',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule
  ],

  templateUrl: './agent-places.html',

  styleUrl: './agent-places.css'
})
export class AgentPlacesComponent
implements OnInit {

  places: any[] = [];

  loading = true;

  errorMessage = '';

  searchTerm = '';

  selectedArea = 'all';


  readonly Search = Search;

  readonly MapPin = MapPin;

  readonly Eye = Eye;

  readonly X = X;

  readonly Building2 = Building2;

  readonly BookOpen = BookOpen;


  constructor(
    private workspaceService:
      AgentWorkspaceService,

    private router:
      Router
  ) {}


  async ngOnInit():
    Promise<void> {

    await this.loadPlaces();

  }


  // =========================================================
  // LOAD PLACES
  // =========================================================

  async loadPlaces():
    Promise<void> {

    this.loading = true;

    this.errorMessage = '';


    try {

      const result =
        await this.workspaceService
          .getPlaces();


      this.places =
        Array.isArray(result)
          ? result
          : [];


    } catch (error) {

      console.error(
        'Agent places loading error:',
        error
      );


      this.errorMessage =
        'تعذر تحميل الأماكن. حاولي مرة أخرى.';


    } finally {

      this.loading = false;

    }

  }


  // =========================================================
  // AREAS
  // =========================================================

  get areas():
    string[] {

    return [
      ...new Set(
        this.places
          .map(
            place =>
              String(
                place?.area || ''
              ).trim()
          )
          .filter(Boolean)
      )
    ].sort();

  }


  // =========================================================
  // FILTERED PLACES
  // =========================================================

  get filteredPlaces():
    any[] {

    const search =
      this.searchTerm
        .trim()
        .toLowerCase();


    return this.places.filter(
      place => {

        // AREA FILTER

        if (
          this.selectedArea !== 'all'
          &&
          String(
            place?.area || ''
          ) !== this.selectedArea
        ) {

          return false;

        }


        // NO SEARCH

        if (!search) {

          return true;

        }


        // SEARCH

        const tags =
          Array.isArray(
            place?.tags
          )
            ? place.tags
            : [];


        const searchable =
          [
            place?.name,
            place?.area,
            place?.description,
            ...tags
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();


        return searchable.includes(
          search
        );

      }
    );

  }


  // =========================================================
  // OPEN PLACE
  // =========================================================

  async openPlace(
    place: any
  ):
    Promise<void> {

    if (!place?.id) {

      return;

    }


    await this.router.navigate([
      '/agent/places',
      place.id
    ]);

  }


  // =========================================================
  // FILTERS
  // =========================================================

  clearFilters():
    void {

    this.searchTerm = '';

    this.selectedArea =
      'all';

  }


  get hasFilters():
    boolean {

    return (
      !!this.searchTerm.trim()
      ||
      this.selectedArea !== 'all'
    );

  }


  // =========================================================
  // TAGS
  // =========================================================

  getTags(
    place: any
  ):
    string[] {

    if (
      !Array.isArray(
        place?.tags
      )
    ) {

      return [];

    }


    return place.tags
      .filter(Boolean)
      .map(
        (tag: any) =>
          String(tag)
      )
      .slice(
        0,
        4
      );

  }


  // =========================================================
  // PRICE
  // =========================================================

  getPrice(
    place: any
  ):
    number | null {

    const value =
      Number(
        place?.price
      );


    if (
      !Number.isFinite(value)
      ||
      value <= 0
    ) {

      return null;

    }


    return value;

  }


  // =========================================================
  // COLLECTION COUNTS
  // =========================================================

  getCollectionCount(
    value: any
  ):
    number {

    if (!value) {

      return 0;

    }


    if (
      Array.isArray(value)
    ) {

      return value.length;

    }


    if (
      typeof value === 'object'
    ) {

      return Object.keys(
        value
      ).length;

    }


    return 0;

  }


  getPackageCount(
    place: any
  ):
    number {

    return this.getCollectionCount(
      place?.packages
    );

  }


  getServiceCount(
    place: any
  ):
    number {

    return this.getCollectionCount(
      place?.services
    );

  }


  getExtraCount(
    place: any
  ):
    number {

    return this.getCollectionCount(
      place?.extras
    );

  }


  // =========================================================
  // TRACK BY
  // =========================================================

  trackByPlaceId(
    index: number,
    place: any
  ):
    string | number {

    return (
      place?.id
      ||
      index
    );

  }

}